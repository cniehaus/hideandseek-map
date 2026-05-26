const CHANGELOG = [
    { date: '2026-05-25', text: 'Admin Division Checker: compare two map points for shared administrative zones' },
    { date: '2026-05-25', text: 'All tool sections are now collapsible' },
    { date: '2026-05-25', text: 'Bug fix: map clicks now always register correctly' },
    { date: '2026-05-25', text: 'Parks and Green Spaces split into separate layers' },
    { date: '2026-05-25', text: 'New layers: Airports and Airfields' },
    { date: '2026-05-25', text: 'City Boundary layer and colour-blind safe palette added' },
];

function renderChangelog() {
    const el = document.getElementById('changelogList');
    if (!el) return;
    el.innerHTML = CHANGELOG.map(e => `
        <div class="cl-entry">
            <span class="cl-date">${e.date}</span>
            <span class="cl-text">${e.text}</span>
        </div>`).join('');

    const lastDate = document.getElementById('changelogLastDate');
    if (lastDate && CHANGELOG.length) lastDate.textContent = CHANGELOG[0].date;
}
