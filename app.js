/* ================================================================
   Canyon Radar - Main Application
   ================================================================ */

// ── Constants ──
const AVERAGE_SPEED = 75;
const TOAST_DURATION = 4000;

// ── i18n ──
const i18n = {
    en: {
        selectLocation: 'Select location',
        currentLocation: 'Current Location',
        searchCity: 'Search City',
        gpsCoordinates: 'GPS Coordinates',
        maxDrivingTime: 'Max driving time',
        findTrip: 'Find my next trip',
        exportCSV: 'Export to CSV',
        searchResults: 'Search results...',
        minRating: 'Min rating:',
        sortBy: 'Sort by:',
        ratingHighLow: 'Rating (high to low)',
        ratingLowHigh: 'Rating (low to high)',
        timeShortLong: 'Driving time (short to long)',
        timeLongShort: 'Driving time (long to short)',
        nameAZ: 'Name (A-Z)',
        nameZA: 'Name (Z-A)',
        any: 'Any',
        results: (n) => `${n} result${n > 1 ? 's' : ''}`,
        noResults: 'No results',
        noCanyonsMatch: 'No canyons match your filters.',
        calculating: 'Calculating driving times...',
        selectCityFromSuggestions: 'Please select a city from the suggestions',
        selectCanyonFromSuggestions: 'Please select a canyon from the suggestions',
        invalidCoords: 'Invalid coordinates format. Use: lat, lng (e.g. 46.728250, 8.183964)',
        geoUnsupported: 'Geolocation is not supported by this browser.',
        geoDenied: 'Location permission denied.',
        geoUnavailable: 'Position unavailable.',
        geoTimeout: 'Geolocation request timed out.',
        geoUnknown: 'Unknown geolocation error.',
        noCandidates: 'No canyons found within this driving radius',
        tooManyCandidates: (n) => `Too many candidates (${n}). Narrow your search radius.`,
        noRoutes: 'No routes found',
        routeError: 'An error occurred while calculating routes.',
        noCanyonsInTime: 'No canyons reachable within the selected time.',
        foundCanyons: (n) => `${n} canyon(s) found!`,
        databaseError: 'Failed to load canyon database',
        forbiddenMissing: 'Forbidden / missing data',
        rating: 'Rating out of 4',
        openRoute: 'Open route in Google Maps',
        openCanyon: 'on descente-canyon.com',
        showDetails: 'Show details',
        points: 'Points',
        loadingData: 'Loading canyon data...',
        exportEmpty: 'No results to export',
        exportSuccess: 'CSV exported successfully',
        searchPlaceholder: 'Enter a city',
        coordsPlaceholder: '46.728250, 8.183964',
        tabNearby: 'Find nearby',
        tabInverse: 'Single canyon',
        findCanyon: 'Find a specific canyon',
        searchCanyon: 'Search a canyon...',
        timeToCanyon: (name, time, dist) => `It takes ${time} min (${dist} km) to reach ${name}`,
        routeOverview: 'Route overview',
    },
    fr: {
        selectLocation: 'Choisir la localisation',
        currentLocation: 'Localisation actuelle',
        searchCity: 'Rechercher une ville',
        gpsCoordinates: 'Coordonnées GPS',
        maxDrivingTime: 'Temps de route max',
        findTrip: 'Trouver ma prochaine sortie',
        exportCSV: 'Exporter en CSV',
        searchResults: 'Rechercher dans les résultats...',
        minRating: 'Note min :',
        sortBy: 'Trier par :',
        ratingHighLow: 'Note (décroissante)',
        ratingLowHigh: 'Note (croissante)',
        timeShortLong: 'Temps (court → long)',
        timeLongShort: 'Temps (long → court)',
        nameAZ: 'Nom (A-Z)',
        nameZA: 'Nom (Z-A)',
        any: 'Toutes',
        results: (n) => `${n} résultat${n > 1 ? 's' : ''}`,
        noResults: 'Aucun résultat',
        noCanyonsMatch: 'Aucun canyon ne correspond à vos filtres.',
        calculating: 'Calcul des temps de route...',
        selectCityFromSuggestions: 'Veuillez sélectionner une ville dans les suggestions',
        selectCanyonFromSuggestions: 'Veuillez sélectionner un canyon dans les suggestions',
        invalidCoords: "Format de coordonnées invalide. Utilisez : lat, lng (ex: 46.728250, 8.183964)",
        geoUnsupported: "La géolocalisation n'est pas supportée par ce navigateur.",
        geoDenied: 'Permission de localisation refusée.',
        geoUnavailable: 'Position indisponible.',
        geoTimeout: 'La requête de géolocalisation a expiré.',
        geoUnknown: 'Erreur de géolocalisation inconnue.',
        noCandidates: 'Aucun canyon trouvé dans ce rayon de conduite',
        tooManyCandidates: (n) => `Trop de candidats (${n}). Réduisez le rayon de recherche.`,
        noRoutes: 'Aucun itinéraire trouvé',
        routeError: 'Une erreur est survenue lors du calcul des itinéraires.',
        noCanyonsInTime: 'Aucun canyon accessible dans le temps sélectionné.',
        foundCanyons: (n) => `${n} canyon(s) trouvé(s) !`,
        databaseError: 'Échec du chargement de la base de données',
        forbiddenMissing: 'Interdit / données manquantes',
        rating: 'Note sur 4',
        openRoute: "Ouvrir l'itinéraire dans Google Maps",
        openCanyon: 'sur descente-canyon.com',
        showDetails: 'Afficher les détails',
        points: 'Points',
        loadingData: 'Chargement des données...',
        exportEmpty: 'Aucun résultat à exporter',
        exportSuccess: 'CSV exporté avec succès',
        searchPlaceholder: 'Entrez une ville',
        coordsPlaceholder: '46.728250, 8.183964',
        tabNearby: 'Recherche locale',
        tabInverse: 'Canyon unique',
        findCanyon: 'Rechercher un canyon spécifique',
        searchCanyon: 'Rechercher un canyon...',
        timeToCanyon: (name, time, dist) => `Il faut ${time} min (${dist} km) pour rejoindre ${name}`,
        routeOverview: 'Aperçu de la route',
    },
};

