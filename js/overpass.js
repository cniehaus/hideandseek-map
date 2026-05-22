'use strict';

// ── Overpass API query with automatic fallback ────────────────────────────────
// Tries all endpoints from OVERPASS_ENDPOINTS in order.
// Throws an error if all endpoints fail.
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
            if (res.status === 429) throw new Error('Too many requests – please wait a moment');
            if (!res.ok)            throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            errors.push(`${endpoint}: ${e.message}`);
        }
    }

    throw new Error('All Overpass servers failed:\n' + errors.join('\n'));
}
