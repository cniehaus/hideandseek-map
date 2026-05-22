'use strict';

// ── Zustand ───────────────────────────────────────────────────────────────────
let clickedPoint  = null;   // aktueller Mittelpunkt (wird auch in renderers.js gesetzt)
let radiusCounter = 0;
let radiusMode    = 'single';
const radiusItems = {};     // id → { layers: [...], outerCircle }

// ── Modus wechseln (Einzeln / Intervall) ─────────────────────────────────────
function setRadiusMode(mode) {
    radiusMode = mode;
    document.getElementById('modeSingle').style.display   = mode === 'single'   ? '' : 'none';
    document.getElementById('modeInterval').style.display = mode === 'interval' ? '' : 'none';
    document.getElementById('tabSingle').className        = mode === 'single'   ? '' : 'ghost';
    document.getElementById('tabInterval').className      = mode === 'interval' ? '' : 'ghost';
}

// ── Manuelle Koordinaten übernehmen ──────────────────────────────────────────
function useManualCoords() {
    const lat = parseFloat(document.getElementById('manualLat').value.trim().replace(',', '.'));
    const lng = parseFloat(document.getElementById('manualLng').value.trim().replace(',', '.'));
    if (isNaN(lat) || isNaN(lng)) {
        setStatus(t('status_bad_coords'), 'error');
        return;
    }
    clickedPoint = L.latLng(lat, lng);
    document.getElementById('clickCoords').textContent =
        `📍 ${lat.toFixed(6)},  ${lng.toFixed(6)}`;
    map.setView(clickedPoint, Math.max(map.getZoom(), 13));
}

// ── Hilfsfunktionen für Radius-Beschriftung ───────────────────────────────────
// Berechnet einen Punkt am Rand des Kreises (Richtung Norden) für das Label.
function radiusLabelPos(center, km) {
    const R   = 6371;
    const d   = km / R;
    const φ1  = center.lat * Math.PI / 180;
    const λ1  = center.lng * Math.PI / 180;
    const φ2  = Math.asin(Math.sin(φ1) * Math.cos(d));
    const λ2  = λ1 + Math.atan2(Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
    return L.latLng(φ2 * 180 / Math.PI, λ2 * 180 / Math.PI);
}

function makeKmLabel(center, km, color) {
    return L.marker(radiusLabelPos(center, km), {
        icon: L.divIcon({
            className: 'radius-km-label',
            html:       `<span style="background:${color}">${fmtDistShort(km)}</span>`,
            iconSize:   null,
            iconAnchor: [0, 9],
        }),
        interactive:  false,
        zIndexOffset: 300,
    });
}

// ── Eintrag in der Radius-Liste ───────────────────────────────────────────────
function addRadiusListEntry(id, desc, center, dotColor, outerCircle) {
    const list = document.getElementById('radiusList');
    const item = document.createElement('div');
    item.className = 'radius-item';
    item.id        = 'ri-' + id;
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

// ── Radius zeichnen ───────────────────────────────────────────────────────────
function drawRadius() {
    if (!clickedPoint) {
        setStatus(t('status_no_point'), 'error');
        return;
    }

    const id  = ++radiusCounter;
    const hue = (id * 67) % 360;

    if (radiusMode === 'single') {
        const inputVal = parseFloat(document.getElementById('radiusKm').value);
        if (isNaN(inputVal) || inputVal <= 0) { setStatus(t('status_bad_radius'), 'error'); return; }
        const km    = toKm(inputVal);
        const color = `hsl(${hue},80%,55%)`;

        const circle = L.circle(clickedPoint, {
            radius: km * 1000, color: '#000', fillColor: color,
            fillOpacity: 0.30, weight: 3, dashArray: '8 5',
        }).addTo(map);
        const center = L.circleMarker(clickedPoint, {
            radius: 5, fillColor: color, color: '#000', weight: 2, fillOpacity: 1,
        }).addTo(map);
        const label  = makeKmLabel(clickedPoint, km, color).addTo(map);

        radiusItems[id] = { layers: [circle, center, label], outerCircle: circle };
        addRadiusListEntry(id, tf('ri_radius', fmtDistShort(km)), clickedPoint, color, circle);
        setStatus(tf('status_radius_drawn', fmtDistShort(km)), 'ok');

    } else {
        const inputStep = parseFloat(document.getElementById('intervalStep').value);
        const count     = parseInt(document.getElementById('intervalCount').value);
        if (isNaN(inputStep) || inputStep <= 0 || isNaN(count) || count < 1) {
            setStatus(t('status_bad_interval'), 'error'); return;
        }
        const step   = toKm(inputStep);
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
        addRadiusListEntry(id, tf('ri_interval', count, fmtDistShort(step)), clickedPoint, INTERVAL_COLORS[0], outerCircle);
        setStatus(tf('status_interval_drawn', count, fmtDistShort(step)), 'ok');
    }
}

// ── Radius entfernen ──────────────────────────────────────────────────────────
function removeRadius(id) {
    if (!radiusItems[id]) return;
    radiusItems[id].layers.forEach(l => map.removeLayer(l));
    delete radiusItems[id];
    document.getElementById('ri-' + id)?.remove();
}

// ── Alle Radien entfernen ─────────────────────────────────────────────────────
function clearAllRadii() {
    Object.keys(radiusItems).forEach(id => removeRadius(Number(id)));
}
