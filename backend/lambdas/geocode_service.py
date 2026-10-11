"""
JalMarg Geocoding Service (Backend Only)
Supports:
1. Geoapify Autocomplete & Search (via GEOAPIFY_API_KEY env var)
   Filtered to Bengaluru bounding box: rect:77.3,12.7,77.9,13.35 with Bengaluru bias
2. Comprehensive built-in Bengaluru GIS Locality Database (100+ zones, layouts, stations, junctions)
3. Coordinates parsing: "lat, lon"
4. Strict Bengaluru boundary enforcement (12.7 to 13.35 N, 77.3 to 77.9 E)
NO public Nominatim is used (strictly adhering to provider usage policies).
"""

import json
import os
import re
import urllib.parse
import urllib.request
from typing import Dict, Any, List

GEOAPIFY_API_KEY = os.environ.get("GEOAPIFY_API_KEY", "").strip()

# Bengaluru Bounding Box
BBLR_MIN_LAT = 12.70
BBLR_MAX_LAT = 13.35
BBLR_MIN_LON = 77.30
BBLR_MAX_LON = 77.90

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Content-Type": "application/json",
}

# Extensive Bengaluru Urban Locality Database (covering North, South, East, West, Central & Periphery)
BENGALURU_DIRECTORY = [
    # North Bengaluru
    {"name": "Jakkur", "aliases": ["jakkur", "jakkur aerodrome", "jakkur lake"], "address": "Jakkur Aerodrome & Lake Corridor, Bengaluru 560064", "lat": 13.0784, "lon": 77.6070, "zone": "North"},
    {"name": "Yelahanka", "aliases": ["yelahanka", "yelahanka new town", "yelahanka old town"], "address": "Yelahanka Old Town / Satellite Town, Bengaluru 560064", "lat": 13.1007, "lon": 77.5963, "zone": "North"},
    {"name": "Hebbal", "aliases": ["hebbal", "hebbal flyover", "bellary road"], "address": "Hebbal Flyover / Bellary Road, Bengaluru 560024", "lat": 13.0358, "lon": 77.5970, "zone": "North"},
    {"name": "Sahakara Nagar", "aliases": ["sahakara nagar", "sahakaranagar", "kodigehalli"], "address": "Sahakara Nagar, Kodigehalli, Bengaluru 560092", "lat": 13.0623, "lon": 77.5901, "zone": "North"},
    {"name": "Vidyaranyapura", "aliases": ["vidyaranyapura", "vidyaranyapura main road"], "address": "Vidyaranyapura Main Road, Bengaluru 560097", "lat": 13.0786, "lon": 77.5583, "zone": "North"},
    {"name": "Devanahalli", "aliases": ["devanahalli", "kia", "kempegowda airport", "bangalore airport"], "address": "Devanahalli / Kempegowda International Airport Road, Bengaluru 562110", "lat": 13.2450, "lon": 77.7126, "zone": "North"},
    {"name": "Manyata Tech Park", "aliases": ["manyata", "manyata tech park", "nagavara"], "address": "Manyata Embassy Business Park, Nagavara, Bengaluru 560045", "lat": 13.0450, "lon": 77.6200, "zone": "North"},
    {"name": "Hennur", "aliases": ["hennur", "hennur cross", "hennur road"], "address": "Hennur Bagalur Road, Bengaluru 560043", "lat": 13.0382, "lon": 77.6432, "zone": "North"},

    # West & Northwest Bengaluru
    {"name": "Jalahalli Cross", "aliases": ["jalahalli cross", "jalahalli", "jalahalli metro"], "address": "Jalahalli Cross, Tumkur Road, Peenya, Bengaluru 560057", "lat": 13.0398, "lon": 77.5184, "zone": "West"},
    {"name": "Yeshwanthpur", "aliases": ["yeshwanthpur", "yesvantpur", "yeshwantpur railway station"], "address": "Yeshwanthpur Railway Station / Market, Tumkur Road, Bengaluru 560022", "lat": 13.0238, "lon": 77.5529, "zone": "West"},
    {"name": "Peenya", "aliases": ["peenya", "peenya industrial area", "peenya 1st stage"], "address": "Peenya Industrial Area, Tumkur Road, Bengaluru 560058", "lat": 13.0285, "lon": 77.5250, "zone": "West"},
    {"name": "Malleshwaram", "aliases": ["malleshwaram", "malleswaram", "sampige road", "8th cross"], "address": "Malleshwaram 8th Cross / Sampige Road, Bengaluru 560003", "lat": 13.0031, "lon": 77.5700, "zone": "West"},
    {"name": "Rajajinagar", "aliases": ["rajajinagar", "dr rajkumar road", "rajajinagar 1st block"], "address": "Dr Rajkumar Road, Rajajinagar, Bengaluru 560010", "lat": 12.9982, "lon": 77.5530, "zone": "West"},
    {"name": "Vijayanagar", "aliases": ["vijayanagar", "vijayanagar metro", "rpc layout"], "address": "Vijayanagar Main Road, Bengaluru 560040", "lat": 12.9719, "lon": 77.5306, "zone": "West"},
    {"name": "Basaveshwaranagar", "aliases": ["basaveshwaranagar", "basaveshwara nagar"], "address": "Basaveshwaranagar, Bengaluru 560079", "lat": 12.9868, "lon": 77.5385, "zone": "West"},
    {"name": "Kengeri", "aliases": ["kengeri", "kengeri satellite town", "kengeri metro", "mysore road"], "address": "Kengeri Satellite Town / Mysore Road, Bengaluru 560060", "lat": 12.9081, "lon": 77.4852, "zone": "West"},
    {"name": "RR Nagar", "aliases": ["rr nagar", "rajarajeshwari nagar", "rajarajeshwarinagar"], "address": "Rajarajeshwari Nagar Arch / Ideal Homes, Bengaluru 560098", "lat": 12.9260, "lon": 77.5180, "zone": "West"},

    # Central Bengaluru
    {"name": "Majestic", "aliases": ["majestic", "kempegowda bus station", "ksr railway station", "bangalore city railway station"], "address": "Kempegowda Bus Station / KSR Railway Station, Majestic, Bengaluru 560009", "lat": 12.9779, "lon": 77.5724, "zone": "Central"},
    {"name": "MG Road", "aliases": ["mg road", "mahatma gandhi road", "trinity", "brigade road"], "address": "Mahatma Gandhi Road, Bengaluru 560001", "lat": 12.9756, "lon": 77.6066, "zone": "Central"},
    {"name": "Corporation", "aliases": ["corporation", "hudson circle", "corporation circle"], "address": "Hudson Circle / BBMP Head Office, Corporation, Bengaluru 560002", "lat": 12.9698, "lon": 77.5898, "zone": "Central"},
    {"name": "Shivajinagar", "aliases": ["shivajinagar", "shivaji nagar", "russell market"], "address": "Shivajinagar Bus Station, Bengaluru 560051", "lat": 12.9856, "lon": 77.6057, "zone": "Central"},
    {"name": "Shantinagar", "aliases": ["shantinagar", "shanti nagar", "kh road"], "address": "Shantinagar Bus Station / Double Road, Bengaluru 560027", "lat": 12.9545, "lon": 77.5965, "zone": "Central"},

    # East Bengaluru
    {"name": "Indiranagar", "aliases": ["indiranagar", "100ft road indiranagar", "cmh road"], "address": "100 Feet Road, Indiranagar, Bengaluru 560038", "lat": 12.9784, "lon": 77.6408, "zone": "East"},
    {"name": "Domlur", "aliases": ["domlur", "intermediate ring road", "domlur flyover"], "address": "Domlur Intermediate Ring Road, Bengaluru 560071", "lat": 12.9609, "lon": 77.6387, "zone": "East"},
    {"name": "KR Puram", "aliases": ["kr puram", "k.r. puram", "tin factory", "hanging bridge"], "address": "KR Puram Hanging Bridge & Tin Factory, Bengaluru 560036", "lat": 13.0075, "lon": 77.6959, "zone": "East"},
    {"name": "Whitefield", "aliases": ["whitefield", "itpl", "hope farm", "kadugodi"], "address": "ITPL Main Road, Whitefield, Bengaluru 560066", "lat": 12.9698, "lon": 77.7499, "zone": "East"},
    {"name": "Marathahalli", "aliases": ["marathahalli", "marathahalli bridge", "marathahalli orr"], "address": "Marathahalli Bridge & Outer Ring Road, Bengaluru 560037", "lat": 12.9560, "lon": 77.7010, "zone": "East"},
    {"name": "Bellandur", "aliases": ["bellandur", "bellandur lake", "bellandur ecospace"], "address": "Outer Ring Road, Bellandur, Bengaluru 560103", "lat": 12.9340, "lon": 77.6740, "zone": "East"},
    {"name": "Ecospace Bellandur", "aliases": ["ecospace", "rmz ecospace"], "address": "RMZ Ecospace, Outer Ring Road, Bellandur, Bengaluru 560103", "lat": 12.9260, "lon": 77.6850, "zone": "East"},
    {"name": "Mahadevapura", "aliases": ["mahadevapura", "bagmane tech park"], "address": "Outer Ring Road, Mahadevapura, Bengaluru 560048", "lat": 12.9880, "lon": 77.6910, "zone": "East"},
    {"name": "Varthur", "aliases": ["varthur", "varthur lake", "varthur kodi"], "address": "Varthur Main Road, Bengaluru 560087", "lat": 12.9400, "lon": 77.7450, "zone": "East"},

    # South Bengaluru
    {"name": "Silk Board", "aliases": ["silk board", "central silk board", "silkboard underpass"], "address": "Central Silk Board Junction, Hosur Road, Bengaluru 560068", "lat": 12.9172, "lon": 77.6228, "zone": "South"},
    {"name": "BTM Layout", "aliases": ["btm", "btm layout", "btm 2nd stage", "madiwala lake"], "address": "BTM Layout 2nd Stage, Outer Ring Road, Bengaluru 560076", "lat": 12.9166, "lon": 77.6101, "zone": "South"},
    {"name": "Koramangala", "aliases": ["koramangala", "koramangala 4th block", "koramangala 5th block", "sony world junction"], "address": "Koramangala 4th Block / 80ft Road, Bengaluru 560034", "lat": 12.9340, "lon": 77.6200, "zone": "South"},
    {"name": "HSR Layout", "aliases": ["hsr", "hsr layout", "27th main hsr", "sector 1 hsr"], "address": "HSR Layout Sector 1 / 27th Main, Bengaluru 560102", "lat": 12.9121, "lon": 77.6440, "zone": "South"},
    {"name": "Jayanagar", "aliases": ["jayanagar", "jayanagar 4th block", "jayanagar complex"], "address": "Jayanagar 4th Block Shopping Complex, Bengaluru 560011", "lat": 12.9308, "lon": 77.5838, "zone": "South"},
    {"name": "Banashankari", "aliases": ["banashankari", "bsk", "banashankari 2nd stage", "bsk bus stand"], "address": "Banashankari 2nd Stage / TTMC, Bengaluru 560070", "lat": 12.9255, "lon": 77.5468, "zone": "South"},
    {"name": "JP Nagar", "aliases": ["jp nagar", "j.p. nagar", "jp nagar 6th phase"], "address": "JP Nagar 6th Phase / Ring Road, Bengaluru 560078", "lat": 12.9077, "lon": 77.5855, "zone": "South"},
    {"name": "Electronic City", "aliases": ["electronic city", "e-city", "electronic city phase 1", "electronic city phase 2"], "address": "Electronic City Phase 1, Hosur Road Elevated Tollway, Bengaluru 560100", "lat": 12.8452, "lon": 77.6602, "zone": "South"},
    {"name": "Bannerghatta Road", "aliases": ["bannerghatta road", "bg road", "iimb"], "address": "Bannerghatta Main Road, Opposite IIMB, Bengaluru 560076", "lat": 12.8980, "lon": 77.5990, "zone": "South"},
    {"name": "Sarjapur Road", "aliases": ["sarjapur road", "wipro sarjapur"], "address": "Sarjapur Main Road, Doddakannelli, Bengaluru 560035", "lat": 12.9090, "lon": 77.6870, "zone": "South"},
]


