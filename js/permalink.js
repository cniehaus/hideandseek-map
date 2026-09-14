'use strict';

// Prevents premature URL writes while the initial state is still being restored
let permalinkReady = false;

// ── Serialise the full app state into a URL ───────────────────────────────────
function buildPermalink() {
    const p = new URLSearchParams();

    // Language (only if not the default German)
    if (_activeLang !== 'de') p.set('lang', _activeLang);

    // City search term
    const cityVal = document.getElementById('cityInput').value.trim();
    if (cityVal) p.set('city', cityVal);

    // Exact map position so the recipient sees the same view
    const c = map.getCenter();
    p.set('view', `${c.lat.toFixed(5)},${c.lng.toFixed(5)},${map.getZoom()}`);

    // Active layer IDs (comma-separated)
    const activeIds = Object.keys(activeLayers);
    if (activeIds.length) p.set('layers', activeIds.join(','));

    // Units (only if non-default)
    if (units !== 'metric') p.set('units', units);

    // Map style (only if non-default)
    const styleKey = document.querySelector('.style-opt.active')?.dataset.tile;
    if (styleKey && styleKey !== 'osm') p.set('style', styleKey);

    // Radii — one `r` param per drawn circle/set
    // Single:   lat,lng,km
    // Interval: lat,lng,step,count,i
    Object.values(radiusItems).forEach((item) => {
        const lat = item.center.lat.toFixed(5);
        const lng = item.center.lng.toFixed(5);
        if (item.type === 'single') {
            p.append('r', `${lat},${lng},${item.km}`);
        } else {
            p.append('r', `${lat},${lng},${item.step},${item.count},i`);
        }
    });

    // Bus routes — one `route` param per drawn line
    Object.values(busRouteItems).forEach((item) => p.append('route', item.ref));

    // Tentacle questions — one `tent` param per question that has a center set
    // Format: poiType,radius,unit,lat,lng,selectedPoiId (0 = none)
    tentSerialise().forEach((s) => p.append('tent', s));

    // Radius questions — one `rq` param per question with a spot set
    // Format: lat,lng,km,y|n
    rqSerialise().forEach((s) => p.append('rq', s));

    return `${location.pathname}?${p.toString()}`;
}

// ── Silently update the address bar (no history entry added) ──────────────────
function updatePermalink() {
    if (!permalinkReady) return;
    history.replaceState(null, '', buildPermalink());
}

// ── Copy the current permalink to the clipboard ───────────────────────────────
function copyPermalink() {
    const btn = document.getElementById('permalinkFab');
    navigator.clipboard
        ?.writeText(location.href)
        .then(() => {
            btn.textContent = '✅';
            setTimeout(() => {
                btn.textContent = '🔗';
            }, 1500);
        })
        .catch(() => {
            btn.textContent = '✗';
            setTimeout(() => {
                btn.textContent = '🔗';
            }, 1500);
        });
}

