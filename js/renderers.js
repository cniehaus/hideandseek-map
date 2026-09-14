'use strict';

// ── City boundary ─────────────────────────────────────────────────────────────
// Renders the administrative boundary of the searched city as a thick dashed
// outline with no fill, so the player can see where the city ends.
function renderCityBoundary(id, data, def) {
    const result = [];
    let geojson;
    try {
        geojson = osmtogeojson(data);
    } catch (e) {
        console.error('osmtogeojson failed for city boundary', e);
        return result;
    }

    geojson.features.forEach((feat) => {
        const gtype = feat.geometry?.type;
        if (!gtype || !gtype.includes('Polygon')) return;

        const name = feat.properties?.name ?? currentCity?.name?.split(',')[0] ?? '';
        const poly = L.geoJSON(feat, {
            style: {
                color: def.color,
                weight: 4,
                opacity: 0.9,
                fillOpacity: 0,
                dashArray: '12 7',
            },
        });
        if (name) poly.bindPopup(`<div class="popup-name">🏙️ ${esc(name)}</div>`);
        result.push(poly);
    });

    return result;
}

// ── Postal-code polygons ──────────────────────────────────────────────────────
// Converts OSM relations to coloured GeoJSON areas with postal-code labels.
// Also accepts ready-made GeoJSON features ({ source: 'geojson', elements })
// from a fetchFallback such as the swisstopo postal-code service.
function renderPLZ(id, data, def) {
    const result = [];
    let features;
    if (data.source === 'geojson') {
        features = data.elements;
    } else {
        try {
            features = osmtogeojson(data).features;
        } catch (e) {
            console.error('osmtogeojson failed', e);
            return result;
        }
    }

    let ci = 0;
    features.forEach((feat) => {
        const gtype = feat.geometry?.type;
        if (!gtype || !gtype.includes('Polygon')) return;

        const plz =
            feat.properties?.postal_code ??
            feat.properties?.['addr:postcode'] ??
            feat.properties?.name ??
            '?';
        const color = PLZ_COLORS[ci++ % PLZ_COLORS.length];

        const poly = L.geoJSON(feat, {
            style: { color, fillColor: color, fillOpacity: 0.18, weight: 2, opacity: 0.85 },
        });
        poly.on('mouseover', function () {
            this.setStyle({ fillOpacity: 0.45 });
        });
        poly.on('mouseout', function () {
            this.setStyle({ fillOpacity: 0.18 });
        });
        const plzName = feat.properties?.name;
        const plzAttr = feat.properties?.attribution;
        poly.bindPopup(
            `<div class="popup-name">${tf('plz_label', plz)}</div>` +
                (plzName && String(plzName) !== String(plz)
                    ? `<div class="popup-type">${esc(plzName)}</div>`
                    : '') +
                (plzAttr ? `<div class="popup-coords">${esc(plzAttr)}</div>` : ''),
        );
        result.push(poly);

        try {
            const bounds = poly.getBounds();
            if (bounds.isValid()) {
                result.push(
                    L.marker(bounds.getCenter(), {
                        icon: L.divIcon({
                            className: 'plz-label',
                            html: plz,
                            iconSize: [60, 20],
                            iconAnchor: [30, 10],
                        }),
                        interactive: false,
                        zIndexOffset: 100,
                    }),
                );
            }
        } catch (_) {}
    });

    return result;
}

// ── Spatial deduplication ─────────────────────────────────────────────────────
// Drops elements whose centre falls within `maxMeters` of an already-kept one.
function deduplicateNearby(elements, maxMeters) {
    const threshold = maxMeters * maxMeters;
    const placed = [];
    return elements.filter((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (lat == null) return true;
        const close = placed.some(([plat, plng]) => {
            const dlat = (lat - plat) * 111320;
            const dlng = (lng - plng) * 111320 * Math.cos((plat * Math.PI) / 180);
            return dlat * dlat + dlng * dlng < threshold;
        });
        if (!close) placed.push([lat, lng]);
        return !close;
    });
}