let lang = 'en';
const browserLang = navigator.language || navigator.userLanguage || '';
if (browserLang.toLowerCase().startsWith('fr')) lang = 'fr';
const t = (k, ...args) => {
    const str = i18n[lang]?.[k] ?? i18n.en[k];
    return typeof str === 'function' ? str(...args) : str;
};

// ── State ──
const state = {
    mode: 'nearby', // 'nearby' | 'inverse'
    start: null,
    selectedCanyon: null,
    rawResults: [],
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
    tabNearby: document.getElementById('tab-btn-nearby'),
    tabInverse: document.getElementById('tab-btn-inverse'),
    contentNearby: document.getElementById('tab-nearby'),
    contentInverse: document.getElementById('tab-inverse'),
    searchCanyonInput: document.getElementById('searchCanyon'),
    canyonSuggestions: document.getElementById('canyonSuggestions'),
};

let searchTimeout, canyonSearchTimeout, locationTimeout;
let searchInput, suggestions;

/* ================================================================
   0. Translate static UI
   ================================================================ */

function applyTranslations() {
    document.documentElement.lang = lang === 'fr' ? 'fr' : 'en';
    document.querySelector('.header-subtitle').textContent =
        lang === 'fr' ? 'Trouvez des canyons accessibles selon votre temps de route' : 'Find canyoning spots reachable within your driving time';

    // Tabs
    document.getElementById('label-tab-nearby').textContent = t('tabNearby');
    document.getElementById('label-tab-inverse').textContent = t('tabInverse');

    // Nearby tab
    document.getElementById('h2-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${t('selectLocation')}`;
    document.getElementById('h2-time').innerHTML = `<i class="fa-solid fa-clock"></i> ${t('maxDrivingTime')}`;
    document.getElementById('label-current').textContent = t('currentLocation');
    document.getElementById('label-city').textContent = t('searchCity');
    document.getElementById('label-gps').textContent = t('gpsCoordinates');

    // Inverse tab
    document.getElementById('h2-inverse').innerHTML = `<i class="fa-solid fa-bullseye"></i> ${t('findCanyon')}`;
    if (els.searchCanyonInput) els.searchCanyonInput.placeholder = t('searchCanyon');

    // Buttons
    document.getElementById('btn-find').textContent = t('findTrip');
    document.getElementById('btn-export').textContent = t('exportCSV');

    // Result controls
    els.resultSearch.placeholder = t('searchResults');
    document.getElementById('label-min-rating').textContent = t('minRating');
    document.getElementById('label-sort').textContent = t('sortBy');

    // Options
    const minNoteOptions = { 0: t('any'), 1: '1+', 2: '2+', 3: '3+', '3.5': '3.5+' };
    Array.from(els.minNoteFilter.options).forEach((opt) => { opt.textContent = minNoteOptions[opt.value] ?? opt.value; });

    const sortOptions = {
        'note-desc': t('ratingHighLow'), 'note-asc': t('ratingLowHigh'),
        'time-asc': t('timeShortLong'), 'time-desc': t('timeLongShort'),
        'name-asc': t('nameAZ'), 'name-desc': t('nameZA'),
    };
    Array.from(els.sortBy.options).forEach((opt) => { opt.textContent = sortOptions[opt.value] ?? opt.value; });

    // Loading
    document.getElementById('loading-text').textContent = t('calculating');

    // Footer
    document.getElementById('footer-made').innerHTML = lang === 'fr'
        ? 'Créé avec <i class="fa-solid fa-heart"></i> par Elouan'
        : 'Made with <i class="fa-solid fa-heart"></i> by Elouan';
    document.getElementById('footer-data').innerHTML = `${lang === 'fr' ? 'Données de' : 'Data from'} <a href="https://www.descente-canyon.com/" target="_blank">descente-canyon.com</a>`;
}

/* ================================================================
   1. Initialization
   ================================================================ */

async function loadData() {
    try {
        const res = await fetch('/data/data.json');
        state.dataDB = await res.json();
    } catch (err) {
        console.error('Error loading dataDB:', err);
        showToast(t('databaseError'), 'error');
    }
}

loadData();
window.addEventListener('DOMContentLoaded', applyTranslations);

/* ================================================================
   2. Event Listeners
   ================================================================ */

els.btn.addEventListener('click', onSearch);
els.exportBtn.addEventListener('click', onExport);

// Tabs
els.tabNearby.addEventListener('click', () => switchTab('nearby'));
els.tabInverse.addEventListener('click', () => switchTab('inverse'));

// Location radios (nearby mode)
els.radios.forEach((radio, index) => {
    radio.addEventListener('change', () => onLocationChange(index));
});

// Filter / Sort listeners (nearby results)
els.resultSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFiltersSort, 200);
});
els.minNoteFilter.addEventListener('change', applyFiltersSort);
els.sortBy.addEventListener('change', applyFiltersSort);

