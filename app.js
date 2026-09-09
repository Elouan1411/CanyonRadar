/* ================================================================
   Canyon Radar - Main Application
   ================================================================ */

// ── Constants ──
const AVERAGE_SPEED = 75; // km/h (slightly more realistic for mountain roads)
const TOAST_DURATION = 4000;

// ── State ──
const state = {
    start: null,
    rawResults: [],       // { canyon, duration, distanceKm, durationMin, linkMaps, DC_link }
    filteredResults: [],
    dataDB: [],
    isLoading: false,
};

// ── DOM refs ──
const els = {
    btn: document.getElementById('testBtn'),
    exportBtn: document.getElementById('export'),
    resultPre: document.getElementById('result'),
    canyonList: document.getElementById('canyonList'),
    loading: document.getElementById('loading'),
    resultsControls: document.getElementById('results-controls'),
    resultSearch: document.getElementById('resultSearch'),
    minNoteFilter: document.getElementById('minNoteFilter'),
    sortBy: document.getElementById('sortBy'),
    resultsCount: document.getElementById('results-count'),
    radios: document.querySelectorAll('input[name="choiceLocation"]'),
    toastContainer: document.getElementById('toast-container'),
};

// ── Debounce util ──
let searchTimeout;

/* ================================================================
   1. Initialization
   ================================================================ */

async function loadData() {
    try {
        const res = await fetch('/data/data.json');
        state.dataDB = await res.json();
    } catch (err) {
        console.error('Error loading dataDB:', err);
        showToast('Failed to load canyon database', 'error');
    }
}

// Appel au démarrage
loadData();

/* ================================================================
   2. Event Listeners
   ================================================================ */

els.btn.addEventListener('click', onSearch);
els.exportBtn.addEventListener('click', onExport);

// Location radio buttons
els.radios.forEach((radio, index) => {
    radio.addEventListener('change', () => onLocationChange(index));
});

// Filter / Sort listeners
els.resultSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFiltersSort, 200);
});
els.minNoteFilter.addEventListener('change', applyFiltersSort);
els.sortBy.addEventListener('change', applyFiltersSort);

/* ================================================================
   3. Location Inputs
   ================================================================ */

let searchInput, suggestions;
let locationTimeout;

function onLocationChange(index) {
    // Clean up previous dynamic inputs
    const oldCity = document.getElementById('divSearchCity');
    const oldCoord = document.getElementById('divCoordonnee');
    if (oldCity) oldCity.remove();
    if (oldCoord) oldCoord.remove();

    if (index === 1) createCitySearchInput();
    if (index === 2) createCoordInput();
}

function createCitySearchInput() {
    const div = document.createElement('div');
    div.id = 'divSearchCity';
    div.className = 'dynamic-input';
    div.innerHTML = `
        <input type="text" id="search" placeholder="Entrez une ville" autocomplete="off"/>
        <ul id="suggestions"></ul>
    `;
    document.querySelectorAll('.selectLocation label')[1].insertAdjacentElement('afterend', div);

    searchInput = document.getElementById('search');
    suggestions = document.getElementById('suggestions');

    searchInput.addEventListener('input', () => {
        clearTimeout(locationTimeout);
        locationTimeout = setTimeout(() => doSearch(searchInput.value.trim()), 300);
    });
}

function createCoordInput() {
    const div = document.createElement('div');
    div.id = 'divCoordonnee';
    div.className = 'dynamic-input';
    div.innerHTML = `<input type="text" id="coordonnee" placeholder="46.728250, 8.183964"/>`;
    document.querySelectorAll('.selectLocation label')[2].insertAdjacentElement('afterend', div);
}

async function doSearch(query) {
    suggestions.innerHTML = '';
    if (query.length < 3) return;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'CanyonRadar/1.0' } });
        const results = await response.json();

        results.slice(0, 5).forEach((city) => {
            const li = document.createElement('li');
            li.textContent = city.display_name;
            li.addEventListener('mousedown', () => {
                searchInput.value = city.display_name;
                suggestions.innerHTML = '';
                state.start = [parseFloat(city.lon), parseFloat(city.lat)];
            });
            suggestions.appendChild(li);
        });
    } catch (error) {
        console.error('API Error:', error);
    }
}

