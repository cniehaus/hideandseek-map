'use strict';

// ── Colour palette for route lines (kept in sync with COLOR_THEMES) ───────────
let BUS_ROUTE_COLORS = COLOR_THEMES[colorMode].busRoute;

// ── State ─────────────────────────────────────────────────────────────────────
let busRouteItems   = {};       // id → { layers, color, name, ref }
let busRouteRefs    = new Set();
let busRouteCounter = 0;

// ── Render route geometry from Overpass result ────────────────────────────────
function renderBusRoute(data, color) {
    const layers = [];
    (data.elements ?? []).forEach(el => {
        if (el.type !== 'relation') return;
        const name = el.tags?.name ?? el.tags?.ref ?? '';
        (el.members ?? []).forEach(m => {
            if (m.type !== 'way' || !m.geometry?.length) return;
            const line = L.polyline(
                m.geometry.map(p => [p.lat, p.lon]),
                { color, weight: 5, opacity: 0.85 }
            );
            line.bindPopup(`<div class="popup-name">🚌 ${esc(name)}</div>`);
            layers.push(line);
        });
    });
    return layers;
}

// ── Add a list entry to the sidebar ──────────────────────────────────────────
function addBusRouteListEntry(id, ref, name, color) {
    const list = document.getElementById('busRouteList');
    const item = document.createElement('div');
    item.className = 'radius-item';
    item.id        = 'br-' + id;
    item.innerHTML = `
        <div class="dot" style="background:${color};flex-shrink:0"></div>
        <div class="ri-info">
            <div>${t('lbl_line')} ${esc(ref)}</div>
            <div class="ri-lat">${esc(name)}</div>
        </div>
        <button class="danger" title="✕">✕</button>
    `;
    item.querySelector('button').addEventListener('click', () => removeBusRoute(id));
    list.appendChild(item);
}

// ── Load and draw a bus route ─────────────────────────────────────────────────
async function addBusRoute() {
    const input = document.getElementById('busRouteInput');
    const ref   = input.value.trim();
    if (!ref) return;

    if (busRouteRefs.has(ref)) {
        setStatus(tf('status_route_duplicate', ref), 'error');
        return;
    }

    const id    = ++busRouteCounter;
    const color = BUS_ROUTE_COLORS[(id - 1) % BUS_ROUTE_COLORS.length];

    setStatus(tf('status_loading_route', ref), 'loading');

    try {
        const bb = currentCity?.bbox;
        // Search within city bbox so "305" in Oldenburg doesn't match a city elsewhere.
        // Fall back to global search when no city is selected.
        const query = bb
            ? `[out:json][timeout:90];
relation(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["route"~"^(bus|tram|trolleybus|subway|light_rail|monorail)$"]["ref"="${ref}"];
out geom;`
            : `[out:json][timeout:90];
relation["route"~"^(bus|tram|trolleybus|subway|light_rail|monorail)$"]["ref"="${ref}"];
out geom;`;

        const data = await overpassFetch(query);

        if (!data.elements?.length) {
            setStatus(tf('status_route_not_found', ref), 'error');
            busRouteCounter--;
            return;
        }

        const layers = renderBusRoute(data, color);
        if (!layers.length) {
            setStatus(tf('status_route_no_geom', ref), 'error');
            busRouteCounter--;
            return;
        }

        layers.forEach(l => l.addTo(map));

        const routeName = data.elements[0]?.tags?.name ?? ref;
        busRouteItems[id] = { layers, color, name: routeName, ref };
        busRouteRefs.add(ref);

        addBusRouteListEntry(id, ref, routeName, color);
        setStatus(tf('status_route_loaded', ref, data.elements.length), 'ok');
        input.value = '';
    } catch (e) {
        setStatus(t('status_err_popup'), 'error');
        showErrorPopup(tf('err_busroute', ref, e.message));
        busRouteCounter--;
    }
}

// ── Remove a single bus route ─────────────────────────────────────────────────
function removeBusRoute(id) {
    if (!busRouteItems[id]) return;
    busRouteRefs.delete(busRouteItems[id].ref);
    busRouteItems[id].layers.forEach(l => map.removeLayer(l));
    delete busRouteItems[id];
    document.getElementById('br-' + id)?.remove();
}

// ── Remove all bus routes ─────────────────────────────────────────────────────
function clearAllBusRoutes() {
    Object.keys(busRouteItems).forEach(id => removeBusRoute(Number(id)));
}

// ── Re-colour existing routes after a theme change ───────────────────────────
function recolorBusRoutes() {
    const palette = COLOR_THEMES[colorMode].busRoute;
    Object.entries(busRouteItems).forEach(([id, item]) => {
        const newColor = palette[(parseInt(id) - 1) % palette.length];
        item.layers.forEach(l => l.setStyle?.({ color: newColor }));
        item.color = newColor;
        const dot = document.querySelector('#br-' + id + ' .dot');
        if (dot) dot.style.background = newColor;
    });
}
