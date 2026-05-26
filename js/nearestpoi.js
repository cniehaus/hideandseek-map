'use strict';

// POI types shown in the results table, in display order.
const NP_TYPES = [
    { key: 'hospitals',     icon: '🏥', label: 'lyr_hospitals',     match: t => t.amenity === 'hospital' },
    { key: 'stations',      icon: '🚉', label: 'lyr_stations',      match: t => /^(station|halt|tram_stop)$/.test(t.railway) || t.amenity === 'bus_station' },
    { key: 'cinema',        icon: '🎬', label: 'lyr_cinema',        match: t => t.amenity === 'cinema' },
    { key: 'museum',        icon: '🏛️', label: 'lyr_museum',        match: t => t.tourism === 'museum' },
    { key: 'zoo',           icon: '🦁', label: 'lyr_zoo',           match: t => t.tourism === 'zoo' },
    { key: 'aquarium',      icon: '🐠', label: 'lyr_aquarium',      match: t => t.tourism === 'aquarium' },
    { key: 'library',       icon: '📚', label: 'lyr_library',       match: t => t.amenity === 'library' },
    { key: 'amusementpark', icon: '🎡', label: 'lyr_amusementpark', match: t => t.leisure === 'amusement_park' },
    { key: 'golf',          icon: '⛳', label: 'lyr_golf',          match: t => t.leisure === 'golf_course' },
    { key: 'airports',      icon: '✈️', label: 'lyr_airports',      match: t => t.aeroway === 'aerodrome' && !!t.iata },
];

let npActive = false;
let npMarker = null;

function toggleNearestPOI() {
    npActive = !npActive;
    if (npActive) {
        document.getElementById('npBtn').textContent = t('btn_np_stop');
        document.getElementById('npBtn').classList.add('meas-active');
        setStatus(t('status_np_click'), 'loading');
    } else {
        clearNearestPOI();
    }
}

function clearNearestPOI() {
    npActive = false;
    if (npMarker) { map.removeLayer(npMarker); npMarker = null; }
    document.getElementById('npResult').innerHTML = '';
    document.getElementById('npBtn').textContent = t('btn_np_start');
    document.getElementById('npBtn').classList.remove('meas-active');
    setStatus(t('status_ready'), '');
}

// Registered via addMapClickHook; stays active until cancelled — each click
// re-runs the lookup for a new point without needing to press the button again.
function npHandleClick(e) {
    if (!npActive) return false;
    const { lat, lng } = e.latlng;

    if (npMarker) map.removeLayer(npMarker);
    npMarker = L.circleMarker([lat, lng], {
        radius: 8, color: '#f0883e', fillColor: '#f0883e', fillOpacity: 0.9, weight: 2,
    }).addTo(map);

    fetchNearestPOIs({ lat, lng });
    return true;
}

addMapClickHook(npHandleClick);

// ── Helpers ───────────────────────────────────────────────────────────────────

function npGetCenter(el) {
    if (el.type === 'node') return { lat: el.lat,        lng: el.lon };
    if (el.center)          return { lat: el.center.lat, lng: el.center.lon };
    if (el.bounds)          return {
        lat: (el.bounds.minlat + el.bounds.maxlat) / 2,
        lng: (el.bounds.minlon + el.bounds.maxlon) / 2,
    };
    return null;
}

// ── Main lookup ───────────────────────────────────────────────────────────────

async function fetchNearestPOIs(point) {
    const resultEl = document.getElementById('npResult');
    resultEl.innerHTML =
        `<div style="color:#8b949e;font-size:12px;padding:4px 0">${t('nc_loading')}</div>`;
    setStatus(t('status_admin_loading'), 'loading');

    const r = 25000;
    const a = `around:${r},${point.lat},${point.lng}`;
    const query = `[out:json][timeout:40];
(
  node(${a})["amenity"~"^(hospital|cinema|library|fast_food|bus_station)$"];
  node(${a})["tourism"~"^(museum|zoo|aquarium)$"];
  node(${a})["leisure"~"^(amusement_park|golf_course)$"];
  node(${a})["railway"~"^(station|halt|tram_stop)$"];
  node(${a})["aeroway"="aerodrome"]["iata"];
  way(${a})["amenity"~"^(hospital|cinema|library)$"];
  way(${a})["tourism"~"^(museum|zoo|aquarium)$"];
  way(${a})["leisure"~"^(amusement_park|golf_course)$"];
  way(${a})["aeroway"="aerodrome"]["iata"];
);
out center tags;`;

    try {
        const data = await overpassFetch(query);
        const elements = data.elements ?? [];

        const fmt = km => km < 1
            ? `${Math.round(km * 1000)} m`
            : `${km.toFixed(2)} km`;

        const rows = NP_TYPES.map(({ key, icon, label, match }) => {
            // Prefer already-loaded layer cache; fall back to freshly fetched elements
            const pool = layerDataCache[key]?.elements?.length
                ? layerDataCache[key].elements
                : elements.filter(el => match(el.tags ?? {}));

            let best = null, bestDist = Infinity;
            for (const el of pool) {
                const c = npGetCenter(el);
                if (!c) continue;
                const d = haversineKm(point, c);
                if (d < bestDist) { bestDist = d; best = el; }
            }

            if (!best) return `
                <div class="np-row np-na">
                    <span class="np-icon">${icon}</span>
                    <span class="np-label">${t(label)}</span>
                    <span class="np-dist">–</span>
                </div>`;

            const name = best.tags?.name ?? '?';
            return `
                <div class="np-row" title="${esc(name)}">
                    <span class="np-icon">${icon}</span>
                    <span class="np-label">${t(label)}</span>
                    <span class="np-name">${esc(name)}</span>
                    <span class="np-dist">${fmt(bestDist)}</span>
                </div>`;
        }).join('');

        resultEl.innerHTML = rows;
        setStatus(t('status_admin_done'), 'ok');
    } catch (err) {
        resultEl.innerHTML =
            `<div class="nc-result nc-miss">${t('status_err_popup')}</div>`;
        showErrorPopup(err.message);
        setStatus(t('status_err_popup'), 'error');
    }
}
