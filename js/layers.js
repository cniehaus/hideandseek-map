'use strict';

// ── Bounding-box helper ───────────────────────────────────────────────────────
// The Nominatim geocoder returns a bounding box as [south, north, west, east].
// The Overpass API expects the same four values but in a different order:
//   south, west, north, east
// So bb[0]=south, bb[1]=north, bb[2]=west, bb[3]=east → we swap [1] and [2].
// Using this helper in every query avoids repeating the same index shuffle and
// makes it obvious what the four numbers mean.
const bbStr = bb => `${bb[0]},${bb[2]},${bb[1]},${bb[3]}`;

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

    cityboundary: {
        label: 'lyr_cityboundary',
        color: '#f0883e',
        buildQuery: () => {
            // Prefer the exact OSM relation from Nominatim; fall back to name search.
            if (currentCity?.osm_type === 'relation' && currentCity?.osm_id) {
                return `[out:json][timeout:60];
relation(${currentCity.osm_id});
out geom;`;
            }
            const name = currentCity?.name?.split(',')[0]?.trim() ?? '';
            const bb   = currentCity?.bbox ?? [0, 0, 0, 0];
            return `[out:json][timeout:60];
relation(${bbStr(bb)})["boundary"="administrative"]["name"~"^${name}$",i];
out geom;`;
        },
        render: renderCityBoundary,
    },

    plz: {
        label: 'lyr_plz',
        color: '#4ecdc4',
        buildQuery: (bb) => `[out:json][timeout:90];
relation(${bbStr(bb)})["boundary"="postal_code"];
out geom;`,
        render: renderPLZ,
    },

    hospitals: {
        label: 'lyr_hospitals',
        color: '#f85149',
        icon:  '🏥',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bbStr(bb)})["amenity"="hospital"];
  way(${bbStr(bb)})["amenity"="hospital"];
  relation(${bbStr(bb)})["amenity"="hospital"];
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
  node(${bbStr(bb)})["railway"~"^(station|halt|tram_stop)$"];
  node(${bbStr(bb)})["amenity"="bus_station"];
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
  node(${bbStr(bb)})["tourism"~"^(attraction|museum|monument|artwork|viewpoint|gallery)$"];
  way(${bbStr(bb)})["tourism"~"^(attraction|museum|monument)$"];
  node(${bbStr(bb)})["historic"~"^(castle|monument|memorial|ruins|building)$"];
  way(${bbStr(bb)})["historic"~"^(castle|monument)$"];
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
  way(${bbStr(bb)})["leisure"="park"]["name"];
  relation(${bbStr(bb)})["leisure"="park"]["name"];
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
  node(${bbStr(bb)})["shop"="mall"];
  way(${bbStr(bb)})["shop"="mall"];
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
node(${bbStr(bb)})["highway"="bus_stop"];
out;`,
        render: renderPOIs,
    },

    cinema: {
        label: 'lyr_cinema',
        color: '#e879f9',
        icon:  '🎬',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bbStr(bb)})["amenity"="cinema"];
  way(${bbStr(bb)})["amenity"="cinema"];
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
  node(${bbStr(bb)})["tourism"="zoo"];
  way(${bbStr(bb)})["tourism"="zoo"];
  relation(${bbStr(bb)})["tourism"="zoo"];
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
  node(${bbStr(bb)})["amenity"="townhall"];
  way(${bbStr(bb)})["amenity"="townhall"];
  relation(${bbStr(bb)})["amenity"="townhall"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    water: {
        label: 'lyr_water',
        color: '#38bdf8',
        buildQuery: (bb) => `[out:json][timeout:90];
