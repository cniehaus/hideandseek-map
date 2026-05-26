'use strict';

// POI types available for the "same nearest" check.
// filters: array of Overpass tag expressions used to build the around: query.
const NC_POI_TYPES = {
    hospitals:     { label: 'lyr_hospitals',     icon: '🏥', filters: ['"amenity"="hospital"'] },
    stations:      { label: 'lyr_stations',      icon: '🚉', filters: ['"railway"~"^(station|halt|tram_stop)$"', '"amenity"="bus_station"'] },
    cinema:        { label: 'lyr_cinema',        icon: '🎬', filters: ['"amenity"="cinema"'] },
    zoo:           { label: 'lyr_zoo',           icon: '🦁', filters: ['"tourism"="zoo"'] },
    aquarium:      { label: 'lyr_aquarium',      icon: '🐠', filters: ['"tourism"="aquarium"'] },
    golf:          { label: 'lyr_golf',          icon: '⛳', filters: ['"leisure"="golf_course"'] },
    museum:        { label: 'lyr_museum',        icon: '🏛️', filters: ['"tourism"="museum"'] },
    amusementpark: { label: 'lyr_amusementpark', icon: '🎡', filters: ['"leisure"="amusement_park"'] },
    library:       { label: 'lyr_library',       icon: '📚', filters: ['"amenity"="library"'] },
};

let ncActive  = false;
let ncPointA  = null;
let ncPointB  = null;
let ncMarkers = [];

function toggleNearestChecker() {
    ncActive = !ncActive;
    if (ncActive) {
        ncPointA = null;
        ncPointB = null;
        clearNcMarkers();
        document.getElementById('ncResult').innerHTML = '';
        document.getElementById('ncBtn').textContent = t('btn_nc_stop');
        document.getElementById('ncBtn').classList.add('meas-active');
        setStatus(t('status_nc_a'), 'loading');
    } else {
        clearNcMarkers();
        document.getElementById('ncBtn').textContent = t('btn_nc_start');
        document.getElementById('ncBtn').classList.remove('meas-active');
        setStatus(t('status_ready'), '');
    }
}

function clearNearestChecker() {
    ncActive  = false;
    ncPointA  = null;
    ncPointB  = null;
    clearNcMarkers();
    document.getElementById('ncResult').innerHTML = '';
    document.getElementById('ncBtn').textContent  = t('btn_nc_start');
    document.getElementById('ncBtn').classList.remove('meas-active');
    setStatus(t('status_ready'), '');
}

function clearNcMarkers() {
    ncMarkers.forEach(m => map.removeLayer(m));
    ncMarkers = [];
}

// Registered via addMapClickHook in map.js; returns true if click was consumed.
function ncHandleClick(e) {
    if (!ncActive) return false;
    const { lat, lng } = e.latlng;

    if (!ncPointA) {
        ncPointA = { lat, lng };
        ncMarkers.push(L.marker({ lat, lng }, { icon: measIcon('A') }).addTo(map));
        setStatus(t('status_nc_b'), 'loading');
        return true;
    }

    if (!ncPointB) {
        ncPointB = { lat, lng };
        ncMarkers.push(L.marker({ lat, lng }, { icon: measIcon('B') }).addTo(map));
        ncActive = false;
        document.getElementById('ncBtn').textContent = t('btn_nc_start');
        document.getElementById('ncBtn').classList.remove('meas-active');
        runNearestCheck();
        return true;
    }

    return false;
}

addMapClickHook(ncHandleClick);

// ── Helpers ───────────────────────────────────────────────────────────────────

function ncGetCenter(el) {
    if (el.type === 'node') return { lat: el.lat,        lng: el.lon };
    if (el.center)          return { lat: el.center.lat, lng: el.center.lon };
    if (el.bounds)          return {
        lat: (el.bounds.minlat + el.bounds.maxlat) / 2,
        lng: (el.bounds.minlon + el.bounds.maxlon) / 2,
    };
    return null;
}

function ncFindNearest(point, elements) {
    let best = null, bestDist = Infinity;
    for (const el of elements) {
        const c = ncGetCenter(el);
        if (!c) continue;
        const d = haversineKm(point, c);
        if (d < bestDist) { bestDist = d; best = el; }
    }
    return best ? { el: best, dist: bestDist } : null;
}

async function ncFetchElements(point, typeKey) {
    // Reuse already-loaded layer cache to avoid a second Overpass request.
    const cached = layerDataCache[typeKey];
    if (cached?.elements?.length) return cached.elements;

    const type   = NC_POI_TYPES[typeKey];
    const around = `around:25000,${point.lat},${point.lng}`;
    const lines  = type.filters.flatMap(f =>
        [`node(${around})[${f}];`, `way(${around})[${f}];`]
    ).join('\n  ');
    const data = await overpassFetch(
        `[out:json][timeout:30];\n(\n  ${lines}\n);\nout center tags;`
    );
    return data.elements ?? [];
}

// ── Main check ────────────────────────────────────────────────────────────────

async function runNearestCheck() {
    const typeKey  = document.getElementById('ncTypeSelect').value;
    const resultEl = document.getElementById('ncResult');
    resultEl.innerHTML =
        `<div style="color:#8b949e;font-size:12px;padding:4px 0">${t('nc_loading')}</div>`;
    setStatus(t('status_admin_loading'), 'loading');

    try {
        const [elemA, elemB] = await Promise.all([
            ncFetchElements(ncPointA, typeKey),
            ncFetchElements(ncPointB, typeKey),
        ]);

        const nearA = ncFindNearest(ncPointA, elemA);
        const nearB = ncFindNearest(ncPointB, elemB);

        if (!nearA || !nearB) {
            resultEl.innerHTML =
                `<div class="nc-result nc-miss">${t('nc_no_data')}</div>`;
            setStatus(t('status_ready'), '');
            return;
        }

        const nameA = nearA.el.tags?.name ?? '?';
        const nameB = nearB.el.tags?.name ?? '?';
        const same  = haversineKm(ncGetCenter(nearA.el), ncGetCenter(nearB.el)) < 0.1;
        const fmt   = km => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;

        resultEl.innerHTML = `
            <div class="nc-result ${same ? 'nc-match' : 'nc-miss'}">
                ${same ? '✅ ' + t('nc_same') : '❌ ' + t('nc_diff')}
            </div>
            <div class="nc-row">
                <span class="nc-label">A</span>
                <span class="nc-name">${esc(nameA)}</span>
                <span class="nc-dist">${fmt(nearA.dist)}</span>
            </div>
            <div class="nc-row">
                <span class="nc-label">B</span>
                <span class="nc-name">${esc(nameB)}</span>
                <span class="nc-dist">${fmt(nearB.dist)}</span>
            </div>`;
        setStatus(t('status_admin_done'), 'ok');
    } catch (err) {
        resultEl.innerHTML =
            `<div class="nc-result nc-miss">${t('status_err_popup')}</div>`;
        showErrorPopup(err.message);
        setStatus(t('status_err_popup'), 'error');
    }
}
