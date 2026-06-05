'use strict';

// ── POI type definitions ──────────────────────────────────────────────────────
// relQ: relations werden separat abgefragt da `out center` für relations
// Koordinaten liefert (wichtig für große Krankenhäuser, Museen etc. in OSM)
const TENT_TYPES = {
    museum:    { label: 'Museums',          icon: '🏛️',
                 nodeQ: '"tourism"="museum"',                     wayQ: '"tourism"="museum"',         relQ: '"tourism"="museum"' },
    station:   { label: 'Train Stations',   icon: '🚉',
                 nodeQ: '"railway"~"^(station|halt|tram_stop)$"', wayQ: null,                         relQ: null },
    hospital:  { label: 'Hospitals',        icon: '🏥',
                 nodeQ: '"amenity"="hospital"',                   wayQ: '"amenity"="hospital"',       relQ: '"amenity"="hospital"' },
    cinema:    { label: 'Cinema',           icon: '🎬',
                 nodeQ: '"amenity"="cinema"',                     wayQ: '"amenity"="cinema"',         relQ: '"amenity"="cinema"' },
    library:   { label: 'Libraries',        icon: '📚',
                 nodeQ: '"amenity"="library"',                    wayQ: '"amenity"="library"',        relQ: '"amenity"="library"' },
    zoo:       { label: 'Zoos',             icon: '🦁',
                 nodeQ: '"tourism"="zoo"',                        wayQ: '"tourism"="zoo"',            relQ: '"tourism"="zoo"' },
    aquarium:  { label: 'Aquariums',        icon: '🐠',
                 nodeQ: '"tourism"="aquarium"',                   wayQ: '"tourism"="aquarium"',       relQ: '"tourism"="aquarium"' },
    amusement: { label: 'Amusement Parks',  icon: '🎡',
                 nodeQ: '"leisure"="amusement_park"',             wayQ: '"leisure"="amusement_park"', relQ: '"leisure"="amusement_park"' },
    golf:      { label: 'Golf Courses',     icon: '⛳',
                 nodeQ: '"leisure"="golf_course"',                wayQ: '"leisure"="golf_course"',    relQ: '"leisure"="golf_course"' },
};

// ── Module state ──────────────────────────────────────────────────────────────
let _tentQuestions = [];
let _tentNextId    = 1;
let _tentPickingId = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function _tentKm(q) {
    return q.unit === 'mi' ? q.radius * 1.60934 : q.radius;
}

function _tentBuildQuery(type, lat, lng, radiusM) {
    const td = TENT_TYPES[type];
    const a  = `around:${Math.ceil(radiusM)},${lat},${lng}`;
    const lines = [];
    if (td.nodeQ) lines.push(`  node(${a})[${td.nodeQ}];`);
    if (td.wayQ)  lines.push(`  way(${a})[${td.wayQ}];`);
    if (td.relQ)  lines.push(`  relation(${a})[${td.relQ}];`);
    return `[out:json][timeout:60];\n(\n${lines.join('\n')}\n);\nout center tags;`;
}

// ── Map click hook for center-point picking ───────────────────────────────────
addMapClickHook((e) => {
    if (_tentPickingId === null) return false;
    const id = _tentPickingId;
    _tentPickingId = null;
    const q = _tentQuestions.find(x => x.id === id);
    if (!q) return false;

    q.centerLat = e.latlng.lat;
    q.centerLng = e.latlng.lng;

    const coordEl = document.getElementById(`tent-coord-${id}`);
    if (coordEl) coordEl.textContent =
        `${q.centerLat.toFixed(5)}° N  ${q.centerLng.toFixed(5)}° E`;

    document.getElementById(`tent-pick-btn-${id}`)?.classList.remove('meas-active');
    setStatus('', '');
    _tentFetchPOIs(id);
    return true;
});

// ── Fetch POIs from Overpass ──────────────────────────────────────────────────
async function _tentFetchPOIs(id) {
    const q = _tentQuestions.find(x => x.id === id);
    if (!q || q.centerLat === null) return;

    const radiusKm = _tentKm(q);
    const query    = _tentBuildQuery(q.poiType, q.centerLat, q.centerLng, radiusKm * 1000);

    const sel = document.getElementById(`tent-poi-select-${id}`);
    if (sel) { sel.innerHTML = '<option>Loading…</option>'; sel.disabled = true; }
    setStatus(`Loading ${TENT_TYPES[q.poiType].label}…`, 'loading');

    try {
        const data = await overpassFetch(query);
        const raw  = (data.elements ?? [])
            .map(el => {
                const c = getElementCenter(el);
                if (!c) return null;
                return { name: el.tags?.name ?? '?', lat: c.lat, lng: c.lng, id: el.id };
            })
            .filter(Boolean)
            .filter(p => haversineKm({ lat: q.centerLat, lng: q.centerLng }, p) <= radiusKm);

        // Deduplicate by name (keep first occurrence, sorted alphabetically)
        const seen = new Set();
        q.fetchedPOIs = raw
            .filter(p => { if (seen.has(p.name)) return false; seen.add(p.name); return true; })
            .sort((a, b) => a.name.localeCompare(b.name));

        if (sel) {
            sel.innerHTML = '<option value="">– Select POI –</option>' +
                q.fetchedPOIs.map(p =>
                    `<option value="${p.id}"${q.selectedPOI?.id === p.id ? ' selected' : ''}>${esc(p.name)}</option>`
                ).join('');
            sel.disabled = false;
        }
        setStatus(`${q.fetchedPOIs.length} ${TENT_TYPES[q.poiType].label} found`, 'ok');
    } catch (err) {
        if (sel) { sel.innerHTML = '<option value="">Error</option>'; sel.disabled = false; }
        showErrorPopup(err.message);
        setStatus('Error loading POIs', 'error');
    }
}