// Canyon autocomplete (inverse mode)
if (els.searchCanyonInput) {
    els.searchCanyonInput.addEventListener('input', () => {
        clearTimeout(canyonSearchTimeout);
        canyonSearchTimeout = setTimeout(() => searchCanyonByName(els.searchCanyonInput.value.trim()), 200);
    });
}

/* ================================================================
   3. Tabs Logic
   ================================================================ */

function switchTab(mode) {
    state.mode = mode;

    // Toggle tab buttons
    els.tabNearby.classList.toggle('active', mode === 'nearby');
    els.tabInverse.classList.toggle('active', mode === 'inverse');

    // Toggle content
    els.contentNearby.classList.toggle('hidden', mode !== 'nearby');
    els.contentInverse.classList.toggle('hidden', mode !== 'inverse');

    // Reset results
    clearResults();
    if (mode === 'inverse') {
        els.resultsControls.classList.add('hidden');
        els.exportBtn.style.display = 'none';
    } else {
        els.exportBtn.style.display = '';
    }
}

/* ================================================================
   4. Location Inputs (nearby mode)
   ================================================================ */

function onLocationChange(index) {
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
        <input type="text" id="search" placeholder="${t('searchPlaceholder')}" autocomplete="off"/>
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
    div.innerHTML = `<input type="text" id="coordonnee" placeholder="${t('coordsPlaceholder')}"/>`;
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
   5. Canyon Autocomplete (inverse mode)
   ================================================================ */

function searchCanyonByName(query) {
    els.canyonSuggestions.innerHTML = '';
    if (query.length < 2) return;

    const matches = state.dataDB
        .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8);

    matches.forEach((c) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${c.name}</strong> <span>${c.cotation && c.cotation !== '??' ? c.cotation : ''}</span>`;
        li.addEventListener('mousedown', () => {
            els.searchCanyonInput.value = c.name;
            els.canyonSuggestions.innerHTML = '';
            state.selectedCanyon = c;
        });
        els.canyonSuggestions.appendChild(li);
    });
}

/* ================================================================
   6. Search Flow
   ================================================================ */

async function onSearch() {
    clearResults();

    if (state.mode === 'inverse') {
        await onSearchInverse();
        return;
    }

    // Nearby mode
    const choice = document.querySelector('input[name="choiceLocation"]:checked')?.value;
    try {
        if (choice === 'selectLocation') {
            if (!state.start) { showToast(t('selectCityFromSuggestions'), 'warning'); return; }
        } else if (choice === 'coordonnee') {
            state.start = parseManualCoords();
            if (!state.start) return;
        } else {
            state.start = await resolveCurrentLocation();
        }
    } catch (err) { showToast(err, 'error'); return; }

    const maxTime = Number(document.getElementById('maxTime').value);
    showLoading(true);

    const candidates = getCandidates(maxTime, state.start);
    console.log(`Candidates pre-filtered: ${candidates.length}`);

    if (candidates.length === 0) { showToast(t('noCandidates'), 'info'); showLoading(false); return; }
    if (candidates.length > 600) { showToast(t('tooManyCandidates', candidates.length), 'warning'); showLoading(false); return; }

    try {
        const apiData = await callAPIServer(candidates);
        console.log('API data:', apiData);
        buildRawResults(apiData, candidates, maxTime);
        applyFiltersSort();
        els.resultsControls.classList.remove('hidden');
        if (state.filteredResults.length === 0) {
            showToast(t('noCanyonsInTime'), 'info');
        } else {
            showToast(t('foundCanyons', state.filteredResults.length), 'success');
        }
    } catch (err) {
        console.error(err);
        showToast(t('routeError'), 'error');
    } finally { showLoading(false); }
}

async function onSearchInverse() {
    if (!state.selectedCanyon) {
        showToast(t('selectCanyonFromSuggestions'), 'warning');
        return;
    }

    const c = state.selectedCanyon;
    try { state.start = await resolveCurrentLocation(); }
    catch (err) { showToast(err, 'error'); return; }

    showLoading(true);
    try {
        const apiData = await callAPIServer([c]);
        const durationSec = apiData.durations[0];
        const distanceM = apiData.distances[0];
        if (durationSec === null || distanceM === null) {
            showToast(t('noRoutes'), 'error'); showLoading(false); return;
        }
        const durationMin = Math.round(durationSec / 60);
        const distanceKm = Math.round(distanceM / 1000);

        const item = {
            canyon: c,
            durationMin,
            distanceKm,
            DC_link: `https://www.descente-canyon.com/canyoning${c.DC_link}`,
            linkMaps: `https://www.google.com/maps/dir/?api=1&origin=${state.start[1]},${state.start[0]}&destination=${c.lat},${c.long}&travelmode=driving`,
        };
        renderSingleResult(item);
        showToast(t('timeToCanyon', c.name, durationMin, distanceKm), 'success');
    } catch (err) {
        console.error(err);
        showToast(t('routeError'), 'error');
    } finally { showLoading(false); }
}

