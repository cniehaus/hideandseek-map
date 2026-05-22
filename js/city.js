'use strict';

// ── Aktuell angezeigte Stadt ──────────────────────────────────────────────────
let currentCity = null;

// ── Einheiten-System (metric | imperial) ─────────────────────────────────────
let units = 'metric';

function toKm(v)         { return units === 'imperial' ? v * KM_PER_MILE : v; }
function fromKm(km)      { return units === 'imperial' ? km / KM_PER_MILE : km; }
function unitStr()       { return units === 'imperial' ? 'mi' : 'km'; }
function fmtDist(km)     { const v = fromKm(km); return `${v % 1 === 0 ? v : v.toFixed(2)} ${unitStr()}`; }
function fmtDistShort(km){ const v = fromKm(km); return `${v % 1 === 0 ? v : v.toFixed(1)} ${unitStr()}`; }

function setUnits(u) {
    units = u;
    document.getElementById('unitKm').className        = u === 'metric'   ? '' : 'ghost';
    document.getElementById('unitMi').className        = u === 'imperial' ? '' : 'ghost';
    document.getElementById('unitLabelRadius').textContent = tf('lbl_radius', unitStr());
    document.getElementById('unitLabelStep').textContent   = tf('lbl_step',   unitStr());
}

// ── Stadtsuche via Nominatim ──────────────────────────────────────────────────
async function searchCity() {
    const name = document.getElementById('cityInput').value.trim();
    if (!name) return;

    setStatus(t('status_searching'), 'loading');

    try {
        const res  = await fetch(
            'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
                q: name, format: 'json', limit: 5, addressdetails: 1,
            })
        );
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            setStatus(t('status_not_found'), 'error');
            return;
        }

        const best = data.find(r =>
            ['city', 'town', 'municipality'].includes(r.addresstype ?? r.type)
        ) ?? data[0];

        currentCity = {
            name: best.display_name,
            lat:  parseFloat(best.lat),
            lng:  parseFloat(best.lon),
            bbox: best.boundingbox.map(parseFloat),
        };

        document.getElementById('cityHint').textContent = best.display_name;

        map.fitBounds([
            [currentCity.bbox[0], currentCity.bbox[2]],
            [currentCity.bbox[1], currentCity.bbox[3]],
        ]);

        // Aktive Layer für neue Stadt neu laden
        const activeIds = Object.keys(activeLayers);
        clearAllLayers();
        for (const id of activeIds) {
            const cb = document.getElementById('lyr-' + id);
            if (cb) cb.checked = true;
            await loadLayer(id);
        }

        setStatus(tf('status_map', best.display_name.split(',')[0]), 'ok');
    } catch (e) {
        setStatus(tf('status_err', e.message), 'error');
    }
}
