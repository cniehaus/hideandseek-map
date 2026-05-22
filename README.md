# Jet Lag Maps – Hide & Seek

> An interactive map tool for the board game [Jet Lag: The Game – Hide & Seek](https://store.nebula.tv/collections/jetlag/products/hideandseek).
> Plan your game with live OpenStreetMap data: postal codes, hospitals, train stations, attractions, and much more – fully printable as A4 PDF.

**[▶ Open the live app](https://cniehaus.github.io/hideandseek-map/)**

![Preview](og-preview.png)

---

## Features

- **17 toggleable map layers** – postal codes, hospitals, train & tram stations, bus stops, attractions, parks, shopping centres, cinemas, zoos, town halls, water bodies, aquariums, libraries, golf courses, stadiums, embassies, consulates
- **Radius tool** – single circle or multi-ring interval view, with a km/mi label on the ring
- **Distance & direction** – click two points to measure Haversine distance and bearing
- **6 map styles** – OSM Standard, Positron (light), Dark, Voyager, Satellite, ÖPNV
- **Bilingual** – English and German, auto-detected from browser locale
- **Print-ready** – A4 PDF output via browser print dialog
- **100 % static** – no server, no database; runs on GitHub Pages

---

## Tech Stack

| What | Library / API |
|---|---|
| Map rendering | [Leaflet 1.9](https://leafletjs.com/) |
| Map tiles | OpenStreetMap, CARTO, Esri, memomaps |
| POI data | [Overpass API](https://overpass-api.de/) (with 3-endpoint fallback) |
| Geocoding | [Nominatim](https://nominatim.openstreetmap.org/) |
| OSM → GeoJSON | [osmtogeojson](https://github.com/tyrasd/osmtogeojson) |
| Languages | Plain JS objects (`langs/de.js`, `langs/en.js`) |

No build step, no bundler, no framework. Just HTML + CSS + vanilla JS.

---

## Project Structure

```
hideandseek-map/
├── index.html          # Shell: HTML layout + <script> load order
├── style.css           # All styles (sidebar, map, print)
│
├── langs/
│   ├── de.js           # German translations (LANG_DE object)
│   └── en.js           # English translations (LANG_EN object)
│
└── js/
    ├── config.js       # Constants: tile URLs, colours, Overpass endpoints
    ├── i18n.js         # t(), tf(), switchLang(), applyI18n()
    ├── map.js          # Leaflet map init + setTileLayer()
    ├── overpass.js     # overpassFetch() – POST with endpoint fallback
    ├── renderers.js    # renderPLZ(), renderPOIs(), renderWater()
    ├── layers.js       # LAYER_DEFS (all POI filters) + layer management
    ├── city.js         # searchCity() + km/mi unit helpers
    ├── radius.js       # Radius / interval circle tool
    ├── measure.js      # Distance & bearing tool + map click handler
    └── ui.js           # Sidebar, print, error popup, style FAB
```

The most important file for contributors is **`js/layers.js`** – it contains the complete definition of every map layer (Overpass query + colour + icon + renderer reference) in one place.

---

## Running Locally

No install needed.

```bash
git clone https://github.com/cniehaus/hideandseek-map.git
cd hideandseek-map
```

Then open `index.html` in your browser – or serve it with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .
```

**Note:** The Overpass API blocks requests from `file://` in some browsers (CORS). Use the local server method if you see network errors.

---

## Contributing

Contributions are very welcome! Here are the most impactful areas:

### Add a new map layer (easiest start)

Each layer is a single object in `LAYER_DEFS` inside `js/layers.js`. To add one:

1. Pick an [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL) query that returns the features you want.
2. Add an entry to `LAYER_DEFS`:

```js
// js/layers.js
my_layer: {
    label: 'lyr_my_layer',       // translation key
    color: '#a855f7',            // marker / polygon colour
    icon:  '🏪',                 // emoji shown in popups
    buildQuery: (bb) => `[out:json][timeout:60];
(
  node(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="my_tag"];
  way(${bb[0]},${bb[2]},${bb[1]},${bb[3]})["amenity"="my_tag"];
);
out center bb tags;`,
    render: renderPOIs,          // use renderPOIs for point features
},
```

3. Add a checkbox to `index.html` (copy any existing `<label class="layer-row">` block).
4. Add translation strings to both `langs/de.js` and `langs/en.js`.

That's it – no other code changes needed.

### Other good first issues

- **New map style** – add a tile provider to `TILE_LAYERS` in `js/config.js` and a button to the style popover in `index.html`
- **Additional languages** – create `langs/xx.js` following the same structure as `de.js`, add the detection logic in `index.html` (`<head>`)
- **Improved Overpass queries** – the existing queries are functional but not exhaustive; PRs that improve recall or reduce noise are welcome
- **Mobile UX** – layout and touch behaviour on small screens can always improve
- **Accessibility** – ARIA labels, keyboard navigation, colour-contrast improvements

### Sending a Pull Request

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-new-layer`
3. Make your changes – no build step required
4. Open a Pull Request against `main` and describe what you changed and why

Please keep PRs focused: one layer (or one feature) per PR makes review much faster.

---

## Translation Guide

All user-visible strings live in `langs/de.js` (`LANG_DE`) and `langs/en.js` (`LANG_EN`). The keys are identical in both files.

```js
// langs/en.js
lyr_my_layer: 'My Layer Name',

// langs/de.js
lyr_my_layer: 'Mein Layer-Name',
```

Strings with placeholders use `{0}`, `{1}`, … and are called with `tf('key', value0, value1)`.

---

## Data & Privacy

- All geodata comes from [OpenStreetMap](https://www.openstreetmap.org/) (© OpenStreetMap contributors, ODbL).
- Geocoding requests go to the Nominatim service operated by the OSM Foundation.
- No user data is stored or transmitted to any server operated by this project.

---

## License

[GNU General Public License v3.0](LICENSE) – free to use, modify, and redistribute under the same licence.
