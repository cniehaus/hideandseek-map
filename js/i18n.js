'use strict';

// ── Translation helpers ───────────────────────────────────────────────────────
// t('key')            → translated text
// tf('key', a, b, …) → text with placeholders {0}, {1}, …
const t  = key => LANG[key] ?? key;
const tf = (key, ...args) => {
    let s = LANG[key] ?? key;
    args.forEach((a, i) => { s = s.replaceAll(`{${i}}`, a); });
    return s;
};

// ── Language switch (reload page with ?lang=de|en) ────────────────────────────
function switchLang(lang) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.location.href = url.toString();
}

// ── Translate all data-i18n elements in the DOM ───────────────────────────────
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

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const text = t(el.dataset.i18nTitle);
        el.title = text;
        el.setAttribute('aria-label', text);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
}