// ── POI points (hospitals, train stations, …) ────────────────────────────────
// Draws each OSM node/way/relation as a coloured CircleMarker.
function getElementCenter(el) {
    if (el.type === 'node') return { lat: el.lat, lng: el.lon };
    if (el.center) return { lat: el.center.lat, lng: el.center.lon };
    if (el.bounds)
        return {
            lat: (el.bounds.minlat + el.bounds.maxlat) / 2,
            lng: (el.bounds.minlon + el.bounds.maxlon) / 2,
        };
    return null;
}

function renderPOIs(id, data, def) {
    const result = [];

    let elements = data.elements ?? [];

    if (id === 'busstops') elements = deduplicateNearby(elements, 50);
    if (id === 'swimmingpool') elements = deduplicateNearby(elements, 80);

    elements.forEach((el) => {
        const center = getElementCenter(el);
        if (!center) return;
        const { lat, lng } = center;

        const name = el.tags?.name ?? el.tags?.['name:de'] ?? t(def.label);
        const type =
            el.tags?.amenity ??
            el.tags?.railway ??
            el.tags?.tourism ??
            el.tags?.leisure ??
            el.tags?.historic ??
            el.tags?.shop ??
            '';

        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: def.color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
            ...(def.markerOpts ?? {}),
        });

        const baseHtml = () => `
            <div class="popup-name">${def.icon ?? '📌'} ${esc(name)}</div>
            <div class="popup-type">${esc(type)}</div>
            <div class="popup-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`;

        // Ensure a stable id for the remove button in the popup
        const elemId = el.id ?? `${lat.toFixed(5)}_${lng.toFixed(5)}`;
        const removeBtnId = `remove-poi-${id}-${elemId}`;
        const removeBtnHtml = `\n<div style="margin-top:6px"><button id="${removeBtnId}" class="danger">✕ ${t('remove') || 'Remove'}</button></div>`;

        if (id === 'busstops' && el.id) {
            let fetched = false;
            let fetching = false;
            marker.bindPopup(baseHtml() + `<div class="popup-routes"><div class="popup-routes-loading"><div class="popup-spinner"></div>${t('stop_lines_loading')}</div></div>` + removeBtnHtml);

            marker.on('popupopen', async () => {
                // attach remove handler (popup DOM exists now)
                const btn = document.getElementById(removeBtnId);
                if (btn) {
                    btn.onclick = () => {
                        map.removeLayer(marker);
                        if (activeLayers[id]) {
                            activeLayers[id] = activeLayers[id].filter((l) => l !== marker);
                            if (!activeLayers[id].length) delete activeLayers[id];
                        }
                        if (layerDataCache[id]?.elements) {
                            layerDataCache[id].elements = layerDataCache[id].elements.filter((e) => e.id !== el.id);
                        }
                        const cntEl = document.getElementById('cnt-' + id);
                        if (cntEl) {
                            const n = layerDataCache[id]?.elements?.length ?? (activeLayers[id]?.length ?? 0);
                            cntEl.textContent = n > 0 ? `(${n})` : '';
                        }
                        updatePermalink();
                    };
                }

                if (fetched || fetching) return;
                fetching = true;
                try {
                    const d = await overpassFetch(
                        `[out:json][timeout:30];\n(\n  node(${el.id});\n  node(around:80,${lat},${lng})["public_transport"~"^(stop_position|platform)$"];\n);\nrelation(bn)["route"~"^(bus|tram|trolleybus|subway|light_rail)$"];\nout tags;`,
                    );
                    const refs = [...new Set((d.elements ?? []).filter((r) => r.tags?.ref).map((r) => r.tags.ref))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

                    const inner = refs.length ? refs.map((r) => `<span class="route-chip">${esc(r)}</span>`).join('') : `<span style="color:#484f58;font-size:11px">${t('stop_lines_none')}</span>`;

                    marker.setPopupContent(baseHtml() + `<div class="popup-routes">${inner}</div>` + removeBtnHtml);
                    // reattach remove handler after content replacement
                    const btn2 = document.getElementById(removeBtnId);
                    if (btn2) {
                        btn2.onclick = () => {
                            map.removeLayer(marker);
                            if (activeLayers[id]) {
                                activeLayers[id] = activeLayers[id].filter((l) => l !== marker);
                                if (!activeLayers[id].length) delete activeLayers[id];
                            }
                            if (layerDataCache[id]?.elements) {
                                layerDataCache[id].elements = layerDataCache[id].elements.filter((e) => e.id !== el.id);
                            }
                            const cntEl = document.getElementById('cnt-' + id);
                            if (cntEl) {
                                const n = layerDataCache[id]?.elements?.length ?? (activeLayers[id]?.length ?? 0);
                                cntEl.textContent = n > 0 ? `(${n})` : '';
                            }
                            updatePermalink();
                        };
                    }
                    fetched = true;
                } catch (_) {
                    marker.setPopupContent(baseHtml() + `<div class="popup-routes"><span style="color:#f85149;font-size:11px">${t('stop_lines_error')}</span></div>` + removeBtnHtml);
                    const btn3 = document.getElementById(removeBtnId);
                    if (btn3) {
                        btn3.onclick = () => {
                            map.removeLayer(marker);
                            if (activeLayers[id]) {
                                activeLayers[id] = activeLayers[id].filter((l) => l !== marker);
                                if (!activeLayers[id].length) delete activeLayers[id];
                            }
                            if (layerDataCache[id]?.elements) {
                                layerDataCache[id].elements = layerDataCache[id].elements.filter((e) => e.id !== el.id);
                            }
                            const cntEl = document.getElementById('cnt-' + id);
                            if (cntEl) {
                                const n = layerDataCache[id]?.elements?.length ?? (activeLayers[id]?.length ?? 0);
                                cntEl.textContent = n > 0 ? `(${n})` : '';
                            }
                            updatePermalink();
                        };
                    }
                    fetched = true;
                } finally {
                    fetching = false;
                }
            });
        } else {
            marker.bindPopup(baseHtml() + removeBtnHtml);
            marker.on('popupopen', () => {
                const btn = document.getElementById(removeBtnId);
                if (!btn) return;
                btn.onclick = () => {
                    map.removeLayer(marker);
                    if (activeLayers[id]) {
                        activeLayers[id] = activeLayers[id].filter((l) => l !== marker);
                        if (!activeLayers[id].length) delete activeLayers[id];
                    }
                    if (layerDataCache[id]?.elements) {
                        layerDataCache[id].elements = layerDataCache[id].elements.filter((e) => e.id !== el.id);
                    }
                    const cntEl = document.getElementById('cnt-' + id);
                    if (cntEl) {
                        const n = layerDataCache[id]?.elements?.length ?? (activeLayers[id]?.length ?? 0);
                        cntEl.textContent = n > 0 ? `(${n})` : '';
                    }
                    updatePermalink();
                };
            });
        }

        // Clicking a POI also sets the radius centre point
        marker.on('click', () => {
            setClickedPoint(L.latLng(lat, lng));
            setStatus(tf('status_center', name), 'ok');
        });

        result.push(marker);
    });

    return result;
}

