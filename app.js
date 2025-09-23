const btn = document.getElementById("testBtn");
const result = document.getElementById("result");
let dataDB = [];
let suggestions, searchInput;
// Debounce pour limiter les requêtes
let timeout;

btn.addEventListener("click", async () => {
    let start;
    s;
    if (!navigator.geolocation) {
        result.textContent =
            "La géolocalisation n’est pas supportée par ce navigateur.";
        return;
    }

    try {
        // Récupération des coordonnées GPS de l'utilisateur
        start = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve([
                        position.coords.longitude,
                        position.coords.latitude,
                    ]); // ORS attend [lon, lat]
                },
                (error) => {
                    switch (error.code) {
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
                            reject(
                                "Erreur inconnue lors de la géolocalisation."
                            );
                    }
                }
            );
        });

        console.log("Coordonnées de départ :", start);
        result.textContent = `Coordonnées récupérées : ${start[1]}, ${start[0]}`;

        // Destinations
        // const end = new Array(5).fill(null).map(() => [9.19, 45.4642]);

        const X = 150; // nombre de destinations à prendre
        const end = dataDB
            .slice(0, X)
            .map((item) => [item.longitude, item.latitude]);
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

        // Affichage des distances et durées pour toutes les destinations
        const infos = data.durations
            .map((dur, i) => {
                const dist = data.distances[i];
                return `Destination ${i + 1}: ${Math.round(
                    dist / 1000
                )} km, ${Math.round(dur / 60)} min`;
            })
            .join("\n");

        result.textContent = infos;
    } catch (err) {
        result.textContent = "Erreur : " + err;
        console.error(err);
    }

    // Récupérer le choix de l'utilisateur (checkbox / radio)
    let choix = document.querySelector(
        'input[name="choiceLocation"]:checked'
    )?.value;
    if (choix) {
        result.textContent += `\nLe choix sélectionné est : ${choix}`;
    }
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
                const lat = city.lat;
                const lon = city.lon;
                alert(
                    `Ville: ${city.display_name}\nLatitude: ${lat}\nLongitude: ${lon}`
                );
            });

            suggestions.appendChild(li);
        });
    } catch (error) {
        console.error("Erreur API:", error);
    }
}

async function loadData() {
    try {
        const res = await fetch("/process/data.json"); // JSON dans public/
        dataDB = await res.json(); // met le tableau dans la variable globale
    } catch (err) {
        console.error("Erreur en chargeant dataDB :", err);
    }
}

let radiosChoiceLocation = document.querySelectorAll(
    'input[name="choiceLocation"]'
);
// Création du listener pour currentLocation
radiosChoiceLocation[0].addEventListener("change", function () {
    let divSearchCity = document.getElementById("divSearchCity");
    if (divSearchCity) {
        divSearchCity.remove();
    }
});

// Création de la barre de recherche si choix du select Location
radiosChoiceLocation[1].addEventListener("change", function () {
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

// Appel au démarrage
loadData();
