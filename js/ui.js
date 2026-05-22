'use strict';

// ── General helpers ───────────────────────────────────────────────────────────

// Update the status bar at the bottom of the sidebar
function setStatus(msg, type = '') {
    const el    = document.getElementById('status');
    el.textContent = msg;
    el.className   = type;
}

// Escape HTML special characters (for popup content)
function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Print ─────────────────────────────────────────────────────────────────────
function printMap() {
    closeSidebar();
    map.invalidateSize();
    setTimeout(() => window.print(), 100);
}

// ── Map style popover ─────────────────────────────────────────────────────────
function toggleStylePopover() {
    document.getElementById('stylePopover').classList.toggle('open');
}

function selectStyle(btn, key) {
    setTileLayer(key);
    document.querySelectorAll('.style-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('stylePopover').classList.remove('open');
}

// Close popover when clicking outside
document.addEventListener('click', (e) => {
    const pop = document.getElementById('stylePopover');
    const fab = document.getElementById('styleFab');
    if (pop.classList.contains('open') && !pop.contains(e.target) && e.target !== fab) {
        pop.classList.remove('open');
    }
});

// ── Mobile sidebar ────────────────────────────────────────────────────────────
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarBackdrop').classList.add('open');
    document.getElementById('menuToggle').style.display = 'none';
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarBackdrop').classList.remove('open');
    document.getElementById('menuToggle').style.display = '';
}

// ── Error popup ───────────────────────────────────────────────────────────────
function showErrorPopup(msg) {
    document.getElementById('errorText').textContent  = msg;
    document.getElementById('errorCopyBtn').textContent = t('err_copy');
    document.getElementById('errorOverlay').style.display = 'flex';
}

function closeErrorPopup() {
    document.getElementById('errorOverlay').style.display = 'none';
}

function copyErrorText() {
    const text = document.getElementById('errorText').textContent;
    const btn  = document.getElementById('errorCopyBtn');

    const confirm = () => {
        btn.textContent = t('err_copied');
        setTimeout(() => { btn.textContent = t('err_copy'); }, 2000);
    };
    const fail = () => {
        btn.textContent = t('err_copy_fail');
        setTimeout(() => { btn.textContent = t('err_copy'); }, 2000);
    };

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(confirm).catch(fail);
        return;
    }
    // Fallback for older browsers
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? confirm() : fail();
    } catch (_) { fail(); }
}

// Close error popup when clicking the backdrop
document.getElementById('errorOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('errorOverlay')) closeErrorPopup();
});

// Trigger search on Enter in the city field
document.getElementById('cityInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchCity();
});