function parseManualCoords() {
    const val = document.getElementById('coordonnee')?.value || '';
    const match = val.match(/(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
    if (!match) { showToast(t('invalidCoords'), 'warning'); return null; }
    return [parseFloat(match[2]), parseFloat(match[1])];
}

function resolveCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(t('geoUnsupported')); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
            (err) => {
                const msgs = {
                    [err.PERMISSION_DENIED]: t('geoDenied'),
                    [err.POSITION_UNAVAILABLE]: t('geoUnavailable'),
                    [err.TIMEOUT]: t('geoTimeout')
                };
                reject(msgs[err.code] || t('geoUnknown'));
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
            if (!data.durations || !data.durations.length) throw new Error(t('noRoutes'));
            return data;
        });
}

/* ================================================================
   7. Results Building
   ================================================================ */

function buildRawResults(apiData, candidates, maxTime) {
    state.rawResults = [];
    for (let i = 0; i < apiData.durations.length; i++) {
        const durationSec = apiData.durations[i];
        const distanceM = apiData.distances[i];
        const c = candidates[i];
        if (durationSec === null || distanceM === null) continue;
        const durationMin = Math.round(durationSec / 60);
        const distanceKm = Math.round(distanceM / 1000);
        if (durationMin <= maxTime && durationMin >= 0) {
            state.rawResults.push({
                canyon: c, durationMin, distanceKm,
                DC_link: `https://www.descente-canyon.com/canyoning${c.DC_link}`,
                linkMaps: `https://www.google.com/maps/dir/?api=1&origin=${state.start[1]},${state.start[0]}&destination=${c.lat},${c.long}&travelmode=driving`,
            });
        }
    }
}

