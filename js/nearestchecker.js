'use strict';

// ── NC_LAYER_FILTERS ──────────────────────────────────────────────────────────
// Maps each layer key to:
//   filters  – Overpass tag-filter strings appended to node/way(around:...)
//   match    – returns true if an OSM element belongs to this layer type
//
// Layers whose POIs cannot meaningfully be "nearest" (coastline, water, plz …)
// simply have no entry here and are silently skipped.
const NC_LAYER_FILTERS = {
    hospitals:     {
        filters: ['["amenity"="hospital"]'],
        match:   el => el.tags?.amenity === 'hospital',
    },
    stations:      {
        filters: ['["railway"~"^(station|halt|tram_stop)$"]', '["amenity"="bus_station"]'],
        match:   el => /^(station|halt|tram_stop)$/.test(el.tags?.railway) || el.tags?.amenity === 'bus_station',
    },
    cinema:        {
        filters: ['["amenity"="cinema"]'],
        match:   el => el.tags?.amenity === 'cinema',
    },
    zoo:           {
        filters: ['["tourism"="zoo"]'],
        match:   el => el.tags?.tourism === 'zoo',
    },
    aquarium:      {
        filters: ['["tourism"="aquarium"]'],
        match:   el => el.tags?.tourism === 'aquarium',
    },
    golf:          {
        filters: ['["leisure"="golf_course"]'],
        match:   el => el.tags?.leisure === 'golf_course',
    },
    museum:        {
        filters: ['["tourism"="museum"]'],
        match:   el => el.tags?.tourism === 'museum',
    },
    amusementpark: {
        filters: ['["leisure"="amusement_park"]'],
        match:   el => el.tags?.leisure === 'amusement_park',
    },
    library:       {
        filters: ['["amenity"="library"]'],
        match:   el => el.tags?.amenity === 'library',
    },
    airports:      {
        filters: ['["aeroway"="aerodrome"]["iata"]'],
        match:   el => el.tags?.aeroway === 'aerodrome' && !!el.tags?.iata,
    },
    airfields:     {
        filters: ['["aeroway"="aerodrome"][!"iata"]["military"!="airfield"]'],
        match:   el => el.tags?.aeroway === 'aerodrome' && !el.tags?.iata && el.tags?.military !== 'airfield',
    },
    consulate:     {
        filters: ['["amenity"="consulate"]'],
        match:   el => el.tags?.amenity === 'consulate',
    },
    embassy:       {
        filters: ['["amenity"="embassy"]'],
        match:   el => el.tags?.amenity === 'embassy',
    },
    parks:         {
        filters: ['["leisure"="park"]["name"]'],
        match:   el => el.tags?.leisure === 'park' && !!el.tags?.name,
    },
    stadium:       {
        filters: ['["leisure"="stadium"]'],
        match:   el => el.tags?.leisure === 'stadium',
    },
    townhall:      {
        filters: ['["amenity"="townhall"]'],
        match:   el => el.tags?.amenity === 'townhall',
    },
    swimmingpool:  {
        filters: ['["leisure"="swimming_pool"]["name"]', '["amenity"="public_bath"]'],
        match:   el => (el.tags?.leisure === 'swimming_pool' && !!el.tags?.name) || el.tags?.amenity === 'public_bath',
    },
    police:        {
        filters: ['["amenity"="police"]'],
        match:   el => el.tags?.amenity === 'police',
    },
    firestation:   {
        filters: ['["amenity"="fire_station"]'],
        match:   el => el.tags?.amenity === 'fire_station',
    },
    attractions:   {
        filters: [
            '["tourism"~"^(attraction|monument|artwork|viewpoint|gallery)$"]',
            '["historic"~"^(castle|monument|memorial|ruins)$"]',
        ],
        match:   el => /^(attraction|monument|artwork|viewpoint|gallery)$/.test(el.tags?.tourism)
                    || /^(castle|monument|memorial|ruins)$/.test(el.tags?.historic),
    },
    shopping:      {
        filters: ['["shop"="mall"]'],
        match:   el => el.tags?.shop === 'mall',
    },
    cemetery:      {
        filters: ['["landuse"="cemetery"]', '["amenity"="grave_yard"]'],
        match:   el => el.tags?.landuse === 'cemetery' || el.tags?.amenity === 'grave_yard',
    },
    fastfood:      {
        filters: ['["amenity"="fast_food"]'],
        match:   el => el.tags?.amenity === 'fast_food',
    },
    busstops:      {
        filters: ['["highway"="bus_stop"]'],
        match:   el => el.tags?.highway === 'bus_stop',
    },
};

// ── State ─────────────────────────────────────────────────────────────────────
let ncPicking  = null;   // 'A' | 'B' | null
let ncMarkers  = [];

