'use strict';

// ════════════════════════════════════════════════════════════════════════════════
// POI LAYER DEFINITIONS
// Each entry describes one layer:
//   label       → i18n key for the display name
//   color       → colour for markers / polygons
//   icon        → optional emoji for popups
//   markerOpts  → optional Leaflet CircleMarker overrides
//   buildQuery  → function (bbox) → Overpass QL string
//   render      → renderer function from renderers.js
// ════════════════════════════════════════════════════════════════════════════════
const LAYER_DEFS = {

    plz: {
        label: 'lyr_plz',
        color: '#4ecdc4',
        buildQuery: (bb) => `[out:json][timeout:90];
relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["boundary"="postal_code"];
out geom;`,
        render: renderPLZ,
    },

    hospitals: {
        label: 'lyr_hospitals',
        color: '#f85149',
        icon:  '🏥',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="hospital"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="hospital"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="hospital"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    stations: {
        label: 'lyr_stations',
        color: '#58a6ff',
        icon:  '🚉',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["railway"~"^(station|halt|tram_stop)$"];
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="bus_station"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    attractions: {
        label: 'lyr_attractions',
        color: '#ffa657',
        icon:  '⭐',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"~"^(attraction|museum|monument|artwork|viewpoint|gallery)$"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"~"^(attraction|museum|monument)$"];
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["historic"~"^(castle|monument|memorial|ruins|building)$"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["historic"~"^(castle|monument)$"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    parks: {
        label: 'lyr_parks',
        color: '#3fb950',
        icon:  '🌳',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="park"]["name"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="park"]["name"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    shopping: {
        label: 'lyr_shopping',
        color: '#d2a8ff',
        icon:  '🛍️',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["shop"="mall"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["shop"="mall"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    busstops: {
        label:      'lyr_busstops',
        color:      '#facc15',
        icon:       '🚌',
        markerOpts: { radius: 5, color: '#000', weight: 1.5 },
        buildQuery: (bb) => `[out:json][timeout:60];
node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["highway"="bus_stop"];
out;`,
        render: renderPOIs,
    },

    cinema: {
        label: 'lyr_cinema',
        color: '#e879f9',
        icon:  '🎬',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="cinema"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="cinema"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    zoo: {
        label: 'lyr_zoo',
        color: '#a3e635',
        icon:  '🦁',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="zoo"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="zoo"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="zoo"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    townhall: {
        label: 'lyr_townhall',
        color: '#fb923c',
        icon:  '🏛️',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="townhall"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="townhall"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="townhall"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    water: {
        label: 'lyr_water',
        color: '#38bdf8',
        buildQuery: (bb) => `[out:json][timeout:90];
(
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["natural"="water"]["name"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["natural"="water"]["name"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["waterway"="riverbank"]["name"];
);
out geom;`,
        render: renderWater,
    },

    aquarium: {
        label: 'lyr_aquarium',
        color: '#06b6d4',
        icon:  '🐠',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="aquarium"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="aquarium"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="aquarium"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    library: {
        label: 'lyr_library',
        color: '#a78bfa',
        icon:  '📚',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="library"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="library"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    golf: {
        label: 'lyr_golf',
        color: '#84cc16',
        icon:  '⛳',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="golf_course"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="golf_course"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    stadium: {
        label: 'lyr_stadium',
        color: '#f43f5e',
        icon:  '🏟️',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="stadium"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="stadium"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="stadium"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    embassy: {
        label: 'lyr_embassy',
        color: '#f59e0b',
        icon:  '🏛️',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="embassy"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="embassy"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    consulate: {
        label: 'lyr_consulate',
        color: '#d97706',
        icon:  '🏢',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="consulate"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="consulate"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    cemetery: {
        label: 'lyr_cemetery',
        color: '#6b7280',
        icon:  '⛪',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["landuse"="cemetery"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["landuse"="cemetery"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="grave_yard"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="grave_yard"];
);
out center bb tags;`,
        render: renderPOIs,
    },
};

// ── Layer state ───────────────────────────────────────────────────────────────
let activeLayers = {};

// ── Toggle layer on/off ───────────────────────────────────────────────────────
async function toggleLayer(id, enabled) {
    if (enabled) {
        if (!currentCity) await searchCity();
        await loadLayer(id);
    } else {
        removeLayer(id);
    }
}

// ── Load layer (Overpass query → renderer → map) ──────────────────────────────
async function loadLayer(id) {
    if (!currentCity) return;

    const def   = LAYER_DEFS[id];
    if (!def) return;

    const cntEl = document.getElementById('cnt-' + id);
    if (cntEl) cntEl.textContent = '…';
    setStatus(tf('status_loading', t(def.label)), 'loading');

    try {
        const query        = def.buildQuery(currentCity.bbox);
        const data         = await overpassFetch(query);
        removeLayer(id);
        const leafletLayers = def.render(id, data, def);
        activeLayers[id]   = leafletLayers;
        leafletLayers.forEach(l => l.addTo(map));

        const n = data.elements?.length ?? 0;
        if (cntEl) cntEl.textContent = n > 0 ? `(${n})` : '';
        setStatus(tf('status_loaded', t(def.label)), 'ok');
    } catch (e) {
        if (cntEl) cntEl.textContent = '✗';
        setStatus(t('status_err_popup'), 'error');
        showErrorPopup(tf('err_layer', t(def.label), e.message));
        console.error('[layer:' + id + ']', e);
    }
}

// ── Remove a single layer ─────────────────────────────────────────────────────
function removeLayer(id) {
    if (activeLayers[id]) {
        activeLayers[id].forEach(l => map.removeLayer(l));
        delete activeLayers[id];
    }
    const cntEl = document.getElementById('cnt-' + id);
    if (cntEl) cntEl.textContent = '';
}

// ── Remove all layers ─────────────────────────────────────────────────────────
function clearAllLayers() {
    Object.keys(activeLayers).forEach(removeLayer);
    document.querySelectorAll('[id^="lyr-"]').forEach(cb => cb.checked = false);
}
