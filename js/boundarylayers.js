'use strict';

// ── Shared Nominatim polygon helper ──────────────────────────────────────────
// Fetches a reverse-geocode polygon for `latlng` at `zoom` and adds it to the
// map with `style`. Returns { layer, uid } or null on any failure.
async function nominatimBoundaryLayer(latlng, zoom, style) {
    try {
        const res = await fetch(
            'https://nominatim.openstreetmap.org/reverse?' + new URLSearchParams({
                lat: latlng.lat, lon: latlng.lng,
                format: 'json', polygon_geojson: 1, zoom,
            })
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.geojson) return null;
        return {
            layer: L.geoJSON(data.geojson, { style, interactive: false }).addTo(map),
            uid:   `${data.osm_type}${data.osm_id}`,
        };
    } catch (_) { return null; }
}

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

registerPopoverClickOutside('boundaryPopover', 'boundaryFab');

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
        adminBoundaryMap[id] = await _loadAdminBoundaryLayer(id);
        setStatus(t('status_ready'), '');
    } catch (e) {
        delete adminBoundaryMap[id];
        if (btn) btn.classList.remove('active');
        setStatus(tf('status_err', e.message), 'error');
    }
}

// ── Internal: fetch + draw one panel boundary layer ──────────────────────────
async function _loadAdminBoundaryLayer(id) {
    const def = ADMIN_BOUNDARY_DEFS[id];
    const ref = currentCity ?? map.getCenter();
    const result = await nominatimBoundaryLayer(
        { lat: ref.lat, lng: ref.lng },
        def.zoom,
        { color: def.color, weight: 2.5, opacity: 0.85,
          fillColor: def.color, fillOpacity: def.fillOpacity }
    );
    if (!result) throw new Error(t('err_no_geojson'));
    return result.layer;
}

// ── Reload all active admin boundary layers after city change ─────────────────
async function reloadActiveBoundaryLayers() {
    const plzBtn = document.getElementById('bnd-plz');
    if (plzBtn) plzBtn.classList.toggle('active', !!activeLayers.plz);

    for (const id of Object.keys(ADMIN_BOUNDARY_DEFS)) {
        if (!adminBoundaryMap[id]) continue;
        map.removeLayer(adminBoundaryMap[id]);
        delete adminBoundaryMap[id];
        try {
            adminBoundaryMap[id] = await _loadAdminBoundaryLayer(id);
        } catch (_) { /* skip silently */ }
    }
}