// ── Geodesically-correct Voronoi via equirectangular projection ───────────────
// turf.voronoi works in Euclidean (x,y) space. Geographic lat/lng is NOT
// Euclidean: a degree of longitude is shorter than a degree of latitude by cos(lat).
// Fix: project to local km coords → compute Voronoi → reproject to lat/lng.
function _tentProjectedVoronoi(pois, centerLat, centerLng, radiusKm) {
    const KM_PER_DEG = 111;
    const cosLat = Math.cos(centerLat * Math.PI / 180);

    // Project each POI to local km plane centered on (centerLat, centerLng)
    const proj = pois.map(p => ({
        id: p.id,
        px: (p.lng - centerLng) * cosLat * KM_PER_DEG,
        py: (p.lat - centerLat) * KM_PER_DEG,
    }));

    const turfPts = turf.featureCollection(
        proj.map(p => turf.point([p.px, p.py], { id: p.id }))
    );

    const ext     = radiusKm * 2.5;
    const voronoi = turf.voronoi(turfPts, { bbox: [-ext, -ext, ext, ext] });
    if (!voronoi?.features) return null;

    // Reproject polygon vertices back to lat/lng
    return turf.featureCollection(
        voronoi.features.map(f => {
            if (!f?.geometry?.coordinates) return null;
            return turf.polygon(
                f.geometry.coordinates.map(ring =>
                    ring.map(([px, py]) => [
                        centerLng + px / (cosLat * KM_PER_DEG),
                        centerLat + py / KM_PER_DEG,
                    ])
                ),
                f.properties
            );
        }).filter(Boolean)
    );
}

// ── Compute Voronoi and draw tentacle polygon ─────────────────────────────────
async function _tentDraw(id) {
    const q = _tentQuestions.find(x => x.id === id);
    if (!q || !q.selectedPOI || q.fetchedPOIs.length === 0) return;

    _tentClearLayers(q);

    const radiusKm = _tentKm(q);
    const circle   = turf.circle([q.centerLng, q.centerLat], radiusKm, {
        units: 'kilometers', steps: 128,
    });

    if (q.fetchedPOIs.length === 1) {
        // Only one POI in radius → the entire circle belongs to it
        q.layers.push(
            L.geoJSON(circle, {
                style: { color: '#3b82f6', weight: 2.5, fillColor: '#3b82f6', fillOpacity: 0.18 },
            }).addTo(map)
        );
    } else {
        const voronoi = _tentProjectedVoronoi(
            q.fetchedPOIs, q.centerLat, q.centerLng, radiusKm
        );
        if (!voronoi?.features?.length) return;

        const selIdx = q.fetchedPOIs.findIndex(p => p.id === q.selectedPOI.id);

        voronoi.features.forEach((cell, i) => {
            if (!cell) return;
            let clipped = null;
            try { clipped = turf.intersect(cell, circle); } catch { return; }
            if (!clipped) return;

            const isSel = (i === selIdx);
            q.layers.push(
                L.geoJSON(clipped, {
                    style: {
                        color:       '#3b82f6',
                        weight:      isSel ? 2.5 : 1.5,
                        fillColor:   '#3b82f6',
                        fillOpacity: isSel ? 0.18 : 0,
                        dashArray:   isSel ? undefined : '6 4',
                    },
                }).addTo(map)
            );
        });
    }

    // Center dot
    q.layers.push(
        L.circleMarker([q.centerLat, q.centerLng], {
            radius: 5, color: '#3b82f6', fillColor: '#3b82f6',
            fillOpacity: 1, weight: 2, interactive: false,
        }).addTo(map)
    );

    // POI markers
    const icon = TENT_TYPES[q.poiType].icon;
    q.fetchedPOIs.forEach(p => {
        const isSel = (p.id === q.selectedPOI?.id);
        q.layers.push(
            L.circleMarker([p.lat, p.lng], {
                radius:      isSel ? 8 : 5,
                color:       '#fff',
                fillColor:   isSel ? '#3b82f6' : '#6b7280',
                fillOpacity: 0.9,
                weight:      2,
            })
            .bindPopup(`<div class="popup-name">${icon} ${esc(p.name)}</div>`)
            .addTo(map)
        );
    });
}

