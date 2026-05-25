'use strict';

let adminMode           = null;   // null | 'A' | 'B'
let adminA              = null;   // { latlng, address } | null
let adminB              = null;
let adminMarkers        = [];
let adminBoundaryLayers = [];

// Nominatim address fields to check, in priority order, for each of the 4 game levels
const ADMIN_LEVEL_FIELDS = [
    ['neighbourhood', 'suburb', 'quarter', 'hamlet', 'isolated_dwelling'],
    ['city_district', 'city', 'town', 'village', 'municipality'],
    ['county', 'district', 'state_district'],
    ['state', 'province', 'region'],
];

// Nominatim zoom level and style for each boundary (levels 2, 3, 4 — skip level 1 suburb)
const BOUNDARY_STYLES = [
    { zoom: 10, color: '#f0883e', fillOpacity: 0.07 },  // 2. city
    { zoom:  8, color: '#58a6ff', fillOpacity: 0.05 },  // 3. county
    { zoom:  5, color: '#d2a8ff', fillOpacity: 0.03 },  // 4. state
];

function adminIcon(letter) {
    return L.divIcon({
        className: 'meas-icon',
        html:      letter,
        iconSize:  [22, 22],
        iconAnchor:[11, 11],
    });
}

async function reverseGeocode(latlng) {
    const res = await fetch(
        'https://nominatim.openstreetmap.org/reverse?' + new URLSearchParams({
            lat: latlng.lat, lon: latlng.lng,
            format: 'json', addressdetails: 1, zoom: 14,
        })
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

function extractAdminLevel(address, fields) {
    for (const f of fields) {
        if (address[f]) return address[f];
    }
    return null;
}

// Draw boundaries at zoom levels 10 / 8 / 5 around the given point
async function fetchAndDrawBoundaries(latlng) {
    clearBoundaryLayers();
    const seen = new Set();

    for (const { zoom, color, fillOpacity } of BOUNDARY_STYLES) {
        try {
            const res = await fetch(
                'https://nominatim.openstreetmap.org/reverse?' + new URLSearchParams({
                    lat: latlng.lat, lon: latlng.lng,
                    format: 'json', polygon_geojson: 1, zoom,
                })
            );
            if (!res.ok) continue;
            const data = await res.json();
            if (!data.geojson) continue;

            // Skip if same OSM entity already drawn (e.g. Kreisfreie Stadt = city & county)
            const uid = `${data.osm_type}${data.osm_id}`;
            if (seen.has(uid)) continue;
            seen.add(uid);

            const layer = L.geoJSON(data.geojson, {
                style: {
                    color,
                    weight:      2.5,
                    opacity:     0.85,
                    fillColor:   color,
                    fillOpacity,
                },
            }).addTo(map);
            adminBoundaryLayers.push(layer);
        } catch (_) { /* skip failed level silently */ }
    }
}

function clearBoundaryLayers() {
    adminBoundaryLayers.forEach(l => map.removeLayer(l));
    adminBoundaryLayers = [];
}

function renderAdminResult() {
    const el = document.getElementById('adminResult');
    if (!adminA || !adminB) { el.innerHTML = ''; return; }

    const addrA = adminA.address;
    const addrB = adminB.address;

    if (!addrA || !addrB) {
        el.innerHTML = `<div class="admin-loading">${t('admin_loading')}</div>`;
        return;
    }

    const rows = ADMIN_LEVEL_FIELDS.map((fields, i) => {
        const n  = i + 1;
        const vA = extractAdminLevel(addrA, fields);
        const vB = extractAdminLevel(addrB, fields);

        let icon, cls, text;
        if (!vA && !vB) {
            icon = '–'; cls = 'admin-na'; text = '–';
        } else if (vA === vB) {
            icon = '✓'; cls = 'admin-match'; text = vA;
        } else {
            icon = '✗'; cls = 'admin-miss';
            text = `${vA ?? '?'} / ${vB ?? '?'}`;
        }

        return `<div class="admin-row ${cls}">` +
            `<span class="admin-icon">${icon}</span>` +
            `<span class="admin-n">${n}.</span>` +
            `<span class="admin-val">${esc(text)}</span>` +
            `</div>`;
    }).join('');

    el.innerHTML = rows;
    setStatus(t('status_admin_done'), 'ok');
}

function toggleAdminCheck() {
    if (adminMode !== null) {
        clearAdminCheck();
        return;
    }
    adminMode = 'A';
    adminA    = null;
    adminB    = null;
    clearAdminMarkers();
    clearBoundaryLayers();
    document.getElementById('adminResult').innerHTML = '';
    document.getElementById('adminBtn').textContent = t('btn_admin_stop');
    document.getElementById('adminBtn').classList.add('meas-active');
    setStatus(t('status_admin_a'), 'loading');
}

function clearAdminCheck() {
    adminMode = null;
    adminA    = null;
    adminB    = null;
    clearAdminMarkers();
    clearBoundaryLayers();
    document.getElementById('adminResult').innerHTML = '';
    document.getElementById('adminBtn').textContent  = t('btn_admin_start');
    document.getElementById('adminBtn').classList.remove('meas-active');
    setStatus(t('status_ready'), '');
}

function clearAdminMarkers() {
    adminMarkers.forEach(m => map.removeLayer(m));
    adminMarkers = [];
}

// Called from measure.js map click handler; returns true if the click was consumed
function adminHandleClick(e) {
    if (adminMode === null) return false;

    const latlng = e.latlng;

    if (adminMode === 'A') {
        adminMode = 'B';
        adminA    = { latlng, address: null };
        adminMarkers.push(L.marker(latlng, { icon: adminIcon('A') }).addTo(map));
        setStatus(t('status_admin_b'), 'loading');

        // Text comparison data
        reverseGeocode(latlng)
            .then(d   => { adminA.address = d.address; renderAdminResult(); })
            .catch(err => setStatus(tf('status_err', err.message), 'error'));

        // Boundary polygons for levels 2 / 3 / 4
        fetchAndDrawBoundaries(latlng);
        return true;
    }

    if (adminMode === 'B') {
        adminMode = null;
        adminB    = { latlng, address: null };
        adminMarkers.push(L.marker(latlng, { icon: adminIcon('B') }).addTo(map));
        document.getElementById('adminBtn').textContent = t('btn_admin_start');
        document.getElementById('adminBtn').classList.remove('meas-active');
        setStatus(t('status_admin_loading'), 'loading');
        renderAdminResult();

        reverseGeocode(latlng)
            .then(d   => { adminB.address = d.address; renderAdminResult(); })
            .catch(err => setStatus(tf('status_err', err.message), 'error'));
        return true;
    }

    return false;
}
