'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let measMode   = null;   // null | 'A' | 'B'
let measA      = null;
let measB      = null;
let measLayers = [];

// ── Marker icon for measurement points ───────────────────────────────────────
function measIcon(letter) {
    return L.divIcon({
        className: 'meas-icon',
        html:      letter,
        iconSize:  [22, 22],
        iconAnchor:[11, 11],
    });
}

// ── Haversine formula: distance in km ────────────────────────────────────────
function haversineKm(a, b) {
    const R    = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x    = Math.sin(dLat / 2) ** 2 +
                 Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
                 Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ── Bearing (degrees + compass direction) ────────────────────────────────────
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

// ── Destination point on a sphere ────────────────────────────────────────────
// Computes the point that lies distKm away in the direction bearingDeg.
function destPoint(lat, lng, bearingDeg, distKm) {
    const R  = 6371;
    const d  = distKm / R;
    const θ  = bearingDeg * Math.PI / 180;
    const φ1 = lat * Math.PI / 180;
    const λ1 = lng * Math.PI / 180;
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) +
                          Math.cos(φ1) * Math.sin(d) * Math.cos(θ));
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(d) * Math.cos(φ1),
                                 Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
    return [φ2 * 180 / Math.PI, λ2 * 180 / Math.PI];
}

// ── Polygon points for a semicircle ──────────────────────────────────────────
// Starts at startBearing and sweeps 180° clockwise.
// Polygon: centre → arc → centre (closed area with the diameter edge).
function buildSemicircle(lat, lng, radiusKm, startBearing, steps = 72) {
    const pts = [[lat, lng]];
    for (let i = 0; i <= steps; i++) {
        const angle = startBearing + (180 * i / steps);
        pts.push(destPoint(lat, lng, angle, radiusKm));
    }
    pts.push([lat, lng]);
    return pts;
}

// ── Start / cancel measurement ────────────────────────────────────────────────
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

// ── Map click handler ─────────────────────────────────────────────────────────
// Handles measurement points A and B; otherwise sets the radius centre.
map.on('click', (e) => {

    // Set point A
    if (measMode === 'A') {
        measA    = e.latlng;
        measMode = 'B';
        measLayers.push(L.marker(measA, { icon: measIcon('A') }).addTo(map));
        setStatus(t('status_point_b'), 'loading');
        return;
    }

    // Set point B → complete measurement
    if (measMode === 'B') {
        measB    = e.latlng;
        measMode = null;

        const mB      = L.marker(measB, { icon: measIcon('B') }).addTo(map);
        const line    = L.polyline([measA, measB], {
            color: '#f0883e', weight: 2.5, dashArray: '7 5',
        }).addTo(map);

        const km           = haversineKm(measA, measB);
        const { deg, dir } = calcBearing(measA, measB);
        const midLat       = (measA.lat + measB.lat) / 2;
        const midLng       = (measA.lng + measB.lng) / 2;

        const lineLabel = L.marker([midLat, midLng], {
            icon: L.divIcon({
                className: '',
                html:      `<div class="meas-line-label">${fmtDist(km)} &nbsp;·&nbsp; ${deg}° ${dir}</div>`,
                iconSize:  [0, 0],
                iconAnchor:[0, 11],
            }),
            interactive: false,
        }).addTo(map);

        // ── Semicircles ───────────────────────────────────────────────────────
        // Radius = half the line length; diameter is perpendicular to AB.
        // Zone 1 (orange): half towards A  → arc from deg+90  to deg+270 (bulge at deg+180)
        // Zone 2 (blue):   half towards B  → arc from deg+270 to deg+90  (bulge at deg)
        //
        // buildSemicircle(…, startBearing) sweeps 180° clockwise from startBearing;
        // the arc peak sits at startBearing+90. Therefore:
        //   semi1 peak = (deg+90)+90  = deg+180  → points toward A  ✓
        //   semi2 peak = (deg+270)+90 = deg+360  → points toward B  ✓
        const radius = km / 2;

        const semi1 = L.polygon(
            buildSemicircle(midLat, midLng, radius, deg + 90),
            { color: '#f97316', weight: 2, fillColor: '#f97316', fillOpacity: 0.22, interactive: false }
        ).addTo(map);

        const semi2 = L.polygon(
            buildSemicircle(midLat, midLng, radius, deg + 270),
            { color: '#38bdf8', weight: 2, fillColor: '#38bdf8', fillOpacity: 0.22, interactive: false }
        ).addTo(map);

        // Zone labels: geometric centroid ≈ 0.42r in the direction of each arc peak
        const labelOffset = radius * 0.42;
        const zone1Label  = L.marker(destPoint(midLat, midLng, deg + 180, labelOffset), {
            icon: L.divIcon({
                className:  '',
                html:       '<div class="zone-label zone-label-1">1</div>',
                iconSize:   [26, 26],
                iconAnchor: [13, 13],
            }),
            interactive: false,
        }).addTo(map);

        const zone2Label = L.marker(destPoint(midLat, midLng, deg, labelOffset), {
            icon: L.divIcon({
                className:  '',
                html:       '<div class="zone-label zone-label-2">2</div>',
                iconSize:   [26, 26],
                iconAnchor: [13, 13],
            }),
            interactive: false,
        }).addTo(map);

        measLayers.push(mB, line, lineLabel, semi1, semi2, zone1Label, zone2Label);
        document.getElementById('measResult').innerHTML =
            `<strong>${fmtDist(km)}</strong> &nbsp;·&nbsp; ${deg}° ${dir}`;
        document.getElementById('measBtn').textContent = t('btn_measure_start');
        document.getElementById('measBtn').classList.remove('meas-active');
        setStatus(t('status_meas_done'), 'ok');
        return;
    }

    // No measurement mode active → set radius centre point
    setClickedPoint(e.latlng);
});
