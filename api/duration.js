export default async function handler(req, res) {
  const { start, end } = req.query; // start et end : "lat,lon" ou "lon,lat"

  const API_KEY = process.env.ORS_API_KEY;

  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${start}&end=${end}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data); // renvoie le JSON au front
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l’appel à l’API" });
  }
}