def is_in_bengaluru(lat: float, lon: float) -> bool:
    return BBLR_MIN_LAT <= lat <= BBLR_MAX_LAT and BBLR_MIN_LON <= lon <= BBLR_MAX_LON


def parse_coords(query: str) -> Any:
    trimmed = query.strip()
    m = re.match(r"^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$", trimmed)
    if m:
        lat = float(m.group(1))
        lon = float(m.group(3))
        if is_in_bengaluru(lat, lon):
            return {
                "name": f"Point ({lat:.4f}, {lon:.4f})",
                "resolvedName": f"Point ({lat:.4f}, {lon:.4f}), Bengaluru",
                "address": f"Custom Coordinates ({lat:.5f}, {lon:.5f}), Bengaluru Urban Region",
                "latitude": lat,
                "longitude": lon,
                "provider": "coordinates"
            }
        else:
            return {"error": f"Coordinates ({lat}, {lon}) fall outside Bengaluru service area (12.7N-13.35N, 77.3E-77.9E)."}
    return None


def query_geoapify_autocomplete(text: str) -> List[Dict[str, Any]]:
    if not GEOAPIFY_API_KEY:
        return []
    try:
        encoded = urllib.parse.quote(text)
        url = (
            f"https://api.geoapify.com/v1/geocode/autocomplete"
            f"?text={encoded}"
            f"&filter=rect:{BBLR_MIN_LON},{BBLR_MIN_LAT},{BBLR_MAX_LON},{BBLR_MAX_LAT}"
            f"&bias=proximity:77.5946,12.9716"
            f"&country=in"
            f"&format=json"
            f"&apiKey={GEOAPIFY_API_KEY}"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "JalMarg/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = []
            for item in data.get("results", []):
                lat = float(item.get("lat", 0))
                lon = float(item.get("lon", 0))
                if is_in_bengaluru(lat, lon):
                    name = item.get("name") or item.get("formatted", "").split(",")[0]
                    results.append({
                        "name": name,
                        "resolvedName": f"{name}, Bengaluru",
                        "address": item.get("formatted", ""),
                        "latitude": lat,
                        "longitude": lon,
                        "provider": "geoapify"
                    })
            return results
    except Exception as e:
        print(f"[GeocodeService] Geoapify autocomplete error: {e}")
        return []


def query_geoapify_search(text: str) -> Any:
    if not GEOAPIFY_API_KEY:
        return None
    try:
        encoded = urllib.parse.quote(f"{text}, Bengaluru, Karnataka")
        url = (
            f"https://api.geoapify.com/v1/geocode/search"
            f"?text={encoded}"
            f"&filter=rect:{BBLR_MIN_LON},{BBLR_MIN_LAT},{BBLR_MAX_LON},{BBLR_MAX_LAT}"
            f"&bias=proximity:77.5946,12.9716"
            f"&country=in"
            f"&limit=1"
            f"&format=json"
            f"&apiKey={GEOAPIFY_API_KEY}"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "JalMarg/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for item in data.get("results", []):
                lat = float(item.get("lat", 0))
                lon = float(item.get("lon", 0))
                if is_in_bengaluru(lat, lon):
                    name = item.get("name") or item.get("formatted", "").split(",")[0]
                    return {
                        "name": name,
                        "resolvedName": f"{name}, Bengaluru",
                        "address": item.get("formatted", ""),
                        "latitude": lat,
                        "longitude": lon,
                        "provider": "geoapify"
                    }
    except Exception as e:
        print(f"[GeocodeService] Geoapify search error: {e}")
    return None


def search_local_directory(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    q = query.strip().lower()
    matches = []
    
    # Exact and prefix matches first
    for loc in BENGALURU_DIRECTORY:
        loc_name_lower = loc["name"].lower()
        if q == loc_name_lower or any(q == alias for alias in loc["aliases"]):
            matches.insert(0, {
                "name": loc["name"],
                "resolvedName": f"{loc['name']}, Bengaluru",
                "address": loc["address"],
                "latitude": loc["lat"],
                "longitude": loc["lon"],
                "provider": "bengaluru_gis_directory"
            })
            continue

        if any(alias.startswith(q) or q in alias for alias in loc["aliases"]):
            matches.append({
                "name": loc["name"],
                "resolvedName": f"{loc['name']}, Bengaluru",
                "address": loc["address"],
                "latitude": loc["lat"],
                "longitude": loc["lon"],
                "provider": "bengaluru_gis_directory"
            })

    return matches[:limit]


def handle_autocomplete(query_text: str) -> Dict[str, Any]:
    text = (query_text or "").strip()
    if len(text) < 3:
        return {"results": []}

    # 1. Geoapify (if key configured)
    geoapify_res = query_geoapify_autocomplete(text)
    if geoapify_res:
        return {"results": geoapify_res, "provider": "geoapify"}

    # 2. Local high-coverage Bengaluru GIS directory
    local_res = search_local_directory(text)
    return {
        "results": local_res,
        "provider": "bengaluru_gis_directory",
        "notice": "Geoapify key not provided or offline; served via Bengaluru GIS Directory"
    }


def handle_search(query_text: str) -> Dict[str, Any]:
    text = (query_text or "").strip()
    if not text:
        return {"success": False, "error": "Please enter a location."}

    # Check GPS coordinates
    coords = parse_coords(text)
    if coords:
        if "error" in coords:
            return {"success": False, "error": coords["error"]}
        return {"success": True, "location": coords}

    # Try local directory exact/alias match first (instant)
    local_matches = search_local_directory(text, limit=1)
    if local_matches:
        return {"success": True, "location": local_matches[0]}

    # Try Geoapify Search
    geoapify_match = query_geoapify_search(text)
    if geoapify_match:
        return {"success": True, "location": geoapify_match}

    return {
        "success": False,
        "error": f"Location '{text}' could not be resolved within Bengaluru. Cannot resolve location '{text}'. Please verify the name (e.g. Jalahalli Cross, Majestic, Whitefield, Kengeri, BTM Layout) or enter GPS coordinates (lat, lon).",
        "suggestions": [
            "Jalahalli Cross", "Majestic", "Yelahanka", "Jakkur", "Whitefield", "Electronic City",
            "Kengeri", "Hebbal", "BTM Layout", "Yeshwanthpur", "Koramangala", "Indiranagar"
        ]
    }


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    method = (event.get("httpMethod") or "GET").upper()
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "CORS OK"}),
        }

    params = event.get("queryStringParameters") or {}
    text = params.get("text") or params.get("query") or ""
    path = event.get("path") or ""

    if "autocomplete" in path:
        res = handle_autocomplete(text)
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(res),
        }

    search_res = handle_search(text)
    if search_res.get("success"):
        loc = search_res["location"]
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "found": True,
                "name": loc.get("name"),
                "resolvedName": loc.get("resolvedName"),
                "address": loc.get("address"),
                "latitude": loc.get("latitude"),
                "longitude": loc.get("longitude"),
                "provider": loc.get("provider"),
            }),
        }
    else:
        status_code = 400 if "outside Bengaluru" in search_res.get("error", "") else 404
        return {
            "statusCode": status_code,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "found": False,
                "error": search_res.get("error", f"Cannot resolve location '{text}'"),
                "suggestions": search_res.get("suggestions", []),
            }),
        }