// ── Map-click picking ─────────────────────────────────────────────────────────

function ncStartPick(which) {
    // Cancel if already picking this point
    if (ncPicking === which) {
        ncPicking = null;
        document.getElementById('ncPick' + which).classList.remove('meas-active');
        setStatus(t('status_ready'), '');
        return;
    }
    // Cancel any previous pick
    if (ncPicking) document.getElementById('ncPick' + ncPicking).classList.remove('meas-active');
    ncPicking = which;
    document.getElementById('ncPick' + which).classList.add('meas-active');
    setStatus(t('status_nc_' + which.toLowerCase()), 'loading');
}

function ncHandleClick(e) {
    if (!ncPicking) return false;
    const { lat, lng } = e.latlng;
    const which = ncPicking;
    ncPicking = null;

    // Replace existing marker for this point
    ncMarkers = ncMarkers.filter(m => {
        if (m._ncPoint === which) { map.removeLayer(m); return false; }
        return true;
    });
    const m = L.marker([lat, lng], { icon: measIcon(which) }).addTo(map);
    m._ncPoint = which;
    ncMarkers.push(m);

    // Fill inputs
    document.getElementById('ncLat' + which).value = lat.toFixed(5);
    document.getElementById('ncLng' + which).value = lng.toFixed(5);

    document.getElementById('ncPick' + which).classList.remove('meas-active');
    setStatus(t('status_ready'), '');
    return true;
}
addMapClickHook(ncHandleClick);

// ── Clear ─────────────────────────────────────────────────────────────────────

