const btn = document.getElementById("testBtn");
const result = document.getElementById("result");

btn.addEventListener("click", async () => {
  // Exemple de points
  const start = [9.484291, 45.87767];
  const end = [9.506779, 45.883766];

  try {
    const res = await fetch(
      `/api/duration?start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`,
    );
    const data = await res.json();
    const duration = data.features[0].properties.segments[0].duration; // en secondes

    result.textContent = `Durée en voiture : ${Math.round(duration / 60)} minutes`;
  } catch (err) {
    result.textContent = "Erreur lors de l’appel à l’API";
    console.error(err);
  }
});
