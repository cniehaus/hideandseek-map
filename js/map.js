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

// ── Close a popover when clicking outside it or its trigger button ────────────
function registerPopoverClickOutside(popId, fabId) {
    document.addEventListener('click', (e) => {
        const pop = document.getElementById(popId);
        const fab = document.getElementById(fabId);
        if (pop?.classList.contains('open') &&
            !pop.contains(e.target) && !fab.contains(e.target)) {
            pop.classList.remove('open');
        }
    });
}

// ── Map click hook registry ───────────────────────────────────────────────────
// Feature files call addMapClickHook(fn) to register handlers that run before
// the default click behaviour (radius centre). A handler returning true consumes
// the click.
const _mapClickHooks = [];
function addMapClickHook(fn) { _mapClickHooks.push(fn); }

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
