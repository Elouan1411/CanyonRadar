# 🌄 Canyon Radar 🧗‍♂️

Canyon Radar is a web app to help you plan **canyoning trips** based on a chosen location. You can use your **current location** 📍 or pick a point on a map 🗺️. The app finds all canyons reachable within a specified **driving time** ⏱️ and lets you **export the results** 📊 to CSV or Excel for planning.

## 🚀 Live Demo

Try it here: [Canyon Radar](https://canyon-radar.elouanboiteux.fr) 🌐

---

## ✨ Features

-   **Find nearby canyons** 🏞️
    Enter a location (current location or map point) and a maximum driving time. The app shows all canyons reachable within that time.

-   **Export data** 📄
    Export the filtered canyon data, including coordinates and canyon info, to CSV or Excel for planning or analysis.

---

## ⚙️ How it works

-   Uses the [OpenRouteService Directions API](https://openrouteservice.org/) 🚗 to calculate driving times between points.
-   A **Node.js backend** hosted on **Vercel** 🟣 handles API requests securely, keeping the API key hidden from the client.
-   Frontend built with **HTML, CSS, and JavaScript** 💻.
-   Canyon data stored in `data.json` 🗂️, processed to filter locations based on driving time.

---

## 🗂️ Project Structure

```
canyon-radar/
├─ api/
│   └─ duration.js       # Node.js API for driving times
├─ data.json             # Canyon locations & info
├─ index.html            # Frontend HTML
├─ app.js                # Frontend JS
├─ style.css             # Frontend CSS
├─ README.md
```

---

## 🏃‍♂️ Usage

1. Open the app in your browser 🌐.
2. Choose a location (current location 📍 or select a point 🗺️) and set a maximum driving time ⏱️.
3. View all reachable canyons 🏞️.
4. Export the results to CSV/Excel 📊 for planning your adventure.

---

## 💡 Notes

-   Pre-filters canyons by straight-line distance (Haversine formula) 🧮 to reduce API calls.
-   Then uses OpenRouteService 🚗 for precise driving time calculations.
-   Hosted entirely on **Vercel** 🟣 combining frontend and backend for simplicity and security.

---

# Licence

CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/

-   Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
-   NonCommercial — You may not use the material for commercial purposes.
-   ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.
-   No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.

Data is from https://www.descente-canyon.com/ and all their excellent committers, you rock!
