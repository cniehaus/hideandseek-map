'use strict';

// ── Overpass-API-Abfrage mit automatischem Fallback ───────────────────────────
// Probiert alle Endpunkte aus OVERPASS_ENDPOINTS der Reihe nach.
// Wirft einen Fehler, wenn alle Endpunkte fehlschlagen.
async function overpassFetch(query) {
    const body   = 'data=' + encodeURIComponent(query);
    const errors = [];

    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const res = await fetch(endpoint, {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
            });
            if (res.status === 429) throw new Error('Zu viele Anfragen – bitte kurz warten');
            if (!res.ok)            throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            errors.push(`${endpoint}: ${e.message}`);
        }
    }

    throw new Error('Alle Overpass-Server fehlgeschlagen:\n' + errors.join('\n'));
}
