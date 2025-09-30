import re
import json
import unicodedata
import difflib


def normalize(s):
    """Normalise: retire accents, met en minuscules, remplace ponctuation par espace."""
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def strip_trailing_version(name):
    """Enlève la version numérique terminale comme ' 2.2' ou ' 1'"""
    if not name:
        return name
    return re.sub(r"\s+\d+(\.\d+)?$", "", name.strip())


# --------------------------
# 1) Parser le fichier summary
# --------------------------
with open("descente-canyon-summaries.kml", "r", encoding="utf-8") as f:
    content = f.read()

placemarks = re.findall(r"<Placemark>(.*?)</Placemark>", content, re.DOTALL)
canyons = []
for pm in placemarks:
    name_match = re.search(r"<name>(.*?)</name>", pm)
    if name_match:
        full_name = name_match.group(1).strip()

        # Regex pour séparer le nom et la note
        m = re.match(r"^(.*)\s+([\d.]+)$", full_name)
        if m:
            name = m.group(1).strip()
            note = float(m.group(2))
        else:
            name = full_name
            note = None
    else:
        name = None
        note = None

    coord_match = re.search(r"<coordinates>(.*?)</coordinates>", pm)
    if coord_match:
        lon, lat, *_ = coord_match.group(1).split(",")
        lon = float(lon.strip())
        lat = float(lat.strip())
    else:
        lon, lat = None, None

    link_match = re.search(r'<a href="(.*?)">', pm)
    link = link_match.group(1) if link_match else None
    link = link.replace("https://www.descente-canyon.com/canyoning", "")

    fields = {
        "alt_dep": r"Altitude de Départ.*?<td>(.*?)</td>",
        "deniv": r"Dénivelé.*?<td>(.*?)</td>",
        "longueur": r"Longueur.*?<td>(.*?)</td>",
        "haut_max": r"Hauteur max cascade.*?<td>(.*?)</td>",
        "cotation": r"Cotation.*?<td>(.*?)</td>",
        "corde": r"L. corde simple.*?<td>(.*?)</td>",
        "tps_approche": r"Temps de approche.*?<td>(.*?)</td>",
        "tps_desc": r"Temps de descente.*?<td>(.*?)</td>",
        "tps_retour": r"Temps de retour.*?<td>(.*?)</td>",
        "navette": r"Navette.*?<td>(.*?)</td>",
    }

    data = {"name": name, "note": note, "long": lon, "lat": lat, "DC_link": link}
    for key, regex in fields.items():
        m = re.search(regex, pm, re.DOTALL)
        data[key] = m.group(1).replace("&#xe9;", "é") if m else None

    canyons.append(data)

# --------------------------
# 2) Préparer index de noms normalisés pour le matching
# --------------------------
canyon_index = []
for i, c in enumerate(canyons):
    orig = c.get("name", "")
    nover = strip_trailing_version(orig)
    norm_full = normalize(orig)
    norm_nover = normalize(nover)
    canyon_index.append(
        {"i": i, "orig": orig, "nover": nover, "norm_full": norm_full, "norm_nover": norm_nover}
    )

# --------------------------
# 3) Parser le fichier de points et faire la fusion intelligente
# --------------------------
with open("descente-canyon-positions.kml", "r", encoding="utf-8") as f:
    content2 = f.read()

placemarks2 = re.findall(r"<Placemark>(.*?)</Placemark>", content2, re.DOTALL)

unmatched = []
matched_count = 0
for pm in placemarks2:
    name_match = re.search(r"<name>(.*?)</name>", pm)
    if not name_match:
        continue
    full_name = name_match.group(1).strip()
    norm_full_name = normalize(full_name)

    coord_match = re.search(r"<coordinates>(.*?)</coordinates>", pm)
    if coord_match:
        lon, lat, *_ = coord_match.group(1).split(",")
        lon, lat = float(lon.strip()), float(lat.strip())
    else:
        lon, lat = None, None

    # Chercher le meilleur canyon: on privilégie le préfixe le plus long
    best = None
    best_len = 0
    # 1) exact prefix on nover or full
    for item in canyon_index:
        for cand in (item["norm_nover"], item["norm_full"]):
            if cand and norm_full_name.startswith(cand):
                if len(cand) > best_len:
                    best = item
                    best_len = len(cand)
    # 2) containment fallback (si prefix non trouvé)
    if best is None:
        for item in canyon_index:
            cand = item["norm_nover"]
            if cand and cand in norm_full_name and len(cand) > best_len:
                best = item
                best_len = len(cand)
    # 3) fuzzy fallback (difflib)
    if best is None:
        candidates = [it["norm_nover"] for it in canyon_index if it["norm_nover"]]
        close = difflib.get_close_matches(norm_full_name, candidates, n=1, cutoff=0.7)
        if close:
            # retrouver item
            for it in canyon_index:
                if it["norm_nover"] == close[0]:
                    best = it
                    break

    if best is None:
        unmatched.append({"point_name": full_name, "coords": (lon, lat)})
        continue

    # Déterminer le type du point : portion après le nom du canyon (normalisée)
    remainder = norm_full_name[best_len:].strip() if best_len else ""
    # Si rien, on essaie de déduire à partir des tokens originaux
    if not remainder:
        # tente token-based removal sur le nom original sans version
        nover_orig = best["nover"]
        tokens_full = full_name.split()
        tokens_nover = nover_orig.split()
        if len(tokens_full) > len(tokens_nover) and tokens_full[: len(tokens_nover)] == tokens_nover:
            remainder = " ".join(tokens_full[len(tokens_nover) :])
        else:
            # fallback final : prend le dernier token
            remainder = tokens_full[-1] if tokens_full else "unknown"
    # normaliser remainder pour clef
    point_type = re.sub(r"[^a-z0-9]+", "_", remainder.strip()) if remainder else "unknown"
    point_type = point_type.strip("_") or "unknown"

    # stocker dans canyons (si doublons, garder liste)
    canyon_obj = canyons[best["i"]]
    pts = canyon_obj.setdefault("points", {})
    entry = {"long": lon, "lat": lat}
    if point_type in pts:
        if isinstance(pts[point_type], list):
            pts[point_type].append(entry)
        else:
            pts[point_type] = [pts[point_type], entry]
    else:
        pts[point_type] = entry

    matched_count += 1

# sauvegarde finale
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(canyons, f, ensure_ascii=False, indent=2)

print(f"Points traités: {len(placemarks2)}, matched: {matched_count}, unmatched: {len(unmatched)}")
if unmatched:
    print("Points non appariés:")
    for u in unmatched:
        print(" -", u)
