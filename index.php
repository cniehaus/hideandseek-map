<?php

declare(strict_types=1);

$defaultCity = htmlspecialchars($_GET['city'] ?? 'Oldenburg', ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="de">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jet Lag Hide &amp; Seek – Karten</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="style.css" />
</head>

<body>

    <!-- ════════ SIDEBAR ════════ -->
    <div id="sidebar">
        <div class="s-header">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
                <div>
                    <h1>Jet Lag Maps</h1>
                    <small>Hide &amp; Seek Kartentools</small>
                </div>
                <div style="display:flex;gap:3px;flex-shrink:0">
                    <button id="unitKm" style="font-size:11px;padding:3px 8px" onclick="setUnits('metric')">km</button>
                    <button id="unitMi" class="ghost" style="font-size:11px;padding:3px 8px" onclick="setUnits('imperial')">mi</button>
                </div>
            </div>
            <select id="tileSelect" onchange="setTileLayer(this.value)">
                <option value="osm">OSM Standard</option>
                <option value="positron">Hell (CartoDB Positron)</option>
                <option value="dark">Dunkel (CartoDB Dark)</option>
                <option value="voyager">Voyager (CartoDB)</option>
                <option value="satellite">Satellit (Esri)</option>
            </select>
        </div>

        <!-- Stadt -->
        <div class="section">
            <div class="section-title">Stadt</div>
            <div class="row">
                <input type="text" id="cityInput" value="<?= $defaultCity ?>" placeholder="z.B. Oldenburg, Bremen …">
                <button onclick="searchCity()">Suchen</button>
            </div>
            <div id="cityHint" style="font-size:11px;color:#8b949e;margin-top:2px"></div>
        </div>

        <!-- Layer -->
        <div class="section">
            <div class="section-title">Layer</div>

            <label class="layer-row" for="lyr-plz">
                <input type="checkbox" id="lyr-plz" onchange="toggleLayer('plz', this.checked)">
                <div class="dot" style="background:#4ecdc4;border:1px solid #2aa8a8"></div>
                <span class="layer-name">Postleitzahlen</span>
                <span class="layer-count" id="cnt-plz"></span>
            </label>

            <label class="layer-row" for="lyr-hospitals">
                <input type="checkbox" id="lyr-hospitals" onchange="toggleLayer('hospitals', this.checked)">
                <div class="dot" style="background:#f85149"></div>
                <span class="layer-name">Krankenhäuser</span>
                <span class="layer-count" id="cnt-hospitals"></span>
            </label>

            <label class="layer-row" for="lyr-stations">
                <input type="checkbox" id="lyr-stations" onchange="toggleLayer('stations', this.checked)">
                <div class="dot" style="background:#58a6ff"></div>
                <span class="layer-name">Bahnhöfe &amp; Haltestellen</span>
                <span class="layer-count" id="cnt-stations"></span>
            </label>

            <label class="layer-row" for="lyr-attractions">
                <input type="checkbox" id="lyr-attractions" onchange="toggleLayer('attractions', this.checked)">
                <div class="dot" style="background:#ffa657"></div>
                <span class="layer-name">Sehenswürdigkeiten</span>
                <span class="layer-count" id="cnt-attractions"></span>
            </label>

            <label class="layer-row" for="lyr-parks">
                <input type="checkbox" id="lyr-parks" onchange="toggleLayer('parks', this.checked)">
                <div class="dot" style="background:#3fb950"></div>
                <span class="layer-name">Parks &amp; Grünanlagen</span>
                <span class="layer-count" id="cnt-parks"></span>
            </label>

            <label class="layer-row" for="lyr-shopping">
                <input type="checkbox" id="lyr-shopping" onchange="toggleLayer('shopping', this.checked)">
                <div class="dot" style="background:#d2a8ff"></div>
                <span class="layer-name">Einkaufszentren</span>
                <span class="layer-count" id="cnt-shopping"></span>
            </label>

            <label class="layer-row" for="lyr-busstops">
                <input type="checkbox" id="lyr-busstops" onchange="toggleLayer('busstops', this.checked)">
                <div class="dot" style="background:#facc15"></div>
                <span class="layer-name">Bushaltestellen</span>
                <span class="layer-count" id="cnt-busstops"></span>
            </label>

            <label class="layer-row" for="lyr-cinema">
                <input type="checkbox" id="lyr-cinema" onchange="toggleLayer('cinema', this.checked)">
                <div class="dot" style="background:#e879f9"></div>
                <span class="layer-name">Kinos</span>
                <span class="layer-count" id="cnt-cinema"></span>
            </label>

            <label class="layer-row" for="lyr-zoo">
                <input type="checkbox" id="lyr-zoo" onchange="toggleLayer('zoo', this.checked)">
                <div class="dot" style="background:#a3e635"></div>
                <span class="layer-name">Zoos</span>
                <span class="layer-count" id="cnt-zoo"></span>
            </label>

            <label class="layer-row" for="lyr-townhall">
                <input type="checkbox" id="lyr-townhall" onchange="toggleLayer('townhall', this.checked)">
                <div class="dot" style="background:#fb923c"></div>
                <span class="layer-name">Rathäuser</span>
                <span class="layer-count" id="cnt-townhall"></span>
            </label>

            <label class="layer-row" for="lyr-water">
                <input type="checkbox" id="lyr-water" onchange="toggleLayer('water', this.checked)">
                <div class="dot" style="background:#38bdf8;border:1px solid #0ea5e9"></div>
                <span class="layer-name">Wasserflächen</span>
                <span class="layer-count" id="cnt-water"></span>
            </label>

            <label class="layer-row" for="lyr-aquarium">
                <input type="checkbox" id="lyr-aquarium" onchange="toggleLayer('aquarium', this.checked)">
                <div class="dot" style="background:#06b6d4"></div>
                <span class="layer-name">Aquarien</span>
                <span class="layer-count" id="cnt-aquarium"></span>
            </label>

            <label class="layer-row" for="lyr-library">
                <input type="checkbox" id="lyr-library" onchange="toggleLayer('library', this.checked)">
                <div class="dot" style="background:#a78bfa"></div>
                <span class="layer-name">Büchereien</span>
                <span class="layer-count" id="cnt-library"></span>
            </label>

            <label class="layer-row" for="lyr-golf">
                <input type="checkbox" id="lyr-golf" onchange="toggleLayer('golf', this.checked)">
                <div class="dot" style="background:#84cc16"></div>
                <span class="layer-name">Golf-Plätze</span>
                <span class="layer-count" id="cnt-golf"></span>
            </label>

            <label class="layer-row" for="lyr-stadium">
                <input type="checkbox" id="lyr-stadium" onchange="toggleLayer('stadium', this.checked)">
                <div class="dot" style="background:#f43f5e"></div>
                <span class="layer-name">Stadien</span>
                <span class="layer-count" id="cnt-stadium"></span>
            </label>

            <label class="layer-row" for="lyr-embassy">
                <input type="checkbox" id="lyr-embassy" onchange="toggleLayer('embassy', this.checked)">
                <div class="dot" style="background:#f59e0b"></div>
                <span class="layer-name">Botschaften</span>
                <span class="layer-count" id="cnt-embassy"></span>
            </label>

            <label class="layer-row" for="lyr-consulate">
                <input type="checkbox" id="lyr-consulate" onchange="toggleLayer('consulate', this.checked)">
                <div class="dot" style="background:#d97706"></div>
                <span class="layer-name">Konsulate</span>
                <span class="layer-count" id="cnt-consulate"></span>
            </label>

            <div style="margin-top:10px">
                <button class="ghost" style="width:100%" onclick="clearAllLayers()">Alle Layer entfernen</button>
            </div>
        </div>

        <!-- Radius-Tool -->
        <div class="section">
            <div class="section-title">Radius-Tool</div>

            <div class="coord-display" id="clickCoords" title="Klick auf der Karte setzt den Mittelpunkt">
                ↖ Auf die Karte klicken, um Mittelpunkt zu setzen
            </div>

            <!-- Mode tabs -->
            <div style="display:flex;gap:4px;margin-bottom:8px">
                <button id="tabSingle" style="flex:1;font-size:12px" onclick="setRadiusMode('single')">Einzeln</button>
                <button id="tabInterval" class="ghost" style="flex:1;font-size:12px" onclick="setRadiusMode('interval')">Intervall</button>
            </div>

            <!-- Single mode -->
            <div id="modeSingle">
                <div class="row">
                    <input type="number" id="radiusKm" value="2" min="0.1" max="100" step="0.1" placeholder="km" style="max-width:80px">
                    <span id="unitLabelRadius" style="line-height:31px;color:#8b949e;font-size:12px">km Radius</span>
                    <button onclick="drawRadius()" style="margin-left:auto">Zeichnen</button>
                </div>
            </div>

            <!-- Interval mode -->
            <div id="modeInterval" style="display:none">
                <div class="row" style="align-items:center">
                    <input type="number" id="intervalStep" value="1" min="0.1" max="50" step="0.1" style="max-width:65px">
                    <span id="unitLabelStep" style="color:#8b949e;font-size:12px;white-space:nowrap">km Schritt,</span>
                    <input type="number" id="intervalCount" value="5" min="2" max="10" step="1" style="max-width:50px">
                    <span style="color:#8b949e;font-size:12px">Ringe</span>
                </div>
                <button style="width:100%;margin-top:4px" onclick="drawRadius()">Zeichnen</button>
            </div>

            <div style="font-size:11px;color:#484f58;margin:8px 0 4px">
                Oder Koordinaten manuell eingeben:
            </div>
            <div class="row">
                <input type="text" id="manualLat" placeholder="Breite z.B. 53.1435">
                <input type="text" id="manualLng" placeholder="Länge z.B. 8.2146">
            </div>
            <button class="ghost" style="width:100%;margin-bottom:4px" onclick="useManualCoords()">Koordinaten übernehmen</button>

            <div id="radiusList"></div>
            <div style="margin-top:8px">
                <button class="ghost" style="width:100%" onclick="clearAllRadii()">Alle Radien löschen</button>
            </div>
        </div>

        <!-- Distanz & Richtung -->
        <div class="section">
            <div class="section-title">Distanz &amp; Richtung</div>
            <div style="font-size:11px;color:#484f58;margin-bottom:8px">
                Zwei Punkte auf der Karte setzen – A dann B.
            </div>
            <button id="measBtn" style="width:100%" onclick="toggleMeasure()">Messen starten</button>
            <div class="meas-result" id="measResult"></div>
            <button class="ghost" style="width:100%;margin-top:6px" onclick="clearMeasure()">Messung löschen</button>
        </div>

        <div id="status">Bereit</div>
    </div>

    <!-- ════════ MAP ════════ -->
    <div id="map"></div>

    <!-- ════════ ERROR POPUP ════════ -->
    <div id="errorOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center">
        <div style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px 22px;max-width:480px;width:90%;box-shadow:0 8px 32px #0008">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <span style="font-size:18px">⚠️</span>
                <strong style="color:#f85149;font-size:14px">Fehler beim Laden</strong>
                <button onclick="closeErrorPopup()" style="margin-left:auto;background:none;border:none;color:#8b949e;font-size:18px;cursor:pointer;padding:0 4px">✕</button>
            </div>
            <pre id="errorText" style="background:#0d1117;border:1px solid #21262d;border-radius:6px;padding:10px;font-size:11px;color:#c9d1d9;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto;margin:0 0 12px"></pre>
            <button id="errorCopyBtn" onclick="copyErrorText()" style="width:100%;font-size:12px">📋 Fehlertext kopieren</button>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/osmtogeojson@3.0.0-beta.5/osmtogeojson.min.js"></script>
    <script>
        'use strict';

        // ── Map init ─────────────────────────────────────────────────────────────────
        const map = L.map('map', {
            zoomControl: true
        }).setView([53.1435, 8.2146], 13);

        // ── Tile layers ───────────────────────────────────────────────────────────────
        const TILE_LAYERS = {
            osm: {
                label: 'OSM Standard',
                url:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attr:  '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 19,
            },
            positron: {
                label: 'Hell (CartoDB Positron)',
                url:   'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                attr:  '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
                maxZoom: 19,
            },
            dark: {
                label: 'Dunkel (CartoDB Dark)',
                url:   'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                attr:  '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
                maxZoom: 19,
            },
            voyager: {
                label: 'Voyager (CartoDB)',
                url:   'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                attr:  '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
                maxZoom: 19,
            },
            satellite: {
                label: 'Satellit (Esri)',
                url:   'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attr:  'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 18,
            },
        };

        let currentTileLayer = L.tileLayer(TILE_LAYERS.osm.url, {
            attribution: TILE_LAYERS.osm.attr,
            maxZoom:     TILE_LAYERS.osm.maxZoom,
        }).addTo(map);

        function setTileLayer(key) {
            const def = TILE_LAYERS[key];
            if (!def) return;
            map.removeLayer(currentTileLayer);
            currentTileLayer = L.tileLayer(def.url, {
                attribution: def.attr,
                maxZoom:     def.maxZoom,
            }).addTo(map);
        }

        // ── State ─────────────────────────────────────────────────────────────────────
        let currentCity = null; // { name, lat, lng, bbox: [minLat, maxLat, minLon, maxLon] }
        let clickedPoint = null;
        const activeLayers = {}; // layerId → Leaflet layer[]
        let units = 'metric'; // 'metric' | 'imperial'

        const KM_PER_MILE = 1.60934;

        function toKm(v)      { return units === 'imperial' ? v * KM_PER_MILE : v; }
        function fromKm(km)   { return units === 'imperial' ? km / KM_PER_MILE : km; }
        function unitStr()    { return units === 'imperial' ? 'mi' : 'km'; }
        function fmtDist(km)  {
            const v = fromKm(km);
            return `${v % 1 === 0 ? v : v.toFixed(2)} ${unitStr()}`;
        }
        function fmtDistShort(km) {
            const v = fromKm(km);
            return `${v % 1 === 0 ? v : v.toFixed(1)} ${unitStr()}`;
        }

        function setUnits(u) {
            units = u;
            document.getElementById('unitKm').className = u === 'metric'   ? '' : 'ghost';
            document.getElementById('unitMi').className = u === 'imperial' ? '' : 'ghost';
            document.getElementById('unitLabelRadius').textContent = unitStr() + ' Radius';
            document.getElementById('unitLabelStep').textContent   = unitStr() + ' Schritt,';
        }
        let radiusCounter = 0;
        let radiusMode = 'single';
        const radiusItems = {}; // id → { layers: Leaflet[], outerCircle }

        const INTERVAL_COLORS = [
            '#22d3ee','#34d399','#a3e635','#fbbf24','#f87171',
            '#c084fc','#60a5fa','#2dd4bf','#fb923c','#e879f9',
        ];
        let measMode = null; // null | 'A' | 'B'
        let measA = null;
        let measB = null;
        let measLayers = [];

        // ── Layer definitions ─────────────────────────────────────────────────────────
        const LAYER_DEFS = {
            plz: {
                label: 'Postleitzahlen',
                color: '#4ecdc4',
                buildQuery: (bb) => `[out:json][timeout:90];
relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["boundary"="postal_code"];
out geom;`,
                render: renderPLZ,
            },
            hospitals: {
                label: 'Krankenhäuser',
                color: '#f85149',
                icon: '🏥',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="hospital"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="hospital"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="hospital"];
);
out center tags;`,
                render: renderPOIs,
            },
            stations: {
                label: 'Bahnhöfe & Haltestellen',
                color: '#58a6ff',
                icon: '🚉',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["railway"~"^(station|halt|tram_stop)$"];
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="bus_station"];
);
out center tags;`,
                render: renderPOIs,
            },
            attractions: {
                label: 'Sehenswürdigkeiten',
                color: '#ffa657',
                icon: '⭐',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"~"^(attraction|museum|monument|artwork|viewpoint|gallery)$"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"~"^(attraction|museum|monument)$"];
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["historic"~"^(castle|monument|memorial|ruins|building)$"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["historic"~"^(castle|monument)$"];
);
out center tags;`,
                render: renderPOIs,
            },
            parks: {
                label: 'Parks & Grünanlagen',
                color: '#3fb950',
                icon: '🌳',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="park"]["name"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="park"]["name"];
);
out center tags;`,
                render: renderPOIs,
            },
            shopping: {
                label: 'Einkaufszentren',
                color: '#d2a8ff',
                icon: '🛍️',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["shop"="mall"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["shop"="mall"];
);
out center tags;`,
                render: renderPOIs,
            },
            busstops: {
                label: 'Bushaltestellen',
                color: '#facc15',
                icon: '🚌',
                markerOpts: { radius: 5, color: '#000', weight: 1.5 },
                buildQuery: (bb) => `[out:json][timeout:60];
node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["highway"="bus_stop"];
out;`,
                render: renderPOIs,
            },
            cinema: {
                label: 'Kinos',
                color: '#e879f9',
                icon: '🎬',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="cinema"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="cinema"];
);
out center tags;`,
                render: renderPOIs,
            },
            zoo: {
                label: 'Zoos',
                color: '#a3e635',
                icon: '🦁',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="zoo"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="zoo"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="zoo"];
);
out center tags;`,
                render: renderPOIs,
            },
            townhall: {
                label: 'Rathäuser',
                color: '#fb923c',
                icon: '🏛️',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="townhall"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="townhall"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="townhall"];
);
out center tags;`,
                render: renderPOIs,
            },
            water: {
                label: 'Wasserflächen',
                color: '#38bdf8',
                buildQuery: (bb) => `[out:json][timeout:90];
(
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["natural"="water"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["natural"="water"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["waterway"="riverbank"];
);
out geom;`,
                render: renderWater,
            },
            aquarium: {
                label: 'Aquarien',
                color: '#06b6d4',
                icon: '🐠',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="aquarium"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="aquarium"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["tourism"="aquarium"];
);
out center tags;`,
                render: renderPOIs,
            },
            library: {
                label: 'Büchereien',
                color: '#a78bfa',
                icon: '📚',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="library"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="library"];
);
out center tags;`,
                render: renderPOIs,
            },
            golf: {
                label: 'Golf-Plätze',
                color: '#84cc16',
                icon: '⛳',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="golf_course"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="golf_course"];
);
out center tags;`,
                render: renderPOIs,
            },
            stadium: {
                label: 'Stadien',
                color: '#f43f5e',
                icon: '🏟️',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="stadium"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="stadium"];
  relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["leisure"="stadium"];
);
out center tags;`,
                render: renderPOIs,
            },
            embassy: {
                label: 'Botschaften',
                color: '#f59e0b',
                icon: '🏛️',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="embassy"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="embassy"];
);
out center tags;`,
                render: renderPOIs,
            },
            consulate: {
                label: 'Konsulate',
                color: '#d97706',
                icon: '🏢',
                buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="consulate"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="consulate"];
);
out center tags;`,
                render: renderPOIs,
            },
        };

        // PLZ color palette
        const PLZ_COLORS = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
            '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9',
            '#f8b500', '#00b4db', '#ff8b94', '#a8e6cf', '#ffd3b6',
        ];

        // ── City search ───────────────────────────────────────────────────────────────
        async function searchCity() {
            const name = document.getElementById('cityInput').value.trim();
            if (!name) return;

            setStatus('Suche Stadt …', 'loading');

            try {
                const res = await fetch('api.php?action=geocode&city=' + encodeURIComponent(name));
                const data = await res.json();

                if (!Array.isArray(data) || data.length === 0) {
                    setStatus('Stadt nicht gefunden', 'error');
                    return;
                }

                // Prefer city/town results over others
                const best = data.find(r => ['city', 'town', 'municipality'].includes(r.addresstype ?? r.type)) ?? data[0];

                currentCity = {
                    name: best.display_name,
                    lat: parseFloat(best.lat),
                    lng: parseFloat(best.lon),
                    bbox: best.boundingbox.map(parseFloat), // [minLat, maxLat, minLon, maxLon]
                };

                document.getElementById('cityHint').textContent = best.display_name;

                map.fitBounds([
                    [currentCity.bbox[0], currentCity.bbox[2]],
                    [currentCity.bbox[1], currentCity.bbox[3]],
                ]);

                // Reload all active layers for new city
                const activeIds = Object.keys(activeLayers);
                clearAllLayers();
                for (const id of activeIds) {
                    const cb = document.getElementById('lyr-' + id);
                    if (cb) cb.checked = true;
                    await loadLayer(id);
                }

                setStatus('Karte: ' + best.display_name.split(',')[0], 'ok');
            } catch (e) {
                setStatus('Fehler: ' + e.message, 'error');
            }
        }

        // ── Layer management ──────────────────────────────────────────────────────────
        async function toggleLayer(id, enabled) {
            if (enabled) {
                if (!currentCity) await searchCity();
                await loadLayer(id);
            } else {
                removeLayer(id);
            }
        }

        async function loadLayer(id) {
            if (!currentCity) return;

            const def = LAYER_DEFS[id];
            if (!def) return;

            const cntEl = document.getElementById('cnt-' + id);
            if (cntEl) cntEl.textContent = '…';
            setStatus('Lade ' + def.label + ' …', 'loading');

            try {
                const query = def.buildQuery(currentCity.bbox);
                const res = await fetch('api.php?action=overpass', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'query=' + encodeURIComponent(query),
                });
                const data = await res.json();

                if (data.error) throw new Error(data.error);

                removeLayer(id);
                const leafletLayers = def.render(id, data, def);
                activeLayers[id] = leafletLayers;
                leafletLayers.forEach(l => l.addTo(map));

                const n = data.elements?.length ?? 0;
                if (cntEl) cntEl.textContent = n > 0 ? `(${n})` : '';
                setStatus(def.label + ' geladen', 'ok');
            } catch (e) {
                if (cntEl) cntEl.textContent = '✗';
                setStatus('Fehler – Details im Popup', 'error');
                showErrorPopup(`Layer: ${def.label}\n\n${e.message}`);
                console.error('[layer:' + id + ']', e);
            }
        }

        function removeLayer(id) {
            if (activeLayers[id]) {
                activeLayers[id].forEach(l => map.removeLayer(l));
                delete activeLayers[id];
            }
            const cntEl = document.getElementById('cnt-' + id);
            if (cntEl) cntEl.textContent = '';
        }

        function clearAllLayers() {
            Object.keys(activeLayers).forEach(removeLayer);
            document.querySelectorAll('[id^="lyr-"]').forEach(cb => cb.checked = false);
        }

        // ── PLZ renderer ──────────────────────────────────────────────────────────────
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

                const plz = feat.properties?.postal_code ??
                    feat.properties?.['addr:postcode'] ??
                    feat.properties?.name ??
                    '?';
                const color = PLZ_COLORS[ci++ % PLZ_COLORS.length];

                const poly = L.geoJSON(feat, {
                    style: {
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.18,
                        weight: 2,
                        opacity: 0.85,
                    },
                });

                poly.on('mouseover', function() {
                    this.setStyle({
                        fillOpacity: 0.45
                    });
                });
                poly.on('mouseout', function() {
                    this.setStyle({
                        fillOpacity: 0.18
                    });
                });
                poly.bindPopup(`<div class="popup-name">PLZ ${plz}</div>`);

                result.push(poly);

                // PLZ label at bounding-box center
                try {
                    const bounds = poly.getBounds();
                    if (bounds.isValid()) {
                        const label = L.marker(bounds.getCenter(), {
                            icon: L.divIcon({
                                className: 'plz-label',
                                html: plz,
                                iconSize: [60, 20],
                                iconAnchor: [30, 10],
                            }),
                            interactive: false,
                            zIndexOffset: 100,
                        });
                        result.push(label);
                    }
                } catch (_) {}
            });

            return result;
        }

        // ── POI renderer ──────────────────────────────────────────────────────────────
        function renderPOIs(id, data, def) {
            const result = [];

            (data.elements ?? []).forEach(el => {
                let lat, lng;
                if (el.type === 'node') {
                    lat = el.lat;
                    lng = el.lon;
                } else if (el.center) {
                    lat = el.center.lat;
                    lng = el.center.lon;
                } else {
                    return;
                }

                const name = el.tags?.name ?? el.tags?.['name:de'] ?? def.label;
                const type = el.tags?.amenity ?? el.tags?.railway ??
                    el.tags?.tourism ?? el.tags?.leisure ??
                    el.tags?.historic ?? el.tags?.shop ?? '';

                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: def.color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9,
                    ...(def.markerOpts ?? {}),
                });

                marker.bindPopup(`
            <div class="popup-name">${def.icon ?? '📌'} ${esc(name)}</div>
            <div class="popup-type">${esc(type)}</div>
            <div class="popup-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        `);

                marker.on('click', () => {
                    clickedPoint = L.latLng(lat, lng);
                    document.getElementById('clickCoords').textContent =
                        `📍 ${lat.toFixed(6)},  ${lng.toFixed(6)}`;
                    setStatus(`Mittelpunkt: ${name}`, 'ok');
                });

                result.push(marker);
            });

            return result;
        }

        // ── Water renderer ────────────────────────────────────────────────────────────
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
                    style: {
                        color:       '#0369a1',
                        fillColor:   def.color,
                        fillOpacity: 0.35,
                        weight:      2.5,
                        opacity:     1,
                    },
                });
                if (name) {
                    poly.bindPopup(`<div class="popup-name">💧 ${esc(name)}</div>`);
                }
                result.push(poly);
            });
            return result;
        }

        // ── Radius tool ───────────────────────────────────────────────────────────────
        map.on('click', (e) => {
            if (measMode === 'A') {
                measA = e.latlng;
                measMode = 'B';
                const mA = L.marker(measA, {
                    icon: measIcon('A')
                }).addTo(map);
                measLayers.push(mA);
                setStatus('Punkt B auf der Karte setzen', 'loading');
                return;
            }
            if (measMode === 'B') {
                measB = e.latlng;
                measMode = null;
                const mB = L.marker(measB, {
                    icon: measIcon('B')
                }).addTo(map);
                const line = L.polyline([measA, measB], {
                    color: '#f0883e',
                    weight: 2.5,
                    dashArray: '7 5',
                }).addTo(map);
                const km = haversineKm(measA, measB);
                const {
                    deg,
                    dir
                } = calcBearing(measA, measB);
                const midLat = (measA.lat + measB.lat) / 2;
                const midLng = (measA.lng + measB.lng) / 2;
                const lineLabel = L.marker([midLat, midLng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="meas-line-label">${fmtDist(km)} &nbsp;·&nbsp; ${deg}° ${dir}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 11],
                    }),
                    interactive: false,
                }).addTo(map);
                measLayers.push(mB, line, lineLabel);
                document.getElementById('measResult').innerHTML =
                    `<strong>${fmtDist(km)}</strong> &nbsp;·&nbsp; ${deg}° ${dir}`;
                document.getElementById('measBtn').textContent = 'Messen starten';
                document.getElementById('measBtn').classList.remove('meas-active');
                setStatus('Messung abgeschlossen', 'ok');
                return;
            }
            clickedPoint = e.latlng;
            document.getElementById('clickCoords').textContent =
                `📍 ${e.latlng.lat.toFixed(6)},  ${e.latlng.lng.toFixed(6)}`;
        });

        function useManualCoords() {
            const lat = parseFloat(document.getElementById('manualLat').value.trim().replace(',', '.'));
            const lng = parseFloat(document.getElementById('manualLng').value.trim().replace(',', '.'));
            if (isNaN(lat) || isNaN(lng)) {
                setStatus('Ungültige Koordinaten', 'error');
                return;
            }
            clickedPoint = L.latLng(lat, lng);
            document.getElementById('clickCoords').textContent =
                `📍 ${lat.toFixed(6)},  ${lng.toFixed(6)}`;
            map.setView(clickedPoint, Math.max(map.getZoom(), 13));
        }

        function setRadiusMode(mode) {
            radiusMode = mode;
            document.getElementById('modeSingle').style.display   = mode === 'single'   ? '' : 'none';
            document.getElementById('modeInterval').style.display = mode === 'interval' ? '' : 'none';
            document.getElementById('tabSingle').className   = mode === 'single'   ? '' : 'ghost';
            document.getElementById('tabInterval').className = mode === 'interval' ? '' : 'ghost';
        }

        // East-edge position for km-label placement
        function radiusLabelPos(center, km) {
            const R  = 6371;
            const d  = km / R;
            const φ1 = center.lat * Math.PI / 180;
            const λ1 = center.lng * Math.PI / 180;
            const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d));
            const λ2 = λ1 + Math.atan2(Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
            return L.latLng(φ2 * 180 / Math.PI, λ2 * 180 / Math.PI);
        }

        function makeKmLabel(center, km, color) {
            return L.marker(radiusLabelPos(center, km), {
                icon: L.divIcon({
                    className: 'radius-km-label',
                    html: `<span style="background:${color}">${fmtDistShort(km)}</span>`,
                    iconSize:   null,
                    iconAnchor: [0, 9],
                }),
                interactive:  false,
                zIndexOffset: 300,
            });
        }

        function addRadiusListEntry(id, desc, center, dotColor, outerCircle) {
            const list = document.getElementById('radiusList');
            const item = document.createElement('div');
            item.className = 'radius-item';
            item.id = 'ri-' + id;
            item.innerHTML = `
                <div class="dot" style="background:${dotColor};flex-shrink:0"></div>
                <div class="ri-info">
                    <div>${desc}</div>
                    <div class="ri-lat">${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}</div>
                </div>
                <button class="danger" onclick="removeRadius(${id})" title="Entfernen">✕</button>
            `;
            item.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                map.fitBounds(outerCircle.getBounds());
            });
            list.appendChild(item);
        }

        function drawRadius() {
            if (!clickedPoint) {
                setStatus('Erst einen Punkt auf der Karte klicken', 'error');
                return;
            }

            const id  = ++radiusCounter;
            const hue = (id * 67) % 360;

            if (radiusMode === 'single') {
                const inputVal = parseFloat(document.getElementById('radiusKm').value);
                if (isNaN(inputVal) || inputVal <= 0) { setStatus('Ungültiger Radius', 'error'); return; }
                const km     = toKm(inputVal);
                const color  = `hsl(${hue},80%,55%)`;
                const circle = L.circle(clickedPoint, {
                    radius: km * 1000, color: '#000', fillColor: color,
                    fillOpacity: 0.30, weight: 3, dashArray: '8 5',
                }).addTo(map);
                const center = L.circleMarker(clickedPoint, {
                    radius: 5, fillColor: color, color: '#000', weight: 2, fillOpacity: 1,
                }).addTo(map);
                const label = makeKmLabel(clickedPoint, km, color).addTo(map);
                radiusItems[id] = { layers: [circle, center, label], outerCircle: circle };
                addRadiusListEntry(id, `${fmtDistShort(km)} Radius`, clickedPoint, color, circle);
                setStatus(`Radius gezeichnet: ${fmtDistShort(km)}`, 'ok');

            } else {
                const inputStep = parseFloat(document.getElementById('intervalStep').value);
                const count     = parseInt(document.getElementById('intervalCount').value);
                if (isNaN(inputStep) || inputStep <= 0 || isNaN(count) || count < 1) {
                    setStatus('Ungültige Intervall-Werte', 'error'); return;
                }
                const step = toKm(inputStep);
                const layers = [];
                let outerCircle;
                for (let i = 1; i <= count; i++) {
                    const km    = step * i;
                    const color = INTERVAL_COLORS[(i - 1) % INTERVAL_COLORS.length];
                    const circle = L.circle(clickedPoint, {
                        radius: km * 1000, color: '#000', fillColor: color,
                        fillOpacity: 0.12, weight: 2, dashArray: '6 4',
                    }).addTo(map);
                    const label = makeKmLabel(clickedPoint, km, color).addTo(map);
                    layers.push(circle, label);
                    outerCircle = circle;
                }
                const centerDot = L.circleMarker(clickedPoint, {
                    radius: 5, fillColor: '#fff', color: '#000', weight: 2, fillOpacity: 1,
                }).addTo(map);
                layers.push(centerDot);
                radiusItems[id] = { layers, outerCircle };
                addRadiusListEntry(id, `${count}× ${fmtDistShort(step)} Intervall`, clickedPoint, INTERVAL_COLORS[0], outerCircle);
                setStatus(`Intervall gezeichnet: ${count} Ringe à ${fmtDistShort(step)}`, 'ok');
            }
        }

        function removeRadius(id) {
            if (!radiusItems[id]) return;
            radiusItems[id].layers.forEach(l => map.removeLayer(l));
            delete radiusItems[id];
            document.getElementById('ri-' + id)?.remove();
        }

        function clearAllRadii() {
            Object.keys(radiusItems).forEach(id => removeRadius(Number(id)));
        }

        // ── Distanz & Richtung ────────────────────────────────────────────────────────
        function measIcon(letter) {
            return L.divIcon({
                className: 'meas-icon',
                html: letter,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
            });
        }

        function haversineKm(a, b) {
            const R = 6371;
            const dLat = (b.lat - a.lat) * Math.PI / 180;
            const dLng = (b.lng - a.lng) * Math.PI / 180;
            const x = Math.sin(dLat / 2) ** 2 +
                Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
                Math.sin(dLng / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
        }

        function calcBearing(a, b) {
            const lat1 = a.lat * Math.PI / 180;
            const lat2 = b.lat * Math.PI / 180;
            const dLng = (b.lng - a.lng) * Math.PI / 180;
            const y = Math.sin(dLng) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
            const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
            const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
            return {
                deg: Math.round(deg),
                dir: dirs[Math.round(deg / 45) % 8]
            };
        }

        function toggleMeasure() {
            if (measMode !== null) {
                clearMeasure();
            } else {
                measMode = 'A';
                measA = null;
                measB = null;
                clearMeasLayers();
                document.getElementById('measResult').textContent = '';
                document.getElementById('measBtn').textContent = 'Abbrechen';
                document.getElementById('measBtn').classList.add('meas-active');
                setStatus('Punkt A auf der Karte setzen', 'loading');
            }
        }

        function clearMeasure() {
            measMode = null;
            clearMeasLayers();
            document.getElementById('measResult').textContent = '';
            document.getElementById('measBtn').textContent = 'Messen starten';
            document.getElementById('measBtn').classList.remove('meas-active');
            setStatus('Bereit', '');
        }

        function clearMeasLayers() {
            measLayers.forEach(l => map.removeLayer(l));
            measLayers = [];
        }

        // ── Helpers ───────────────────────────────────────────────────────────────────
        function setStatus(msg, type = '') {
            const el = document.getElementById('status');
            el.textContent = msg;
            el.className = type;
        }

        function esc(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        // ── Error popup ───────────────────────────────────────────────────────────────
        function showErrorPopup(msg) {
            document.getElementById('errorText').textContent = msg;
            document.getElementById('errorCopyBtn').textContent = '📋 Fehlertext kopieren';
            const overlay = document.getElementById('errorOverlay');
            overlay.style.display = 'flex';
        }

        function closeErrorPopup() {
            document.getElementById('errorOverlay').style.display = 'none';
        }

        function copyErrorText() {
            const text = document.getElementById('errorText').textContent;
            navigator.clipboard.writeText(text).then(() => {
                document.getElementById('errorCopyBtn').textContent = '✅ Kopiert!';
                setTimeout(() => {
                    document.getElementById('errorCopyBtn').textContent = '📋 Fehlertext kopieren';
                }, 2000);
            });
        }

        document.getElementById('errorOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('errorOverlay')) closeErrorPopup();
        });

        // ── Keyboard: Enter in city input ─────────────────────────────────────────────
        document.getElementById('cityInput')
            .addEventListener('keydown', e => {
                if (e.key === 'Enter') searchCity();
            });

        // ── Init ──────────────────────────────────────────────────────────────────────
        searchCity();
    </script>
</body>

</html>