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
    Object.values(radiusItems).forEach(item => {
        const lat = item.center.lat.toFixed(5);
        const lng = item.center.lng.toFixed(5);
        if (item.type === 'single') {
            p.append('r', `${lat},${lng},${item.km}`);
        } else {
            p.append('r', `${lat},${lng},${item.step},${item.count},i`);
        }
    });

    // Bus routes — one `route` param per drawn line
    Object.values(busRouteItems).forEach(item => p.append('route', item.ref));

    // Tentacle questions — one `tent` param per question that has a center set
    // Format: poiType,radius,unit,lat,lng,selectedPoiId (0 = none)
    tentSerialise().forEach(s => p.append('tent', s));

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
    navigator.clipboard?.writeText(location.href).then(() => {
        btn.textContent = '✅';
        setTimeout(() => { btn.textContent = '🔗'; }, 1500);
    }).catch(() => {
        btn.textContent = '✗';
        setTimeout(() => { btn.textContent = '🔗'; }, 1500);
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
        document.querySelectorAll('.style-opt').forEach(b => {
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
        const cb     = document.getElementById('lyr-' + id);
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
            const step  = parseFloat(parts[2]);
            const count = parseInt(parts[3]);
            if (isNaN(step) || isNaN(count)) continue;
            document.getElementById('intervalStep').value  = fromKm(step);
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

    // Unlock auto-updates and write the canonical URL once
    permalinkReady = true;
    updatePermalink();

    // Keep the address bar in sync whenever the user pans or zooms
    map.on('moveend', updatePermalink);
}
