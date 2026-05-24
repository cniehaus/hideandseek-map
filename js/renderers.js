'use strict';

// ── Postal-code polygons ──────────────────────────────────────────────────────
// Converts OSM relations to coloured GeoJSON areas with postal-code labels.
function renderPLZ(id, data, def) {
    const result = [];
    let geojson;
    try {
        geojson = osmtogeojson(data);
    } catch (e) {
        console.error('osmtogeojson failed', e);
        return result;
    }

    let ci = 0;
    geojson.features.forEach(feat => {
        const gtype = feat.geometry?.type;
        if (!gtype || !gtype.includes('Polygon')) return;

        const plz = feat.properties?.postal_code
            ?? feat.properties?.['addr:postcode']
            ?? feat.properties?.name
            ?? '?';
        const color = PLZ_COLORS[ci++ % PLZ_COLORS.length];

        const poly = L.geoJSON(feat, {
            style: { color, fillColor: color, fillOpacity: 0.18, weight: 2, opacity: 0.85 },
        });
        poly.on('mouseover', function () { this.setStyle({ fillOpacity: 0.45 }); });
        poly.on('mouseout',  function () { this.setStyle({ fillOpacity: 0.18 }); });
        poly.bindPopup(`<div class="popup-name">${tf('plz_label', plz)}</div>`);
        result.push(poly);

        try {
            const bounds = poly.getBounds();
            if (bounds.isValid()) {
                result.push(L.marker(bounds.getCenter(), {
                    icon: L.divIcon({
                        className: 'plz-label',
                        html:       plz,
                        iconSize:   [60, 20],
                        iconAnchor: [30, 10],
                    }),
                    interactive:  false,
                    zIndexOffset: 100,
                }));
            }
        } catch (_) {}
    });

    return result;
}

// ── POI points (hospitals, train stations, …) ────────────────────────────────
// Draws each OSM node/way/relation as a coloured CircleMarker.
function renderPOIs(id, data, def) {
    const result = [];

    (data.elements ?? []).forEach(el => {
        let lat, lng;
        if      (el.type === 'node') { lat = el.lat;                                lng = el.lon; }
        else if (el.center)          { lat = el.center.lat;                         lng = el.center.lon; }
        else if (el.bounds)          { lat = (el.bounds.minlat + el.bounds.maxlat) / 2;
                                       lng = (el.bounds.minlon + el.bounds.maxlon) / 2; }
        else return;

        const name = el.tags?.name ?? el.tags?.['name:de'] ?? t(def.label);
        const type = el.tags?.amenity  ?? el.tags?.railway  ?? el.tags?.tourism
                  ?? el.tags?.leisure  ?? el.tags?.historic ?? el.tags?.shop ?? '';

        const marker = L.circleMarker([lat, lng], {
            radius:      8,
            fillColor:   def.color,
            color:       '#fff',
            weight:      2,
            opacity:     1,
            fillOpacity: 0.9,
            ...(def.markerOpts ?? {}),
        });

        marker.bindPopup(`
            <div class="popup-name">${def.icon ?? '📌'} ${esc(name)}</div>
            <div class="popup-type">${esc(type)}</div>
            <div class="popup-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        `);

        // Clicking a POI also sets the radius centre point
        marker.on('click', () => {
            setClickedPoint(L.latLng(lat, lng));
            setStatus(tf('status_center', name), 'ok');
        });

        result.push(marker);
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

    geojson.features.forEach(feat => {
        const gtype = feat.geometry?.type;
        if (!gtype || !gtype.includes('Polygon')) return;

        const name = feat.properties?.name ?? '';
        const poly = L.geoJSON(feat, {
            style: { color: '#0369a1', fillColor: def.color, fillOpacity: 0.35, weight: 2.5, opacity: 1 },
        });
        if (name) poly.bindPopup(`<div class="popup-name">💧 ${esc(name)}</div>`);
        result.push(poly);
    });

    return result;
}
