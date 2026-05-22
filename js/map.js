'use strict';

// ── Map initialisation ────────────────────────────────────────────────────────
const map = L.map('map', {
    zoomControl: true,
}).setView([53.1435, 8.2146], 13);

// ── Active tile layer ─────────────────────────────────────────────────────────
let currentTileLayer = L.tileLayer(TILE_LAYERS.osm.url, {
    attribution: TILE_LAYERS.osm.attr,
    maxZoom:     TILE_LAYERS.osm.maxZoom,
}).addTo(map);

// ── Switch map style ──────────────────────────────────────────────────────────
function setTileLayer(key) {
    const def = TILE_LAYERS[key];
    if (!def) return;
    map.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(def.url, {
        attribution: def.attr,
        maxZoom:     def.maxZoom,
    }).addTo(map);
}
