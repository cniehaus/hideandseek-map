'use strict';

// ── Zustand ───────────────────────────────────────────────────────────────────
let measMode   = null;   // null | 'A' | 'B'
let measA      = null;
let measB      = null;
let measLayers = [];

// ── Marker-Icon für Messpunkte ────────────────────────────────────────────────
function measIcon(letter) {
    return L.divIcon({
        className: 'meas-icon',
        html:      letter,
        iconSize:  [22, 22],
        iconAnchor:[11, 11],
    });
}

// ── Haversine-Formel: Entfernung in km ────────────────────────────────────────
function haversineKm(a, b) {
    const R    = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x    = Math.sin(dLat / 2) ** 2 +
                 Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
                 Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ── Peilung (Grad + Himmelsrichtung) ─────────────────────────────────────────
function calcBearing(a, b) {
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const y    = Math.sin(dLng) * Math.cos(lat2);
    const x    = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const deg  = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    const dirs = t('compass_dirs').split(',');
    return { deg: Math.round(deg), dir: dirs[Math.round(deg / 45) % 8] };
}

// ── Messen starten / abbrechen ────────────────────────────────────────────────
function toggleMeasure() {
    if (measMode !== null) {
        clearMeasure();
    } else {
        measMode = 'A';
        measA    = null;
        measB    = null;
        clearMeasLayers();
        document.getElementById('measResult').textContent = '';
        document.getElementById('measBtn').textContent    = t('btn_measure_stop');
        document.getElementById('measBtn').classList.add('meas-active');
        setStatus(t('status_point_a'), 'loading');
    }
}

function clearMeasure() {
    measMode = null;
    clearMeasLayers();
    document.getElementById('measResult').textContent = '';
    document.getElementById('measBtn').textContent    = t('btn_measure_start');
    document.getElementById('measBtn').classList.remove('meas-active');
    setStatus(t('status_ready'), '');
}

function clearMeasLayers() {
    measLayers.forEach(l => map.removeLayer(l));
    measLayers = [];
}

// ── Karten-Klick-Handler ──────────────────────────────────────────────────────
// Behandelt Messpunkte A und B; setzt ansonsten den Radius-Mittelpunkt.
map.on('click', (e) => {

    // Punkt A setzen
    if (measMode === 'A') {
        measA    = e.latlng;
        measMode = 'B';
        measLayers.push(L.marker(measA, { icon: measIcon('A') }).addTo(map));
        setStatus(t('status_point_b'), 'loading');
        return;
    }

    // Punkt B setzen → Messung abschließen
    if (measMode === 'B') {
        measB    = e.latlng;
        measMode = null;

        const mB      = L.marker(measB, { icon: measIcon('B') }).addTo(map);
        const line    = L.polyline([measA, measB], {
            color: '#f0883e', weight: 2.5, dashArray: '7 5',
        }).addTo(map);

        const km         = haversineKm(measA, measB);
        const { deg, dir } = calcBearing(measA, measB);
        const midLat     = (measA.lat + measB.lat) / 2;
        const midLng     = (measA.lng + measB.lng) / 2;
        const lineLabel  = L.marker([midLat, midLng], {
            icon: L.divIcon({
                className: '',
                html:      `<div class="meas-line-label">${fmtDist(km)} &nbsp;·&nbsp; ${deg}° ${dir}</div>`,
                iconSize:  [0, 0],
                iconAnchor:[0, 11],
            }),
            interactive: false,
        }).addTo(map);

        measLayers.push(mB, line, lineLabel);
        document.getElementById('measResult').innerHTML =
            `<strong>${fmtDist(km)}</strong> &nbsp;·&nbsp; ${deg}° ${dir}`;
        document.getElementById('measBtn').textContent = t('btn_measure_start');
        document.getElementById('measBtn').classList.remove('meas-active');
        setStatus(t('status_meas_done'), 'ok');
        return;
    }

    // Kein Mess-Modus → Radius-Mittelpunkt setzen
    clickedPoint = e.latlng;
    document.getElementById('clickCoords').textContent =
        `📍 ${e.latlng.lat.toFixed(6)},  ${e.latlng.lng.toFixed(6)}`;
});