// ── Clear all map layers for a question ───────────────────────────────────────
function _tentClearLayers(q) {
    q.layers.forEach(l => map.removeLayer(l));
    q.layers = [];
}

// ── Public API ────────────────────────────────────────────────────────────────

function addTentacleQuestion() {
    const id = _tentNextId++;
    _tentQuestions.push({
        id,
        radius:      15,
        unit:        'km',
        poiType:     'museum',
        centerLat:   null,
        centerLng:   null,
        selectedPOI: null,
        fetchedPOIs: [],
        layers:      [],
    });
    _tentRenderCards();
}

function removeTentacleQuestion(id) {
    const idx = _tentQuestions.findIndex(x => x.id === id);
    if (idx === -1) return;
    _tentClearLayers(_tentQuestions[idx]);
    _tentQuestions.splice(idx, 1);
    _tentRenderCards();
}

function tentSetRadius(id, val) {
    const q = _tentQuestions.find(x => x.id === id);
    if (!q) return;
    q.radius = parseFloat(val) || 15;
    if (q.centerLat !== null) _tentFetchPOIs(id);
}

function tentSetUnit(id, unit) {
    const q = _tentQuestions.find(x => x.id === id);
    if (!q) return;
    q.unit = unit;
    if (q.centerLat !== null) _tentFetchPOIs(id);
}

function tentSetType(id, type) {
    const q = _tentQuestions.find(x => x.id === id);
    if (!q) return;
    q.poiType    = type;
    q.selectedPOI = null;
    q.fetchedPOIs = [];
    _tentClearLayers(q);
    const sel = document.getElementById(`tent-poi-select-${id}`);
    if (sel) sel.innerHTML = '<option value="">– Set center first –</option>';
    if (q.centerLat !== null) _tentFetchPOIs(id);
}

function tentStartPick(id) {
    _tentPickingId = id;
    document.getElementById(`tent-pick-btn-${id}`)?.classList.add('meas-active');
    setStatus('Click on the map to set the tentacle center point', 'loading');
}

function tentSelectPOI(id, val) {
    const q = _tentQuestions.find(x => x.id === id);
    if (!q) return;
    q.selectedPOI = q.fetchedPOIs.find(p => String(p.id) === String(val)) ?? null;
    if (q.selectedPOI) _tentDraw(id);
    else _tentClearLayers(q);
}

// ── Render question cards ─────────────────────────────────────────────────────
function _tentRenderCards() {
    const el = document.getElementById('tentacleCards');
    if (!el) return;

    el.innerHTML = _tentQuestions.map((q, i) => {
        const typeOpts = Object.entries(TENT_TYPES)
            .map(([k, v]) =>
                `<option value="${k}"${k === q.poiType ? ' selected' : ''}>${v.label}</option>`
            ).join('');

        const poiOpts = q.fetchedPOIs.length
            ? '<option value="">– Select –</option>' +
              q.fetchedPOIs.map(p =>
                  `<option value="${p.id}"${q.selectedPOI?.id === p.id ? ' selected' : ''}>${esc(p.name)}</option>`
              ).join('')
            : '<option value="">– Set center first –</option>';

        const coordTxt = q.centerLat !== null
            ? `${q.centerLat.toFixed(5)}° N  ${q.centerLng.toFixed(5)}° E`
            : '– click 📍 to set center –';

        return `
<div class="tent-card" id="tent-${q.id}">
  <div class="tent-card-hdr">
    <span class="tent-card-title">Tentacles ${i + 1}</span>
    <button class="ghost tent-card-del" onclick="removeTentacleQuestion(${q.id})" title="Remove">✕</button>
  </div>
  <div class="row" style="margin-bottom:6px">
    <input type="number" value="${q.radius}" min="1" max="9999" step="1" style="max-width:70px"
      onchange="tentSetRadius(${q.id}, this.value)">
    <select style="flex:1" onchange="tentSetUnit(${q.id}, this.value)">
      <option value="km"${q.unit === 'km' ? ' selected' : ''}>Kilometers</option>
      <option value="mi"${q.unit === 'mi' ? ' selected' : ''}>Miles</option>
    </select>
  </div>
  <select style="margin-bottom:6px" onchange="tentSetType(${q.id}, this.value)">
    ${typeOpts}
  </select>
  <button id="tent-pick-btn-${q.id}" class="tent-pick-btn" onclick="tentStartPick(${q.id})">
    📍 Location
  </button>
  <div id="tent-coord-${q.id}" class="tent-coord">${esc(coordTxt)}</div>
  <select id="tent-poi-select-${q.id}" onchange="tentSelectPOI(${q.id}, this.value)">
    ${poiOpts}
  </select>
</div>`;
    }).join('');
}