/* ================================================================
   8. Filter & Sort Logic
   ================================================================ */

function applyFiltersSort() {
    const searchVal = els.resultSearch.value.trim().toLowerCase();
    const minNote = parseFloat(els.minNoteFilter.value);
    const sortMode = els.sortBy.value;

    let data = [...state.rawResults];
    if (searchVal) data = data.filter((r) => r.canyon.name.toLowerCase().includes(searchVal));
    if (minNote > 0) data = data.filter((r) => r.canyon.note >= minNote);

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
   9. Rendering
   ================================================================ */

function renderResults() {
    els.canyonList.innerHTML = '';
    els.resultPre.textContent = '';

    const count = state.filteredResults.length;
    els.resultsCount.textContent = count > 0 ? t('results', count) : t('noResults');
    if (count === 0) { els.resultPre.textContent = t('noCanyonsMatch'); return; }

    const fragment = document.createDocumentFragment();
    state.filteredResults.forEach((item) => {
        const c = item.canyon;

        let ratingHTML = '';
        if (c.note === 0) {
            ratingHTML = `<span class="canyon-badge canyon-badge-danger"><i class="fa-solid fa-ban"></i> ${t('forbiddenMissing')}</span>`;
        } else {
            ratingHTML = `<span class="rating-number">${c.note}</span>`;
            const fullStars = Math.floor(c.note);
            const halfStar = (c.note - fullStars) >= 0.5;
            for (let s = 0; s < fullStars; s++) ratingHTML += `<i class="fa-solid fa-star star-icon"></i>`;
            if (halfStar) ratingHTML += `<i class="fa-solid fa-star-half-stroke star-icon"></i>`;
        }

        const cotationBadge = c.cotation && c.cotation !== '??'
            ? `<span class="canyon-badge canyon-badge-info">${c.cotation}</span>` : '';
        const extraDetails = buildExtraDetails(c);

        const li = document.createElement('li');
        li.className = 'canyon';
        li.innerHTML = `
            <a href="${item.DC_link}" target="_blank" class="canyon-main-link" aria-label="${c.name} ${t('openCanyon')}"></a>
            <div class="canyon-header">
                <h3 class="canyon-name">${c.name} ${cotationBadge}</h3>
                <a href="${item.linkMaps}" target="_blank" class="canyon-route-link" title="${t('openRoute')}">
                    <i class="fa-solid fa-map-location-dot"></i>
                    <span class="route-time">${item.durationMin} min</span>
                    <span class="route-dist">${item.distanceKm} km</span>
                </a>
            </div>
            <div class="canyon-meta">
                <div class="canyon-rating" title="${t('rating')}">${ratingHTML}</div>
                <button class="canyon-expand-btn" aria-label="${t('showDetails')}"><i class="fa-solid fa-chevron-down"></i></button>
            </div>
            <div class="canyon-extra">${extraDetails}</div>
        `;

        const expandBtn = li.querySelector('.canyon-expand-btn');
        expandBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const isExpanded = li.classList.toggle('expanded');
            const icon = expandBtn.querySelector('i');
            icon.classList.toggle('fa-chevron-down', !isExpanded);
            icon.classList.toggle('fa-chevron-up', isExpanded);
        });
        fragment.appendChild(li);
    });
    els.canyonList.appendChild(fragment);
}

