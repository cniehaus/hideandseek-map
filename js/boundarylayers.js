'use strict';

// ── Admin boundary layers (Nominatim polygon) ─────────────────────────────────
const adminBoundaryMap = {};   // id → L.Layer | null

const ADMIN_BOUNDARY_DEFS = {
    admin1: { zoom: 14, color: '#facc15', fillOpacity: 0.20 },
    admin2: { zoom: 10, color: '#f0883e', fillOpacity: 0.18 },
    admin3: { zoom:  8, color: '#58a6ff', fillOpacity: 0.14 },
    admin4: { zoom:  5, color: '#d2a8ff', fillOpacity: 0.10 },
};

// ── Popover toggle ────────────────────────────────────────────────────────────
function toggleBoundaryPopover() {
    document.getElementById('boundaryPopover').classList.toggle('open');
}

document.addEventListener('click', (e) => {
    const pop = document.getElementById('boundaryPopover');
    const fab = document.getElementById('boundaryFab');
    if (pop && pop.classList.contains('open') &&
        !pop.contains(e.target) && e.target !== fab) {
        pop.classList.remove('open');
    }
});

// ── Toggle a boundary layer on/off ───────────────────────────────────────────
async function toggleBoundaryLayer(id) {
    const btn = document.getElementById('bnd-' + id);

    if (id === 'plz') {
        const wasActive = !!activeLayers.plz;
        await toggleLayer('plz', !wasActive);
        if (btn) btn.classList.toggle('active', !!activeLayers.plz);
        return;
    }

    if (adminBoundaryMap[id]) {
        map.removeLayer(adminBoundaryMap[id]);
        delete adminBoundaryMap[id];
        if (btn) btn.classList.remove('active');
        return;
    }

    if (btn) btn.classList.add('active');
    setStatus(t('status_admin_loading'), 'loading');

    try {
        adminBoundaryMap[id] = await _fetchAdminBoundaryLayer(id);
        setStatus(t('status_ready'), '');
    } catch (e) {
        delete adminBoundaryMap[id];
        if (btn) btn.classList.remove('active');
        setStatus(tf('status_err', e.message), 'error');
    }
}

// ── Internal: fetch + draw one admin boundary via Nominatim ──────────────────
async function _fetchAdminBoundaryLayer(id) {
    const def = ADMIN_BOUNDARY_DEFS[id];
    const ref = currentCity
        ? { lat: currentCity.lat, lng: currentCity.lng }
        : map.getCenter();

    const res = await fetch(
        'https://nominatim.openstreetmap.org/reverse?' + new URLSearchParams({
            lat: ref.lat, lon: ref.lng,
            format: 'json', polygon_geojson: 1, zoom: def.zoom,
        })
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.geojson) throw new Error(t('err_no_geojson'));

    return L.geoJSON(data.geojson, {
        style: {
            color:       def.color,
            weight:      2.5,
            opacity:     0.85,
            fillColor:   def.color,
            fillOpacity: def.fillOpacity,
        },
    }).addTo(map);
}

// ── Reload all active admin boundary layers after city change ─────────────────
async function reloadActiveBoundaryLayers() {
    // PLZ is handled by city.js via activeLayers tracking
    // Sync the PLZ button state
    const plzBtn = document.getElementById('bnd-plz');
    if (plzBtn) plzBtn.classList.toggle('active', !!activeLayers.plz);

    for (const id of Object.keys(ADMIN_BOUNDARY_DEFS)) {
        if (!adminBoundaryMap[id]) continue;
        map.removeLayer(adminBoundaryMap[id]);
        delete adminBoundaryMap[id];
        try {
            adminBoundaryMap[id] = await _fetchAdminBoundaryLayer(id);
        } catch (_) { /* skip silently */ }
    }
}
