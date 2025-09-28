const btn = document.getElementById("testBtn");
const result = document.getElementById("result");
let dataDB = [];
let suggestions, searchInput;
// Debounce pour limiter les requêtes
let timeout;
let start; //TODO: faire pour ne pas que ca soit global²
const AVERAGE_SPEED = 80;

// Clique du bouton de recherche
btn.addEventListener("click", async () => {
    // Récupérer le choix de l'utilisateur (checkbox / radio)
    let choix = document.querySelector(
        'input[name="choiceLocation"]:checked'
    )?.value;
    if (choix) {
        console.log(`Le choix sélectionné est : ${choix}`);
    }
    //TODO: faire plutot un case
    if (choix == "selectLocation") {
        if (start == undefined) {
            console.log("barre de recherche pas complété");
            result.textContent =
                "Erreur, vous n'avez pas compléter comme il faut la barre de recherche";
            return;
        }
    } else if (choix == "coordonnee") {
        start = getCoordMannuelUser(start);
    } else {
        await getLocation();
    }
    console.log("le start :", start);
    console.log("Coordonnées de départ :", start);
    result.textContent = `Coordonnées récupérées : ${start[1]}, ${start[0]}`;

    // Récupérer le temps que l'utilisateur a choisi
    let maxTime = getMaxTime();

    // Récupérer tout les potentiels canyon candidats
    let candidats = getCandidats(maxTime, start);
    console.log("jai les candidats");
    let data = await callAPIServeur(candidats);
    console.log("data:", data);
    displayResult(data, candidats, maxTime);
});

let radiosChoiceLocation = document.querySelectorAll(
    'input[name="choiceLocation"]'
);
// Création du listener pour currentLocation
radiosChoiceLocation[0].addEventListener("change", function () {
    // Suppression des inputs
    let divSearchCity = document.getElementById("divSearchCity");
    if (divSearchCity) {
        divSearchCity.remove();
    }
    let divCoordonnee = document.getElementById("divCoordonnee");
    if (divCoordonnee) {
        divCoordonnee.remove();
    }
});

// Création de la barre de recherche si choix du select Location
radiosChoiceLocation[1].addEventListener("change", function () {
    // Suppression de l'input coordonnnee
    let divCoordonnee = document.getElementById("divCoordonnee");
    if (divCoordonnee) {
        divCoordonnee.remove();
    }
    // Création de la div
    let divSearch = document.createElement("div");
    divSearch.id = "divSearchCity";
    divSearch.innerHTML = `<input type="text" id="search" placeholder="Entrez une ville"/><ul id="suggestions"></ul>`;
    // Insertion dans le code html juste après le 2e label
    document
        .querySelectorAll("label")[1]
        .insertAdjacentElement("afterend", divSearch);

    // Attributions des valeurs aux deux variables searchInput et suggestions
    searchInput = document.getElementById("search");
    suggestions = document.getElementById("suggestions");

    // Lancement d'un listener quand on tape dans la barre de recherche -> lance la fonction doSearch
    searchInput.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            doSearch(searchInput.value.trim());
        }, 300);
    });
});

radiosChoiceLocation[2].addEventListener("change", function () {
    // Suppression de l'input search
    let divSearchCity = document.getElementById("divSearchCity");
    if (divSearchCity) {
        divSearchCity.remove();
    }
    // Création de la div
    let divSearch = document.createElement("div");
    divSearch.id = "divCoordonnee";
    divSearch.innerHTML = `<input type="text" id="coordonnee" placeholder="46.728250, 8.183964"/>`;
    // Insertion dans le code html juste après le 2e label
    document
        .querySelectorAll("label")[2]
        .insertAdjacentElement("afterend", divSearch);
});

