'use strict';

// ── Einheiten ─────────────────────────────────────────────────────────────────
const KM_PER_MILE = 1.60934;

// ── Farben für PLZ-Polygone ───────────────────────────────────────────────────
const PLZ_COLORS = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
    '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9',
    '#f8b500', '#00b4db', '#ff8b94', '#a8e6cf', '#ffd3b6',
];

// ── Farben für Intervall-Radien ───────────────────────────────────────────────
const INTERVAL_COLORS = [
    '#22d3ee', '#34d399', '#a3e635', '#fbbf24', '#f87171',
    '#c084fc', '#60a5fa', '#2dd4bf', '#fb923c', '#e879f9',
];

// ── Overpass-API-Endpunkte (Fallback-Reihenfolge) ────────────────────────────
const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.karte.io/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
];

// ── Kartenstile (Leaflet Tile-Layer-Definitionen) ────────────────────────────
const TILE_LAYERS = {
    osm: {
        url:     'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attr:    '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
    },
    positron: {
        url:     'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attr:    '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
        maxZoom: 19,
    },
    dark: {
        url:     'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attr:    '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
        maxZoom: 19,
    },
    voyager: {
        url:     'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attr:    '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
        maxZoom: 19,
    },
    satellite: {
        url:     'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attr:    'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18,
    },
    opnv: {
        url:     'https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png',
        attr:    'Map &copy; <a href="https://memomaps.de/">memomaps.de</a> CC-BY-SA, Kartendaten &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>-Mitwirkende',
        maxZoom: 18,
    },
};
