export default async function handler(req, res) {
  const { start, end } = req.query; // start et end : "lat,lon" ou "lon,lat"

  const API_KEY = process.env.ORS_API_KEY;

  const startCoords = start.split(",").map(Number);
  const endCoords = end.split(",").map(Number);

  // Construire l'URL avec encodage
  const url =
    `https://api.openrouteservice.org/v2/directions/driving-car?` +
    `api_key=${encodeURIComponent(API_KEY)}` +
    `&start=${encodeURIComponent(`${startCoords[0]},${startCoords[1]}`)}` +
    `&end=${encodeURIComponent(`${endCoords[0]},${endCoords[1]}`)}`;

  console.log("url:", url);

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data); // renvoie le JSON au front
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l’appel à l’API" });
  }
}