async function doSearch(query) {
    suggestions.innerHTML = ""; // Vider les anciennes suggestions

    if (query.length < 3) return;

    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
    )}&limit=5`;

    try {
        let response = await fetch(url, {
            headers: { "User-Agent": "DemoApp" },
        });
        let results = await response.json();

        // On ne garde que 5 résultats max (API limit=5 mais au cas où)
        results.slice(0, 5).forEach((city) => {
            const li = document.createElement("li");
            li.textContent = city.display_name;
            li.style.cursor = "pointer";
            li.style.padding = "8px";
            li.style.borderBottom = "1px solid #eee";

            li.addEventListener(
                "mouseover",
                () => (li.style.background = "#f0f0f0")
            );
            li.addEventListener(
                "mouseout",
                () => (li.style.background = "white")
            );

            // Utiliser mousedown pour éviter le problème de focus
            li.addEventListener("mousedown", () => {
                searchInput.value = city.display_name;
                suggestions.innerHTML = "";

                // Récupérer les coordonnées
                // alert(
                //     `Ville: ${city.display_name}\nLatitude: ${lat}\nLongitude: ${lon}`
                // );
                start = [parseFloat(city.lon), parseFloat(city.lat)];
                console.log("start from search :", start);
            });

            suggestions.appendChild(li);
        });
    } catch (error) {
        console.error("Erreur API:", error);
    }
}

async function loadData() {
    try {
        const res = await fetch("/data/data.json"); // JSON dans public/
        dataDB = await res.json(); // met le tableau dans la variable globale
    } catch (err) {
        console.error("Erreur en chargeant dataDB :", err);
    }
}

async function getLocation() {
    //TODO: Redemander la localisation si il a refusé
    if (!navigator.geolocation) {
        result.textContent =
            "La géolocalisation n’est pas supportée par ce navigateur.";
        return;
    }
    //TODO: récupérer la ville en fonction des coordonnées pour afficher
    // Récupération des coordonnées GPS de l'utilisateur
    start = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve([position.coords.longitude, position.coords.latitude]); // ORS attend [lon, lat]
            },
            (error) => {
                switch (
                    error.code //TODO: ecrire les messages d'erreurs au bon endroit
                ) {
                    case error.PERMISSION_DENIED:
                        reject(
                            "Permission refusée pour accéder à la géolocalisation."
                        );
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject("Position indisponible.");
                        break;
                    case error.TIMEOUT:
                        reject("La requête de géolocalisation a expiré.");
                        break;
                    default:
                        reject("Erreur inconnue lors de la géolocalisation.");
                }
            }
        );
    });
}

async function callAPIServeur(candidats) {
    try {
        // Destinations
        // const end = new Array(5).fill(null).map(() => [9.19, 45.4642]);

        const end = candidats.map((item) => [item.longitude, item.latitude]);
        console.log(end);

        const endStr = encodeURIComponent(JSON.stringify(end));

        // Appel à l'API Matrix
        const res = await fetch(
            `/api/duration?start=${start.join(",")}&end=${endStr}`
        );
        const data = await res.json();

        // Gestion des erreurs de l'API
        if (data.error) {
            result.textContent = "Coordonnées incorrectes ou non routables.";
            return;
        }

        if (!data.durations || !data.durations.length) {
            result.textContent =
                "Aucun itinéraire trouvé pour ces coordonnées.";
            return;
        }
        console.log("data récupéré par l'api");
        return data;
    } catch (err) {
        result.textContent = "Erreur : " + err;
        console.error(err);
    }
}

function displayResult(data, candidats, maxTime) {
    // On crée un tableau vide pour stocker les phrases
    let phrases = [];
    let vide = true;

    let divResult = document.querySelector(".divResult");
    let list_canyon = document.createElement("ul");

    // On parcourt toutes les destinations
    for (let i = 0; i < data.durations.length; i++) {
        let duree = data.durations[i]; // temps en secondes
        let distance = data.distances[i]; // distance en mètres
        let nom = candidats[i].name; // nom du candidat

        // On arrondit la distance en km et la durée en minutes
        let distanceKm = Math.round(distance / 1000);
        let dureeMin = Math.round(duree / 60);

        if (dureeMin <= maxTime) {
            vide = false;
            // On crée la phrase pour ce candidat
            let phrase = nom + ": " + distanceKm + " km, " + dureeMin + " min";

            let canyon = document.createElement("li");
            canyon.classList.add("canyon");
            canyon.textContent = phrase;

            divResult.appendChild(canyon);
        }
    }

    divResult.appendChild(list_canyon);

    if (vide) {
        phrases.push("aucun canyon trouvé pour ce temps de voiture");
    }

    // On transforme le tableau de phrases en un seul texte avec des sauts de ligne
    let infos = phrases.join("\n");

    // On affiche le texte dans l'élément result
    result.textContent = infos;
}

function getMaxTime() {
    return Number(document.getElementById("maxTime").value);
}

function toRadians(deg) {
    return deg * (Math.PI / 180);
}

function haversine(start, end) {
    const R = 6371.0; // km

    const lon1 = start[0];
    const lat1 = start[1];
    const lon2 = end[0];
    const lat2 = end[1];

    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;

    const sinDlat2 = Math.sin(dlat / 2);
    const sinDlon2 = Math.sin(dlon / 2);

    const a =
        sinDlat2 * sinDlat2 +
        Math.cos(lat1) * Math.cos(lat2) * sinDlon2 * sinDlon2;
    const c = 2 * Math.asin(Math.sqrt(a));

    return R * c;
}

function getCandidats(maxTime, start) {
    let startRad = [toRadians(start[0]), toRadians(start[1])];
    let candidats = [];
    let maxDistance = AVERAGE_SPEED * (maxTime / 60);
    dataDB.forEach((canyon) => {
        let endRad = [toRadians(canyon.longitude), toRadians(canyon.latitude)];
        let dist = haversine(startRad, endRad);
        if (dist <= maxDistance && canyon.styleUrl == "#msn_info") {
            candidats.push({
                name: canyon.name,
                latitude: canyon.latitude,
                longitude: canyon.longitude,
                distance_km: Number(dist.toFixed(2)), //TODO: supprimer la distance ca sert à rien
            });
        }
    });
    //TODO: Comprendre et gérer les cas avec distance de 0km
    return candidats;
}

function getCoordMannuelUser(start) {
    let coordonnee = document.getElementById("coordonnee").value;
    let regex = /(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/;
    let match = coordonnee.match(regex);

    if (match) {
        let lat = parseFloat(match[1]);
        let lng = parseFloat(match[2]);
        start = [lng, lat];
    }
    return start;
}

// Appel au démarrage
loadData();