function clearNearestChecker() {
    ncPicking = null;
    ncMarkers.forEach(m => map.removeLayer(m));
    ncMarkers = [];

    ['A', 'B'].forEach(w => {
        document.getElementById('ncLat' + w).value = '';
        document.getElementById('ncLng' + w).value = '';
        document.getElementById('ncPick' + w).classList.remove('meas-active');
    });
    document.getElementById('ncResult').innerHTML = '';
    setStatus(t('status_ready'), '');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ncReadPoint(which) {
    const lat = parseFloat(document.getElementById('ncLat' + which).value);
    const lng = parseFloat(document.getElementById('ncLng' + which).value);
    return (isNaN(lat) || isNaN(lng)) ? null : { lat, lng };
}

function ncFindNearest(point, elements) {
    let best = null, bestDist = Infinity;
    for (const el of elements) {
        const c = getElementCenter(el);
        if (!c) continue;
        const d = haversineKm(point, c);
        if (d < bestDist) { bestDist = d; best = el; }
    }
    return best ? { el: best, dist: bestDist } : null;
}

// Fetch elements for a single point, for all keys not yet in layerDataCache.
// Returns a map  key → element-array.
async function ncFetchForPoint(point, keysToFetch) {
    if (keysToFetch.length === 0) return {};

    const r      = 25000;
    const around = `around:${r},${point.lat},${point.lng}`;
    const lines  = [];
    for (const key of keysToFetch) {
        const def = NC_LAYER_FILTERS[key];
        if (!def) continue;
        for (const f of def.filters) {
            lines.push(`node(${around})${f};`);
            lines.push(`way(${around})${f};`);
        }
    }
    if (lines.length === 0) return {};

    const data     = await overpassFetch(`[out:json][timeout:60];\n(\n  ${lines.join('\n  ')}\n);\nout center tags;`);
    const allElems = data.elements ?? [];

    const result = {};
    for (const key of keysToFetch) {
        const def = NC_LAYER_FILTERS[key];
        result[key] = def ? allElems.filter(def.match) : [];
    }
    return result;
}

// For each active key, return elements from cache (preferred) or a fresh query.
//
// Cache logic:
//   layerDataCache[k] EXISTS (even with 0 elements) → layer was loaded for this city;
//     use the cached elements (may be empty if the city has none of that POI type).
//   layerDataCache[k] MISSING → layer never loaded / failed; fire a point-centred query.
//
// This prevents unnecessary Overpass queries for city-loaded layers and avoids
// re-querying when the city genuinely has no POIs of a given type.
async function ncGetElements(point, activeKeys) {
    const cached  = activeKeys.filter(k => k in layerDataCache);
    const toFetch = activeKeys.filter(k => !(k in layerDataCache));
    const fetched = await ncFetchForPoint(point, toFetch);
    const result  = {};
    for (const key of activeKeys) {
        result[key] = cached.includes(key)
            ? (layerDataCache[key]?.elements ?? [])
            : (fetched[key] ?? []);
    }
    return result;
}

// ── Main check ────────────────────────────────────────────────────────────────

async function runNearestCheck() {
    const ptA = ncReadPoint('A');
    const ptB = ncReadPoint('B');

    if (!ptA || !ptB) {
        document.getElementById('ncResult').innerHTML =
            `<div class="nc-result nc-miss">${t('nc_need_points')}</div>`;
        return;
    }

    // Collect checked layer keys that have NC support
    const activeKeys = Array.from(document.querySelectorAll('[id^="lyr-"]:checked'))
        .map(cb => cb.id.replace('lyr-', ''))
        .filter(key => key in NC_LAYER_FILTERS);

    const resultEl = document.getElementById('ncResult');

    if (activeKeys.length === 0) {
        resultEl.innerHTML =
            `<div class="nc-result nc-miss">${t('nc_no_layers')}</div>`;
        return;
    }

    // Disable run button while loading
    const btn = document.getElementById('ncBtn');
    btn.disabled = true;
    resultEl.innerHTML = `<div class="nc-loading">${t('nc_loading')}</div>`;
    setStatus(t('status_admin_loading'), 'loading');

    try {
        // Fetch sequentially to avoid Overpass rate-limiting with simultaneous requests.
        // Cached layers (already loaded via the layer panel) are returned instantly.
        const elemsByKeyA = await ncGetElements(ptA, activeKeys);
        const elemsByKeyB = await ncGetElements(ptB, activeKeys);

        let nMatch = 0, nMiss = 0;
        const rows = [];

        for (const key of activeKeys) {
            const def    = LAYER_DEFS[key];
            if (!def) continue;
            const icon   = def.icon ?? '📍';
            const label  = t(def.label);
            const nearA  = ncFindNearest(ptA, elemsByKeyA[key] ?? []);
            const nearB  = ncFindNearest(ptB, elemsByKeyB[key] ?? []);

            if (!nearA && !nearB) {
                rows.push(ncRowNoData(icon, label));
                continue;
            }

            const nameA  = nearA?.el.tags?.name ?? '?';
            const nameB  = nearB?.el.tags?.name ?? '?';
            const distA  = nearA ? fmtNearDist(nearA.dist) : '–';
            const distB  = nearB ? fmtNearDist(nearB.dist) : '–';
            const same   = !!(nearA && nearB &&
                haversineKm(getElementCenter(nearA.el), getElementCenter(nearB.el)) < 0.1);

            if (same) nMatch++; else nMiss++;
            rows.push(same
                ? ncRowMatch(icon, label, nameA, distA, distB)
                : ncRowMiss (icon, label, nameA, distA, nameB, distB));
        }

        const total = nMatch + nMiss;
        let summaryClass = '';
        if (total > 0) summaryClass = nMatch === total ? 'all-match' : nMiss === total ? 'no-match' : 'part-match';
        const summaryText = total === 0
            ? t('nc_no_data')
            : `${nMatch > 0 ? `✅ ${nMatch}` : ''}${nMatch > 0 && nMiss > 0 ? ' · ' : ''}${nMiss > 0 ? `❌ ${nMiss}` : ''}`;

        resultEl.innerHTML =
            `<div class="nc-summary ${summaryClass}">${summaryText}</div>${rows.join('')}`;
        setStatus(t('status_admin_done'), 'ok');
    } catch (err) {
        resultEl.innerHTML = `<div class="nc-result nc-miss">${t('status_err_popup')}</div>`;
        showErrorPopup(err.message);
        setStatus(t('status_err_popup'), 'error');
    } finally {
        btn.disabled = false;
    }
}

// ── Row builders ──────────────────────────────────────────────────────────────

function ncRowMatch(icon, label, name, distA, distB) {
    return `
<div class="nc-row">
    <span class="nc-st">✅</span>
    <span class="nc-ic">${icon}</span>
    <div class="nc-body">
        <div class="nc-lbl">${esc(label)}</div>
        <div class="nc-nm nc-nm-same">${esc(name)}<span class="nc-d">${distA} · ${distB}</span></div>
    </div>
</div>`;
}

function ncRowMiss(icon, label, nameA, distA, nameB, distB) {
    return `
<div class="nc-row">
    <span class="nc-st">❌</span>
    <span class="nc-ic">${icon}</span>
    <div class="nc-body">
        <div class="nc-lbl">${esc(label)}</div>
        <div class="nc-nm"><span class="nc-pa">A</span>${esc(nameA)}<span class="nc-d">${distA}</span></div>
        <div class="nc-nm"><span class="nc-pb">B</span>${esc(nameB)}<span class="nc-d">${distB}</span></div>
    </div>
</div>`;
}

function ncRowNoData(icon, label) {
    return `
<div class="nc-row nc-row-na">
    <span class="nc-st">·</span>
    <span class="nc-ic">${icon}</span>
    <div class="nc-body">
        <div class="nc-lbl">${esc(label)}</div>
        <div class="nc-nm nc-nm-na">–</div>
    </div>
</div>`;
}