function renderSingleResult(item) {
    els.canyonList.innerHTML = '';
    els.resultPre.textContent = '';

    const c = item.canyon;
    let ratingHTML = '';
    if (c.note === 0) {
        ratingHTML = `<span class="canyon-badge canyon-badge-danger"><i class="fa-solid fa-ban"></i> ${t('forbiddenMissing')}</span>`;
    } else {
        ratingHTML = `<span class="rating-number">${c.note}</span>`;
        const fullStars = Math.floor(c.note);
        const halfStar = (c.note - fullStars) >= 0.5;
        for (let s = 0; s < fullStars; s++) ratingHTML += `<i class="fa-solid fa-star star-icon"></i>`;
        if (halfStar) ratingHTML += `<i class="fa-solid fa-star-half-stroke star-icon"></i>`;
    }

    const cotationBadge = c.cotation && c.cotation !== '??'
        ? `<span class="canyon-badge canyon-badge-info">${c.cotation}</span>` : '';
    const extraDetails = buildExtraDetails(c);

    const li = document.createElement('li');
    li.className = 'canyon canyon-single';
    li.innerHTML = `
        <a href="${item.DC_link}" target="_blank" class="canyon-main-link" aria-label="${c.name} ${t('openCanyon')}"></a>
        <div class="canyon-single-header">
            <h3 class="canyon-name">${c.name} ${cotationBadge}</h3>
            <div class="canyon-single-rating" title="${t('rating')}">${ratingHTML}</div>
        </div>
        <div class="canyon-single-route">
            <a href="${item.linkMaps}" target="_blank" class="canyon-route-link" title="${t('openRoute')}">
                <i class="fa-solid fa-map-location-dot"></i>
                <span class="route-time">${item.durationMin} min</span>
                <span class="route-dist">${item.distanceKm} km</span>
            </a>
        </div>
        <div class="canyon-extra">${extraDetails}</div>
    `;
    els.canyonList.appendChild(li);
}

function buildExtraDetails(c) {
    const fields = lang === 'fr' ? [
        { label: 'Altitude départ', val: c.alt_dep },
        { label: 'Dénivelé', val: c.deniv },
        { label: 'Longueur', val: c.longueur },
        { label: 'Hauteur max', val: c.haut_max },
        { label: 'Corde', val: c.corde },
        { label: 'Approche', val: c.tps_approche },
        { label: 'Descente', val: c.tps_desc },
        { label: 'Retour', val: c.tps_retour },
        { label: 'Navette', val: c.navette },
    ] : [
        { label: 'Altitude departure', val: c.alt_dep },
        { label: 'Elevation change', val: c.deniv },
        { label: 'Length', val: c.longueur },
        { label: 'Max height', val: c.haut_max },
        { label: 'Rope', val: c.corde },
        { label: 'Approach', val: c.tps_approche },
        { label: 'Descent', val: c.tps_desc },
        { label: 'Return', val: c.tps_retour },
        { label: 'Shuttle', val: c.navette },
    ];

    let rows = fields
        .filter((f) => f.val && f.val !== '??')
        .map((f) => `<div class="detail-row"><span class="detail-label">${f.label}</span><span class="detail-value">${f.val}</span></div>`)
        .join('');

    if (c.points) {
        rows += `<div class="detail-section-title"><i class="fa-solid fa-map-pin"></i> ${t('points')}</div>`;
        const ptLabels = lang === 'fr'
            ? { depart: 'Départ', arrivee: 'Arrivée', parking_amont: 'Parking amont', parking_aval: 'Parking aval' }
            : { depart: 'Start', arrivee: 'End', parking_amont: 'Upstream parking', parking_aval: 'Downstream parking' };
        Object.entries(c.points).forEach(([key, pt]) => {
            // FIX: guard against missing lat/long
            if (!pt || pt.lat == null || pt.long == null) return;
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
   10. Utilities
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

function toRad(deg) { return deg * (Math.PI / 180); }

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
   11. Toast Notifications
   ================================================================ */

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const icon = icons[type] || icons.info;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    els.toastContainer.appendChild(toast);
    toast.offsetHeight;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, TOAST_DURATION);
}

/* ================================================================
   12. Export
   ================================================================ */

function onExport() {
    if (state.filteredResults.length === 0) { showToast(t('exportEmpty'), 'warning'); return; }

    const rows = state.filteredResults.map((r) => ({
        Name: r.canyon.name, Rating: r.canyon.note, Duration_min: r.durationMin, Distance_km: r.distanceKm,
        Cotation: r.canyon.cotation, Longitude: r.canyon.long, Latitude: r.canyon.lat,
        Altitude_depart: r.canyon.alt_dep, Denivele: r.canyon.deniv, Longueur: r.canyon.longueur,
        Hauteur_max: r.canyon.haut_max, Corde: r.canyon.corde, Tps_approche: r.canyon.tps_approche,
        Tps_descente: r.canyon.tps_desc, Tps_retour: r.canyon.tps_retour, Navette: r.canyon.navette,
        URL: r.DC_link, Route_URL: r.linkMaps,
    }));
    downloadCSV(rows, 'canyon_radar_export.csv');
    showToast(t('exportSuccess'), 'success');
}

function downloadCSV(data, filename) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','),
        ...data.map((row) => headers.map((h) => {
            let val = row[h] ?? '';
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        }).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