(
  way(${bbStr(bb)})["natural"="water"]["name"];
  relation(${bbStr(bb)})["natural"="water"]["name"];
  way(${bbStr(bb)})["waterway"="riverbank"]["name"];
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
  node(${bbStr(bb)})["tourism"="aquarium"];
  way(${bbStr(bb)})["tourism"="aquarium"];
  relation(${bbStr(bb)})["tourism"="aquarium"];
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
  node(${bbStr(bb)})["amenity"="library"];
  way(${bbStr(bb)})["amenity"="library"];
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
  way(${bbStr(bb)})["leisure"="golf_course"];
  relation(${bbStr(bb)})["leisure"="golf_course"];
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
  node(${bbStr(bb)})["leisure"="stadium"];
  way(${bbStr(bb)})["leisure"="stadium"];
  relation(${bbStr(bb)})["leisure"="stadium"];
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
  node(${bbStr(bb)})["amenity"="embassy"];
  way(${bbStr(bb)})["amenity"="embassy"];
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
  node(${bbStr(bb)})["amenity"="consulate"];
  way(${bbStr(bb)})["amenity"="consulate"];
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
  way(${bbStr(bb)})["landuse"="cemetery"];
  relation(${bbStr(bb)})["landuse"="cemetery"];
  way(${bbStr(bb)})["amenity"="grave_yard"];
  relation(${bbStr(bb)})["amenity"="grave_yard"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    swimmingpool: {
        label: 'lyr_swimmingpool',
        color: '#22d3ee',
        icon:  '🏊',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bbStr(bb)})["leisure"="swimming_pool"]["name"];
  way(${bbStr(bb)})["leisure"="swimming_pool"]["name"];
  node(${bbStr(bb)})["amenity"="public_bath"];
  way(${bbStr(bb)})["amenity"="public_bath"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    police: {
        label: 'lyr_police',
        color: '#6366f1',
        icon:  '🚔',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bbStr(bb)})["amenity"="police"];
  way(${bbStr(bb)})["amenity"="police"];
);
out center bb tags;`,
        render: renderPOIs,
    },

    firestation: {
        label: 'lyr_firestation',
        color: '#ef4444',
        icon:  '🚒',
        buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bbStr(bb)})["amenity"="fire_station"];
  way(${bbStr(bb)})["amenity"="fire_station"];
);
out center bb tags;`,
        render: renderPOIs,
    },
};

// ── Layer state ───────────────────────────────────────────────────────────────
let activeLayers    = {};
const layerDataCache = {};  // id → last Overpass response (used for re-colour without re-fetch)

// ── Toggle layer on/off ───────────────────────────────────────────────────────
async function toggleLayer(id, enabled) {
    if (enabled) {
        if (!currentCity) await searchCity();
        await loadLayer(id);
    } else {
        removeLayer(id);
        delete layerDataCache[id];
    }
    updatePermalink();
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
        layerDataCache[id] = data;
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

// ── Re-colour active layers after a theme change (no Overpass re-fetch) ───────
function recolorActiveLayers() {
    const theme = COLOR_THEMES[colorMode];
    Object.entries(theme.layers).forEach(([id, color]) => {
        if (LAYER_DEFS[id]) LAYER_DEFS[id].color = color;
    });
    Object.keys(activeLayers).forEach(id => {
        const cached = layerDataCache[id];
        if (!cached) return;
        activeLayers[id].forEach(l => map.removeLayer(l));
        delete activeLayers[id];
        const leafletLayers = LAYER_DEFS[id].render(id, cached, LAYER_DEFS[id]);
        activeLayers[id] = leafletLayers;
        leafletLayers.forEach(l => l.addTo(map));
    });
    updateLayerDots();
}

// ── Sync sidebar colour dots to the active theme ──────────────────────────────
function updateLayerDots() {
    const theme = COLOR_THEMES[colorMode];
    Object.entries(theme.layers).forEach(([id, color]) => {
        const label = document.querySelector(`[for="lyr-${id}"]`);
        if (!label) return;
        const dot = label.querySelector('.dot');
        if (dot) dot.style.background = color;
    });
}

// ── Remove all layers ─────────────────────────────────────────────────────────
function clearAllLayers() {
    Object.keys(activeLayers).forEach(removeLayer);
    document.querySelectorAll('[id^="lyr-"]').forEach(cb => cb.checked = false);
    updatePermalink();
}