/* ================================================================
   4. Search Flow
   ================================================================ */

async function onSearch() {
    clearResults();

    const choice = document.querySelector('input[name="choiceLocation"]:checked')?.value;

    // Resolve start coordinates
    try {
        if (choice === 'selectLocation') {
            if (!state.start) {
                showToast('Please select a city from the suggestions', 'warning');
                return;
            }
        } else if (choice === 'coordonnee') {
            state.start = parseManualCoords();
            if (!state.start) return;
        } else {
            state.start = await resolveCurrentLocation();
        }
    } catch (err) {
        showToast(err, 'error');
        return;
    }

    const maxTime = Number(document.getElementById('maxTime').value);

    showLoading(true);

    const candidates = getCandidates(maxTime, state.start);
    console.log(`Candidates pre-filtered: ${candidates.length}`);

    if (candidates.length === 0) {
        showToast('No canyons found within this driving radius', 'info');
        showLoading(false);
        return;
    }

    if (candidates.length > 600) {
        showToast(`Too many candidates (${candidates.length}). Narrow your search radius.`, 'warning');
        showLoading(false);
        return;
    }

    try {
        const apiData = await callAPIServer(candidates);
        console.log('API data:', apiData);
        buildRawResults(apiData, candidates, maxTime);
        applyFiltersSort();
        els.resultsControls.classList.remove('hidden');
        if (state.filteredResults.length === 0) {
            showToast('No canyons reachable within the selected time.', 'info');
        } else {
            showToast(`${state.filteredResults.length} canyon(s) found!`, 'success');
        }
    } catch (err) {
        console.error(err);
        showToast('An error occurred while calculating routes.', 'error');
    } finally {
        showLoading(false);
    }
}

function parseManualCoords() {
    const val = document.getElementById('coordonnee')?.value || '';
    const match = val.match(/(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
    if (!match) {
        showToast('Invalid coordinates format. Use: lat, lng (e.g. 46.728250, 8.183964)', 'warning');
        return null;
    }
    return [parseFloat(match[2]), parseFloat(match[1])]; // [lon, lat]
}

function resolveCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocation is not supported by this browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
            (err) => {
                const msgs = {
                    [err.PERMISSION_DENIED]: 'Location permission denied.',
                    [err.POSITION_UNAVAILABLE]: 'Position unavailable.',
                    [err.TIMEOUT]: 'Geolocation request timed out.'
                };
                reject(msgs[err.code] || 'Unknown geolocation error.');
            }
        );
    });
}

function callAPIServer(candidates) {
    const end = candidates.map((c) => [c.long, c.lat]);
    const endStr = encodeURIComponent(JSON.stringify(end));

    return fetch(`/api/duration?start=${state.start.join(',')}&end=${endStr}`)
        .then((res) => res.json())
        .then((data) => {
            if (data.error) throw new Error(data.error);
            if (!data.durations || !data.durations.length) throw new Error('No routes found');
            return data;
        });
}

/* ================================================================
   5. Results Building
   ================================================================ */

function buildRawResults(apiData, candidates, maxTime) {
    state.rawResults = [];

    for (let i = 0; i < apiData.durations.length; i++) {
        const durationSec = apiData.durations[i];
        const distanceM = apiData.distances[i];
        const c = candidates[i];

        // Skip unroutable locations (ORS returns null)
        if (durationSec === null || distanceM === null) continue;

        const durationMin = Math.round(durationSec / 60);
        const distanceKm = Math.round(distanceM / 1000);

        if (durationMin <= maxTime && durationMin >= 0) {
            state.rawResults.push({
                canyon: c,
                durationMin,
                distanceKm,
                DC_link: `https://www.descente-canyon.com/canyoning${c.DC_link}`,
                linkMaps: `https://www.google.com/maps/dir/?api=1&origin=${state.start[1]},${state.start[0]}&destination=${c.lat},${c.long}&travelmode=driving`,
            });
        }
    }
}

