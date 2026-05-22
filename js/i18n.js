'use strict';

// ── Übersetzungs-Hilfsfunktionen ──────────────────────────────────────────────
// t('key')            → übersetzter Text
// tf('key', a, b, …) → Text mit Platzhaltern {0}, {1}, …
const t  = key => LANG[key] ?? key;
const tf = (key, ...args) => {
    let s = LANG[key] ?? key;
    args.forEach((a, i) => { s = s.replaceAll(`{${i}}`, a); });
    return s;
};

// ── Sprachwechsel (Seite neu laden mit ?lang=de|en) ───────────────────────────
function switchLang(lang) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.location.href = url.toString();
}

// ── Alle data-i18n-Elemente im DOM übersetzen ─────────────────────────────────
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.getElementById('clickCoords').textContent         = t('coord_hint');
    document.getElementById('unitLabelRadius').textContent     = tf('lbl_radius', unitStr());
    document.getElementById('unitLabelStep').textContent       = tf('lbl_step', unitStr());
    document.getElementById('status').textContent              = t('status_ready');
    document.getElementById('cityInput').placeholder           = t('city_placeholder');
    document.getElementById('manualLat').placeholder           = t('lat_placeholder');
    document.getElementById('manualLng').placeholder           = t('lng_placeholder');
    document.getElementById('btnDE').className = _activeLang === 'de' ? '' : 'ghost';
    document.getElementById('btnEN').className = _activeLang === 'en' ? '' : 'ghost';

    const styleFab = document.getElementById('styleFab');
    styleFab.title = t('fab_style_title');
    styleFab.setAttribute('aria-label', t('fab_style_title'));

    const printFab = document.getElementById('printFab');
    printFab.title = t('fab_print_title');
    printFab.setAttribute('aria-label', t('fab_print_title'));
}
