export default async function handler(req, res) {
    const { start, end } = req.query;

    const API_KEY = process.env.ORS_API_KEY;

    if (!start || !end) {
        return res
            .status(400)
            .json({ error: "Paramètres 'start' et 'end' requis" });
    }

    // Parse start
    const startCoords = start.split(",").map(Number);

    // Parse destinations
    let destinations = [];
    try {
        destinations = JSON.parse(end).map((pair) => pair.map(Number));
    } catch (err) {
        return res.status(400).json({ error: "Paramètre 'end' invalide" });
    }

    // Construire locations pour Matrix
    const locations = [startCoords, ...destinations];

    const body = {
        locations,
        sources: [0], // départ = index 0
        destinations: destinations.map((_, i) => i + 1), // indices destinations
        metrics: ["duration", "distance"], // calculer durée + distance
        units: "m", // mètres pour distance, secondes pour duration
    };

    try {
        const response = await fetch(
            "https://api.openrouteservice.org/v2/matrix/driving-car",
            {
                method: "POST",
                headers: {
                    Authorization: API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            return res.status(response.status).json({ error: text });
        }

        const data = await response.json();

        // data.durations[0] = temps vers chaque destination
        // data.distances[0] = distances vers chaque destination
        res.status(200).json({
            durations: data.durations[0],
            distances: data.distances[0],
            destinations,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Erreur lors de l’appel à l’API Matrix",
        });
    }
}