// ── Restore the full app state from URL params on page load ───────────────────
async function loadFromPermalink() {
    const p = new URLSearchParams(location.search);

    // Units (fast, synchronous — must come before radii so fromKm() is correct)
    if (p.get('units') === 'imperial') setUnits('imperial');

    // Map style
    const styleKey = p.get('style');
    if (styleKey && TILE_LAYERS[styleKey]) {
        setTileLayer(styleKey);
        document.querySelectorAll('.style-opt').forEach((b) => {
            b.classList.toggle('active', b.dataset.tile === styleKey);
        });
    }

    // Override city input if the URL specifies one
    if (p.get('city')) {
        document.getElementById('cityInput').value = p.get('city');
    }

    // Search the city (uses the current input value, default or overridden)
    await searchCity();

    // Load layers specified in the URL.
    // A layer is only restored if it has a visible UI control (layer checkbox or
    // boundary-panel button). This prevents orphaned layers that can't be turned off.
    const layerIds = (p.get('layers') ?? '').split(',').filter(Boolean);
    for (const id of layerIds) {
        const cb = document.getElementById('lyr-' + id);
        const bndBtn = document.getElementById('bnd-' + id);
        if (cb) {
            cb.checked = true;
            await loadLayer(id);
        } else if (bndBtn && LAYER_DEFS[id]) {
            // Layer migrated to boundary panel (e.g. PLZ)
            await loadLayer(id);
            bndBtn.classList.add('active');
        }
    }

    // Restore exact map view (overrides the city-fit done by searchCity)
    const viewStr = p.get('view');
    if (viewStr) {
        const [lat, lng, zoom] = viewStr.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
            map.setView([lat, lng], zoom);
        }
    }

    // Restore radii
    // Values are always stored in km internally; fromKm() converts to the
    // current display unit so the input field and drawRadius() agree.
    for (const rStr of p.getAll('r')) {
        const parts = rStr.split(',');
        if (parts.length < 3) continue;
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (isNaN(lat) || isNaN(lng)) continue;

        setClickedPoint(L.latLng(lat, lng));

        if (parts[4] === 'i') {
            const step = parseFloat(parts[2]);
            const count = parseInt(parts[3]);
            if (isNaN(step) || isNaN(count)) continue;
            document.getElementById('intervalStep').value = fromKm(step);
            document.getElementById('intervalCount').value = count;
            setRadiusMode('interval');
        } else {
            const km = parseFloat(parts[2]);
            if (isNaN(km)) continue;
            document.getElementById('radiusKm').value = fromKm(km);
            setRadiusMode('single');
        }
        drawRadius();
    }
    // Leave the UI in single mode regardless of what was last restored
    setRadiusMode('single');

    // Restore bus routes
    const routeInput = document.getElementById('busRouteInput');
    for (const ref of p.getAll('route')) {
        routeInput.value = ref;
        await addBusRoute();
    }
    routeInput.value = '';

    // Restore tentacle questions
    await tentRestoreFromPermalink(p.getAll('tent'));

    // Restore radius questions
    rqRestoreFromPermalink(p.getAll('rq'));

    // Unlock auto-updates and write the canonical URL once
    permalinkReady = true;
    updatePermalink();

    // Keep the address bar in sync whenever the user pans or zooms
    map.on('moveend', updatePermalink);
}

    // ── Export / Import map state (JSON) ────────────────────────────────────────
    function exportMapState() {
        const state = {
            version: 1,
            view: (() => {
                const c = map.getCenter();
                return { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
            })(),
            layerDataCache: {},
            busRoutes: [],
            // Persist the city the player typed plus the resolved city object
            city: {},
            // Persist game zone areas (allowed/drawn areas)
            gameZone: [],
        };

        // Only export cached layer data (if present)
        Object.keys(layerDataCache).forEach((id) => {
            state.layerDataCache[id] = layerDataCache[id];
        });

        // Export bus routes including their Overpass responses (if available)
        Object.values(busRouteItems).forEach((item) => {
            state.busRoutes.push({ ref: item.ref, name: item.name, color: item.color, data: item.data });
        });

        // Export current city input and resolved city object (if any)
        try {
            state.city.input = document.getElementById('cityInput').value.trim();
        } catch (_) {}
        if (typeof currentCity !== 'undefined' && currentCity) state.city.currentCity = currentCity;

        // Export game zone items (serialize geojson feature + metadata)
        try {
            Object.values(gzItems || {}).forEach((it) => {
                state.gameZone.push({ feature: it.feature, name: it.name, kind: it.kind, osmKey: it.osmKey });
            });
        } catch (_) {}

        const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hideandseek-map-state-${new Date().toISOString().slice(0, 19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleImportStateFile(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const obj = JSON.parse(reader.result);
                importMapState(obj);
            } catch (err) {
                showErrorPopup('Invalid state file');
            }
        };
        reader.readAsText(f);
        // reset input so selecting same file again triggers change
        e.target.value = '';
    }

    async function importMapState(state) {
        if (!state || state.version !== 1) {
            showErrorPopup('Unsupported state file');
            return;
        }

        // Clear current visible state (including any existing game zone)
        // Do this before restoring the city so `searchCity()` loads fresh
        // boundary layers for the imported city rather than merging with
        // whatever was previously displayed.
        clearAllBusRoutes();
        clearAllLayers();
        clearAllBoundaryLayers();
        try { clearGameZone(); } catch (_) {}

        // Restore city input and immediately search it when possible so the
        // canonical `currentCity` is populated via `searchCity()` (Nominatim).
        try {
            if (state.city?.input) {
                document.getElementById('cityInput').value = state.city.input;
                await searchCity();
            } else if (state.city?.currentCity) {
                // Fallback: if no input string was exported, restore the
                // resolved object directly so boundary loaders can use it.
                currentCity = state.city.currentCity;
                document.getElementById('cityHint').textContent = currentCity.name ?? '';
                try {
                    if (currentCity.bbox && currentCity.bbox.length === 4) {
                        map.fitBounds([
                            [currentCity.bbox[0], currentCity.bbox[2]],
                            [currentCity.bbox[1], currentCity.bbox[3]],
                        ]);
                    }
                } catch (_) {}
                try {
                    reloadActiveBoundaryLayers();
                } catch (_) {}
            }
        } catch (_) {}

        // Restore map view
        if (state.view) map.setView([state.view.lat, state.view.lng], state.view.zoom);

        // Restore layers from cached Overpass results (no network requests)
        Object.entries(state.layerDataCache ?? {}).forEach(([id, data]) => {
            if (!LAYER_DEFS[id]) return;
            layerDataCache[id] = data;
            const leafletLayers = LAYER_DEFS[id].render(id, data, LAYER_DEFS[id]);
            activeLayers[id] = leafletLayers;
            leafletLayers.forEach((l) => l.addTo(map));
            const cb = document.getElementById('lyr-' + id);
            if (cb) cb.checked = true;
            const cntEl = document.getElementById('cnt-' + id);
            if (cntEl) cntEl.textContent = (data.elements?.length ?? 0) > 0 ? `(${data.elements.length})` : '';
        });
        updateLayerDots();
        updateLayerFabBadge();

        // Restore bus routes from included Overpass responses
        if (Array.isArray(state.busRoutes)) {
            for (const br of state.busRoutes) {
                try {
                    const id = ++busRouteCounter;
                    const color = br.color ?? BUS_ROUTE_COLORS[(id - 1) % BUS_ROUTE_COLORS.length];
                    const layers = renderBusRoute(br.data, color);
                    layers.forEach((l) => l.addTo(map));
                    const routeName = br.name ?? br.ref;
                    busRouteItems[id] = { layers, color, name: routeName, ref: br.ref, custom: false, data: br.data };
                    busRouteRefs.add(br.ref);
                    addBusRouteListEntry(id, br.ref, routeName, color);
                } catch (_) {
                    /* skip problematic entries */
                }
            }
        }

        // (city has already been restored above via searchCity() or currentCity)

        // Restore game zone areas (allowed/drawn areas)
        try {
            if (Array.isArray(state.gameZone)) {
                for (const gz of state.gameZone) {
                    try {
                        const rawFeat = gz.feature;
                        const feature = rawFeat?.type === 'Feature' ? rawFeat : turf.feature(rawFeat);
                        const kind = gz.kind ?? 'boundary';
                        const outline = L.geoJSON(feature, {
                            style: {
                                color: '#3fb950',
                                weight: 3,
                                opacity: 0.9,
                                fillOpacity: 0,
                                dashArray: kind === 'circle' ? '6 5' : null,
                            },
                            interactive: false,
                        }).addTo(map);

                        const id = ++gzCounter;
                        const name = gz.name ?? (`Imported area ${id}`);
                        const osmKey = gz.osmKey ?? ('import/' + id);
                        gzItems[id] = { feature, layers: [outline], name, kind, osmKey };
                        gzOsmKeys.add(osmKey);
                        gzAddListEntry(id, name, gz.name ?? name, kind, gz.radiusKm);

                        // Preserve drawn counter when importing drawn areas
                        if (kind === 'drawn' && typeof osmKey === 'string') {
                            const m = osmKey.match(/^drawn\/(\d+)$/);
                            if (m) gzDrawCounter = Math.max(gzDrawCounter, parseInt(m[1], 10));
                        }
                    } catch (_) {
                        /* skip problematic entries */
                    }
                }
                gzRedrawMask();
            }
        } catch (_) {}

        updatePermalink();
        setStatus('State imported', 'ok');
    }
