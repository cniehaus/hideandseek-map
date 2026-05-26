'use strict';

// ── Units ─────────────────────────────────────────────────────────────────────
const KM_PER_MILE = 1.60934;

// ── Color themes (default + colorblind-safe Okabe-Ito/Tol palette) ────────────
const COLOR_THEMES = {
    default: {
        plz: [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
            '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9',
            '#f8b500', '#00b4db', '#ff8b94', '#a8e6cf', '#ffd3b6',
        ],
        interval: [
            '#22d3ee', '#34d399', '#a3e635', '#fbbf24', '#f87171',
            '#c084fc', '#60a5fa', '#2dd4bf', '#fb923c', '#e879f9',
        ],
        busRoute: [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
            '#f97316', '#a855f7',
        ],
        layers: {
            cityboundary: '#f0883e',
            plz:          '#4ecdc4',
            hospitals:    '#f85149',
            stations:     '#58a6ff',
            attractions:  '#ffa657',
            parks:        '#3fb950',
            shopping:     '#d2a8ff',
            busstops:     '#facc15',
            cinema:       '#e879f9',
            zoo:          '#a3e635',
            townhall:     '#fb923c',
            coastline:    '#1e40af',
            water:        '#38bdf8',
            aquarium:     '#06b6d4',
            library:      '#a78bfa',
            golf:         '#84cc16',
            stadium:      '#f43f5e',
            embassy:      '#f59e0b',
            consulate:    '#d97706',
            cemetery:     '#6b7280',
            swimmingpool: '#22d3ee',
            police:       '#6366f1',
            firestation:  '#ef4444',
            fastfood:     '#fbbf24',
            museum:       '#ca8a04',
            amusementpark:'#db2777',
        },
    },
    colorblind: {
        // Based on Okabe-Ito and Paul Tol palettes — safe for deuteranopia/protanopia.
        // Avoids pure red/green pairs; uses teal for "nature" and vermillion for "danger".
        plz: [
            '#0072B2', '#E69F00', '#009E73', '#CC79A7', '#F0E442',
            '#D55E00', '#332288', '#44AA99', '#882255', '#56B4E9',
            '#117733', '#DDCC77', '#CC6677', '#AA3377', '#999933',
        ],
        interval: [
            '#56B4E9', '#E69F00', '#009E73', '#D55E00', '#CC79A7',
            '#0072B2', '#44AA99', '#F0E442', '#332288', '#882255',
        ],
        busRoute: [
            '#0072B2', '#D55E00', '#009E73', '#E69F00', '#CC79A7',
            '#332288', '#44AA99', '#56B4E9', '#882255', '#AA3377',
        ],
        layers: {
            cityboundary: '#56B4E9',
            plz:          '#0072B2',
            hospitals:    '#D55E00',
            stations:     '#4477AA',
            attractions:  '#E69F00',
            parks:        '#009E73',
            shopping:     '#CC79A7',
            busstops:     '#F0E442',
            cinema:       '#882255',
            zoo:          '#44AA99',
            townhall:     '#DDCC77',
            coastline:    '#4477AA',
            water:        '#56B4E9',
            aquarium:     '#66CCEE',
            library:      '#AA3377',
            golf:         '#117733',
            stadium:      '#CC6677',
            embassy:      '#CCBB44',
            consulate:    '#999933',
            cemetery:     '#BBBBBB',
            swimmingpool: '#0072B2',
            police:       '#332288',
            firestation:  '#EE8866',
            fastfood:     '#F0E442',
            museum:       '#88CCEE',
            amusementpark:'#CC6677',
        },
    },
};

let colorMode = localStorage.getItem('colorMode') ?? 'default';

// ── Colours for postal-code polygons ─────────────────────────────────────────
let PLZ_COLORS = COLOR_THEMES[colorMode].plz;

// ── Colours for interval radii ────────────────────────────────────────────────
let INTERVAL_COLORS = COLOR_THEMES[colorMode].interval;

// ── Overpass API endpoints (fallback order) ───────────────────────────────────
const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.karte.io/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
];

// ── Map styles (Leaflet tile-layer definitions) ───────────────────────────────
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