/* ================================================================
   6. Filter & Sort Logic
   ================================================================ */

function applyFiltersSort() {
    const searchVal = els.resultSearch.value.trim().toLowerCase();
    const minNote = parseFloat(els.minNoteFilter.value);
    const sortMode = els.sortBy.value;

    let data = [...state.rawResults];

    // Filter by search text
    if (searchVal) {
        data = data.filter((r) => r.canyon.name.toLowerCase().includes(searchVal));
    }

    // Filter by min note
    if (minNote > 0) {
        data = data.filter((r) => r.canyon.note >= minNote);
    }

    // Sort
    const [key, dir] = sortMode.split('-');
    data.sort((a, b) => {
        let va, vb;
        if (key === 'note') { va = a.canyon.note; vb = b.canyon.note; }
        else if (key === 'time') { va = a.durationMin; vb = b.durationMin; }
        else { va = a.canyon.name.toLowerCase(); vb = b.canyon.name.toLowerCase(); }

        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
    });

    state.filteredResults = data;
    renderResults();
}

/* ================================================================
   7. Rendering
   ================================================================ */

function renderResults() {
    els.canyonList.innerHTML = '';
    els.resultPre.textContent = '';

    const count = state.filteredResults.length;
    els.resultsCount.textContent = count > 0 ? `${count} result${count > 1 ? 's' : ''}` : 'No results';

    if (count === 0) {
        els.resultPre.textContent = 'No canyons match your filters.';
        return;
    }

    const fragment = document.createDocumentFragment();

    state.filteredResults.forEach((item) => {
        const c = item.canyon;

        // Stars
        let ratingHTML = '';
        if (c.note === 0) {
            ratingHTML = `<span class="canyon-badge canyon-badge-danger"><i class="fa-solid fa-ban"></i> Forbidden / missing data</span>`;
        } else {
            ratingHTML = `<span class="rating-number">${c.note}</span>`;
            const fullStars = Math.floor(c.note);
            const halfStar = (c.note - fullStars) >= 0.5;
            for (let s = 0; s < fullStars; s++) ratingHTML += `<i class="fa-solid fa-star star-icon"></i>`;
            if (halfStar) ratingHTML += `<i class="fa-solid fa-star-half-stroke star-icon"></i>`;
        }

        // Cotation badge
        const cotationBadge = c.cotation && c.cotation !== '??'
            ? `<span class="canyon-badge canyon-badge-info">${c.cotation}</span>`
            : '';

        // Extra details (expandable)
        const extraDetails = buildExtraDetails(c);

        const li = document.createElement('li');
        li.className = 'canyon';
        li.innerHTML = `
            <a href="${item.DC_link}" target="_blank" class="canyon-main-link" aria-label="Open ${c.name} on descente-canyon.com"></a>
            <div class="canyon-header">
                <h3 class="canyon-name">${c.name} ${cotationBadge}</h3>
                <a href="${item.linkMaps}" target="_blank" class="canyon-route-link" title="Open route in Google Maps">
                    <i class="fa-solid fa-map-location-dot"></i>
                    <span class="route-time">${item.durationMin} min</span>
                    <span class="route-dist">${item.distanceKm} km</span>
                </a>
            </div>
            <div class="canyon-meta">
                <div class="canyon-rating" title="Rating out of 4">
                    ${ratingHTML}
                </div>
                <button class="canyon-expand-btn" aria-label="Show details">
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            </div>
            <div class="canyon-extra">${extraDetails}</div>
        `;

        // Expand logic
        const expandBtn = li.querySelector('.canyon-expand-btn');
        expandBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isExpanded = li.classList.toggle('expanded');
            const icon = expandBtn.querySelector('i');
            icon.classList.toggle('fa-chevron-down', !isExpanded);
            icon.classList.toggle('fa-chevron-up', isExpanded);
        });

        fragment.appendChild(li);
    });

    els.canyonList.appendChild(fragment);
}

