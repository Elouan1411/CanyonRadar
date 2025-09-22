const btn = document.getElementById("testBtn");
const result = document.getElementById("result");

btn.addEventListener("click", async () => {
  if (!navigator.geolocation) {
    result.textContent =
      "La géolocalisation n’est pas supportée par ce navigateur.";
    return;
  }

  try {
    // Récupération des coordonnées GPS de l'utilisateur
    const start = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject("Permission refusée pour accéder à la géolocalisation.");
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
        },
      );
    });

    result.textContent = `Coordonnées récupérées : ${start[0]}, ${start[1]}`;

    const end = [9.19, 45.4642];

    // Appel à l'API
    const res = await fetch(
      `/api/duration?start=${start[1]},${start[0]}&end=${end[0]},${end[1]}`,
    );
    const data = await res.json();

    // Gestion des erreurs de l'API
    if (data.error) {
      result.textContent = "Coordonnées incorrectes ou non routables.";
      return;
    }

    if (!data.features || data.features.length === 0) {
      result.textContent = "Aucun itinéraire trouvé pour ces coordonnées.";
      return;
    }

    const segment = data.features[0].properties.segments?.[0];
    if (!segment) {
      result.textContent = "Impossible de récupérer la durée";
      return;
    }

    const duration = segment.duration;
    result.textContent = `Durée en voiture : ${Math.round(duration / 60)} minutes`;
  } catch (err) {
    result.textContent = err;
    console.error(err);
  }

  let choix = document.querySelector(
    'input[name="choiceLocation"]:checked',
  ).value;
  result.textContent = "Le choix sélectionné est : " + choix;
});

const searchInput = document.getElementById("search");
const suggestions = document.getElementById("suggestions");

// Debounce pour limiter les requêtes
let timeout;
searchInput.addEventListener("input", () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    doSearch(searchInput.value.trim());
  }, 300);
});

async function doSearch(query) {
  suggestions.innerHTML = ""; // Vider les anciennes suggestions

  if (query.length < 3) return;

  let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;

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

      li.addEventListener("mouseover", () => (li.style.background = "#f0f0f0"));
      li.addEventListener("mouseout", () => (li.style.background = "white"));

      // Utiliser mousedown pour éviter le problème de focus
      li.addEventListener("mousedown", () => {
        searchInput.value = city.display_name;
        suggestions.innerHTML = "";

        // Récupérer les coordonnées
        const lat = city.lat;
        const lon = city.lon;
        alert(
          `Ville: ${city.display_name}\nLatitude: ${lat}\nLongitude: ${lon}`,
        );
      });

      suggestions.appendChild(li);
    });
  } catch (error) {
    console.error("Erreur API:", error);
  }
}