// ── Coastline ─────────────────────────────────────────────────────────────────
// Renders natural=coastline ways as polylines using the raw Overpass geometry.
function renderCoastline(id, data, def) {
    const result = [];
    (data.elements ?? []).forEach((el) => {
        if (el.type !== 'way' || !el.geometry?.length) return;
        const line = L.polyline(
            el.geometry.map((n) => [n.lat, n.lon]),
            { color: def.color, weight: 4.5, opacity: 1.0 },
        );
        if (el.tags?.name) line.bindPopup(`<div class="popup-name">🏖️ ${esc(el.tags.name)}</div>`);
        result.push(line);
    });
    return result;
}

// ── Water bodies ─────────────────────────────────────────────────────────────
// Converts OSM ways/relations to blue GeoJSON polygons.
function renderWater(id, data, def) {
    const result = [];
    let geojson;
    try {
        geojson = osmtogeojson(data);
    } catch (e) {
        console.error('osmtogeojson failed', e);
        return result;
    }

    geojson.features.forEach((feat) => {
        const gtype = feat.geometry?.type;
        if (!gtype || !gtype.includes('Polygon')) return;

        const name = feat.properties?.name ?? '';
        const poly = L.geoJSON(feat, {
            style: {
                color: '#0369a1',
                fillColor: def.color,
                fillOpacity: 0.35,
                weight: 2.5,
                opacity: 1,
            },
        });
        if (name) poly.bindPopup(`<div class="popup-name">💧 ${esc(name)}</div>`);
        result.push(poly);
    });

    return result;
}