function buildExtraDetails(c) {
    const fields = [
        { label: 'Altitude départ', val: c.alt_dep },
        { label: 'Dénivelé', val: c.deniv },
        { label: 'Longueur', val: c.longueur },
        { label: 'Hauteur max', val: c.haut_max },
        { label: 'Corde', val: c.corde },
        { label: 'Approche', val: c.tps_approche },
        { label: 'Descente', val: c.tps_desc },
        { label: 'Retour', val: c.tps_retour },
        { label: 'Navette', val: c.navette },
    ];

    let rows = fields
        .filter((f) => f.val && f.val !== '??')
        .map((f) => `<div class="detail-row"><span class="detail-label">${f.label}</span><span class="detail-value">${f.val}</span></div>`)
        .join('');

    // Parking links
    if (c.points) {
        rows += `<div class="detail-section-title"><i class="fa-solid fa-map-pin"></i> Points</div>`;
        const ptLabels = { depart: 'Départ', arrivee: 'Arrivée', parking_amont: 'Parking amont', parking_aval: 'Parking aval' };
        Object.entries(c.points).forEach(([key, pt]) => {
            const label = ptLabels[key] || key;
            const mapsLink = `https://www.google.com/maps?q=${pt.lat},${pt.long}`;
            rows += `<div class="detail-row">
                <span class="detail-label">${label}</span>
                <a class="detail-value detail-link" href="${mapsLink}" target="_blank">${pt.lat.toFixed(5)}, ${pt.long.toFixed(5)} <i class="fa-solid fa-external-link-alt" style="font-size:0.7em"></i></a>
            </div>`;
        });
    }

    return `<div class="canyon-details-grid">${rows}</div>`;
}

/* ================================================================
   8. Utilities
   ================================================================ */

function getCandidates(maxTime, start) {
    const maxDist = AVERAGE_SPEED * (maxTime / 60);
    return state.dataDB.filter((c) => haversineKm(start, [c.long, c.lat]) <= maxDist);
}

function haversineKm(a, b) {
    const R = 6371;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);

    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

function clearResults() {
    state.rawResults = [];
    state.filteredResults = [];
    els.canyonList.innerHTML = '';
    els.resultPre.textContent = '';
    els.resultsControls.classList.add('hidden');
    els.resultsCount.textContent = '';
}

function showLoading(show) {
    state.isLoading = show;
    els.loading.classList.toggle('hidden', !show);
    els.btn.disabled = show;
}

/* ================================================================
   9. Toast Notifications
   ================================================================ */

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const icon = icons[type] || icons.info;

    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    els.toastContainer.appendChild(toast);

    // Trigger reflow
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, TOAST_DURATION);
}

/* ================================================================
   10. Export
   ================================================================ */

function onExport() {
    if (state.filteredResults.length === 0) {
        showToast('No results to export', 'warning');
        return;
    }

    const rows = state.filteredResults.map((r) => ({
        Name: r.canyon.name,
        Rating: r.canyon.note,
        Duration_min: r.durationMin,
        Distance_km: r.distanceKm,
        Cotation: r.canyon.cotation,
        Longitude: r.canyon.long,
        Latitude: r.canyon.lat,
        Altitude_depart: r.canyon.alt_dep,
        Denivele: r.canyon.deniv,
        Longueur: r.canyon.longueur,
        Hauteur_max: r.canyon.haut_max,
        Corde: r.canyon.corde,
        Tps_approche: r.canyon.tps_approche,
        Tps_descente: r.canyon.tps_desc,
        Tps_retour: r.canyon.tps_retour,
        Navette: r.canyon.navette,
        URL: r.DC_link,
        Route_URL: r.linkMaps,
    }));

    downloadCSV(rows, 'canyon_radar_export.csv');
    showToast('CSV exported successfully', 'success');
}

function downloadCSV(data, filename) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map((row) =>
            headers
                .map((h) => {
                    let val = row[h] ?? '';
                    val = String(val).replace(/"/g, '""');
                    return `"${val}"`;
                })
                .join(',')
        ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
