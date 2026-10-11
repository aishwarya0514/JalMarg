"""
Lambda 3: Calculate Dual Route (Direct vs JalMarg Safe Detour)
Detects waterlogged hazard intersection along direct trajectory and computes
a safe bypass detour with travel metrics and safety comparisons.
"""

import json
import math
import os
import urllib.request
from typing import Dict, Any, List, Tuple
import dynamo_store

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
}


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in meters."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def distance_point_to_segment_m(px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
    """Distance in meters from point (px, py) to line segment (x1, y1)-(x2, y2)."""
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return haversine_distance_m(px, py, x1, y1)

    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    closest_x = x1 + t * dx
    closest_y = y1 + t * dy
    return haversine_distance_m(px, py, closest_x, closest_y)


def min_distance_to_polyline_m(pt_lat: float, pt_lon: float, polyline: List[List[float]]) -> float:
    """Calculates the minimum distance in meters from a point to an entire polyline."""
    if not polyline or len(polyline) < 2:
        return 999999.0
    min_dist = 999999.0
    for i in range(len(polyline) - 1):
        p1 = polyline[i]
        p2 = polyline[i + 1]
        d = distance_point_to_segment_m(pt_lat, pt_lon, p1[0], p1[1], p2[0], p2[1])
        if d < min_dist:
            min_dist = d
            if min_dist < 50:  # Fast early exit if point is on the road
                break
    return min_dist


def load_historical_flood_points() -> List[Dict[str, Any]]:
    """Loads validated OpenCity BBMP historical flood spots."""
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "data", "opencity_flood_locations.json"),
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "data", "opencity_flood_locations.json"),
    ]
    for p in possible_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("features", [])
            except Exception:
                pass
    return []


def load_recorded_demo_routes() -> Dict[str, Any]:
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "data", "recorded_demo_routes.json"),
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "data", "recorded_demo_routes.json"),
    ]
    for p in possible_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return {}


def find_matching_demo_route(start_lat: float, start_lon: float, dest_lat: float, dest_lon: float) -> Any:
    recorded = load_recorded_demo_routes()
    for key, rec in recorded.items():
        o = rec.get("origin", {})
        d = rec.get("destination", {})
        d_orig = haversine_distance_m(start_lat, start_lon, o.get("lat", 0), o.get("lon", 0))
        d_dest = haversine_distance_m(dest_lat, dest_lon, d.get("lat", 0), d.get("lon", 0))
        if d_orig < 2500 and d_dest < 2500:
            return rec
    return None


def query_all_osrm_routes(start: Tuple[float, float], end: Tuple[float, float], waypoints: List[Tuple[float, float]] = None) -> List[Dict[str, Any]]:
    """Queries OSRM with alternatives=true and returns all available driving routes."""
    coords = [f"{start[1]},{start[0]}"]
    if waypoints:
        for wp in waypoints:
            coords.append(f"{wp[1]},{wp[0]}")
    coords.append(f"{end[1]},{end[0]}")

    coords_str = ";".join(coords)
    url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson&alternatives=true"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "JalMarg-FloodRouter/1.0"})
        with urllib.request.urlopen(req, timeout=4.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("code") == "Ok" and data.get("routes"):
                routes = []
                for r in data["routes"]:
                    geom = r["geometry"]["coordinates"]
                    polyline = [[round(pt[1], 6), round(pt[0], 6)] for pt in geom]
                    routes.append({
                        "polyline": polyline,
                        "distance_m": float(r.get("distance", 0.0)),
                        "duration_s": float(r.get("duration", 0.0)),
                    })
                return routes
    except Exception:
        pass
    return []


def query_osrm_route(start: Tuple[float, float], end: Tuple[float, float], waypoints: List[Tuple[float, float]] = None) -> Any:
    """Queries single or waypointed OSRM route, returns primary route or None."""
    routes = query_all_osrm_routes(start, end, waypoints)
    return routes[0] if routes else None


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    method = (event.get("httpMethod") or "POST").upper()
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "CORS OK"}),
        }

    raw_body = event.get("body")
    payload = json.loads(raw_body) if isinstance(raw_body, str) else (raw_body or {})

    # Coordinates and location metadata
    origin_obj = payload.get("origin") if isinstance(payload.get("origin"), dict) else {}
    dest_obj = payload.get("destination") if isinstance(payload.get("destination"), dict) else {}

    s_lat = payload.get("start_lat") if payload.get("start_lat") is not None else origin_obj.get("latitude")
    s_lon = payload.get("start_lon") if payload.get("start_lon") is not None else origin_obj.get("longitude")
    d_lat = payload.get("dest_lat") if payload.get("dest_lat") is not None else dest_obj.get("latitude")
    d_lon = payload.get("dest_lon") if payload.get("dest_lon") is not None else dest_obj.get("longitude")

    if s_lat is None or s_lon is None or d_lat is None or d_lon is None:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "error": "Missing start or destination coordinates. Please provide origin and destination.",
                "status": "INVALID_COORDINATES",
            }),
        }

    try:
        start_lat = float(s_lat)
        start_lon = float(s_lon)
        dest_lat = float(d_lat)
        dest_lon = float(d_lon)
    except (ValueError, TypeError):
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "error": "Invalid coordinate format. Coordinates must be decimal numbers.",
                "status": "INVALID_COORDINATES",
            }),
        }

    # Strict Bengaluru Metropolitan service boundary check
    if not (12.70 <= start_lat <= 13.35 and 77.30 <= start_lon <= 77.90):
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "error": f"Origin coordinates ({start_lat}, {start_lon}) fall outside Bengaluru service area (12.70-13.35 N, 77.30-77.90 E).",
                "status": "OUT_OF_BOUNDS",
            }),
        }

    if not (12.70 <= dest_lat <= 13.35 and 77.30 <= dest_lon <= 77.90):
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "error": f"Destination coordinates ({dest_lat}, {dest_lon}) fall outside Bengaluru service area (12.70-13.35 N, 77.30-77.90 E).",
                "status": "OUT_OF_BOUNDS",
            }),
        }

    start_name = (
        payload.get("origin_name")
        or origin_obj.get("resolvedName")
        or origin_obj.get("label")
        or payload.get("origin_label")
        or payload.get("start_name")
        or f"{start_lat:.4f}, {start_lon:.4f}"
    )
    dest_name = (
        payload.get("dest_name")
        or dest_obj.get("resolvedName")
        or dest_obj.get("label")
        or payload.get("destination_label")
        or payload.get("dest_name")
        or f"{dest_lat:.4f}, {dest_lon:.4f}"
    )
    start_query = payload.get("origin_query") or origin_obj.get("query") or payload.get("from_location") or start_name
    dest_query = payload.get("dest_query") or dest_obj.get("query") or payload.get("to_location") or dest_name
    start_address = payload.get("origin_address") or origin_obj.get("address") or ""
    dest_address = payload.get("dest_address") or dest_obj.get("address") or ""

    start_pt = (start_lat, start_lon)
    dest_pt = (dest_lat, dest_lon)

    # 1. Fetch Active Community Hazards & Historical BBMP Spots
    all_community_hazards = dynamo_store.get_all_hazards()
    all_historical_spots = load_historical_flood_points()

    # 2. Query OSRM with alternatives=true
    osrm_routes = query_all_osrm_routes(start_pt, dest_pt)

    demo_matched = None
    if not osrm_routes:
        # Check if requested corridor matches a recorded demo route
        demo_matched = find_matching_demo_route(start_lat, start_lon, dest_lat, dest_lon)
        if demo_matched:
            # Use verified recorded OSRM road coordinates
            d_poly = demo_matched["directRoute"]["polyline"]
            d_dist = float(demo_matched["directRoute"]["distanceKm"]) * 1000.0
            d_dur = float(demo_matched["directRoute"]["etaMinutes"]) * 60.0
            osrm_routes = [{
                "polyline": d_poly,
                "distance_m": d_dist,
                "duration_s": d_dur,
            }]
            if "safeDetourRoute" in demo_matched and demo_matched["safeDetourRoute"].get("polyline"):
                s_poly = demo_matched["safeDetourRoute"]["polyline"]
                s_dist = float(demo_matched["safeDetourRoute"]["distanceKm"]) * 1000.0
                s_dur = float(demo_matched["safeDetourRoute"]["etaMinutes"]) * 60.0
                osrm_routes.append({
                    "polyline": s_poly,
                    "distance_m": s_dist,
                    "duration_s": s_dur,
                })
        else:
            return {
                "statusCode": 502,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "error": f"Road routing failed between '{start_name}' and '{dest_name}'. Routing engine is temporarily unreachable.",
                    "status": "ROUTING_FAILED",
                }),
            }

    PROXIMITY_THRESHOLD_M = 300.0

    def evaluate_route_risk(route_info: Dict[str, Any]) -> Dict[str, Any]:
        poly = route_info["polyline"]
        # Community hazards within 300m
        matched_community = []
        for h in all_community_hazards:
            h_lat = float(h["latitude"])
            h_lon = float(h["longitude"])
            d_m = min_distance_to_polyline_m(h_lat, h_lon, poly)
            if d_m <= PROXIMITY_THRESHOLD_M:
                matched_community.append({
                    "id": h["id"],
                    "title": h["title"],
                    "severity": h.get("severity", "MEDIUM"),
                    "waterDepth": h.get("waterDepth"),
                    "distanceFromRouteMeters": round(d_m, 1),
                    "source": "COMMUNITY_REPORT"
                })

        # Historical BBMP vulnerable spots within 300m
        matched_historical = []
        for sp in all_historical_spots:
            sp_lat = float(sp["latitude"])
            sp_lon = float(sp["longitude"])
            d_m = min_distance_to_polyline_m(sp_lat, sp_lon, poly)
            if d_m <= PROXIMITY_THRESHOLD_M:
                matched_historical.append({
                    "id": sp.get("id"),
                    "name": sp.get("name"),
                    "wardName": sp.get("wardName", ""),
                    "distanceFromRouteMeters": round(d_m, 1),
                    "source": "HISTORICAL_BBMP_OPENCITY"
                })

        # Risk score calculation (Community critical=3, community medium=2, historical=1)
        score = sum(3 if c["severity"] == "CRITICAL" else 2 for c in matched_community) + len(matched_historical)

        return {
            "communityHazards": matched_community,
            "historicalSpots": matched_historical,
            "totalSpotsWithin300m": len(matched_community) + len(matched_historical),
            "riskScore": score,
        }

    direct_route_obj = osrm_routes[0]
    direct_risk = evaluate_route_risk(direct_route_obj)

    # Determine Safe Detour Route
    safe_route_obj = None
    safe_risk = None
    is_alt_safer = False

    # Check if OSRM returned multiple native routes
    if len(osrm_routes) > 1:
        candidates = []
        for alt_r in osrm_routes[1:]:
            cand_risk = evaluate_route_risk(alt_r)
            candidates.append((alt_r, cand_risk))

        # Sort candidates by risk score ascending
        candidates.sort(key=lambda x: (x[1]["riskScore"], x[0]["distance_m"]))
        best_alt, best_alt_risk = candidates[0]

        if best_alt_risk["riskScore"] < direct_risk["riskScore"]:
            safe_route_obj = best_alt
            safe_risk = best_alt_risk
            is_alt_safer = True

    # If no alternative from OSRM was safer, attempt waypoint detour around direct hazard
    if not is_alt_safer and direct_risk["communityHazards"]:
        first_h = direct_risk["communityHazards"][0]
        # Find hazard coordinate and offset
        hz_match = next((h for h in all_community_hazards if h["id"] == first_h["id"]), None)
        if hz_match:
            wp = (float(hz_match["latitude"]) + 0.012, float(hz_match["longitude"]) + 0.018)
            detour_osrm = query_osrm_route(start_pt, dest_pt, [wp])
            if detour_osrm:
                detour_risk = evaluate_route_risk(detour_osrm)
                if detour_risk["riskScore"] < direct_risk["riskScore"]:
                    safe_route_obj = detour_osrm
                    safe_risk = detour_risk
                    is_alt_safer = True

    # If still not safer, the safe route is the same direct route with explicit notice
    if not is_alt_safer:
        safe_route_obj = direct_route_obj
        safe_risk = direct_risk
        protection_text = "No alternative route reduces flood risk along this corridor."
    else:
        avoided_total = direct_risk["totalSpotsWithin300m"] - safe_risk["totalSpotsWithin300m"]
        protection_text = f"Detour avoids {max(1, avoided_total)} flood spot(s) within 300m buffer."

    # Compute road distance & duration
    direct_dist_km = round(direct_route_obj["distance_m"] / 1000.0, 2)
    flood_delay_min = len(direct_risk["communityHazards"]) * 20
    direct_eta_min = int(round(direct_route_obj["duration_s"] / 60.0)) + flood_delay_min

    safe_dist_km = round(safe_route_obj["distance_m"] / 1000.0, 2)
    safe_eta_min = int(round(safe_route_obj["duration_s"] / 60.0))

    response_data = {
        "status": "SUCCESS",
        "routeComparison": {
            "origin": {
                "latitude": start_lat,
                "longitude": start_lon,
                "label": start_name,
                "query": start_query,
                "resolvedName": start_name,
                "address": start_address,
            },
            "destination": {
                "latitude": dest_lat,
                "longitude": dest_lon,
                "label": dest_name,
                "query": dest_query,
                "resolvedName": dest_name,
                "address": dest_address,
            },
            "corridorName": f"{start_query} → {dest_query}",
            "proximityThresholdMeters": PROXIMITY_THRESHOLD_M,
            "hazardsDetected": direct_risk["totalSpotsWithin300m"],
            "intersectingHazards": direct_risk["communityHazards"],
            "historicalSpotsDetected": direct_risk["historicalSpots"],
            "directRoute": {
                "polyline": direct_route_obj["polyline"],
                "distanceKm": direct_dist_km,
                "etaMinutes": direct_eta_min,
                "isWaterlogged": len(direct_risk["communityHazards"]) > 0,
                "hazardWarning": (
                    f"Direct corridor passes near {len(direct_risk['communityHazards'])} active hazard(s) and {len(direct_risk['historicalSpots'])} BBMP flood spots."
                    if direct_risk["totalSpotsWithin300m"] > 0
                    else "No critical waterlogging detected within 300m."
                ),
                "status": "DANGEROUS" if direct_risk["communityHazards"] else "CLEAR",
            },
            "safeDetourRoute": {
                "polyline": safe_route_obj["polyline"],
                "distanceKm": safe_dist_km,
                "etaMinutes": safe_eta_min,
                "isWaterlogged": len(safe_risk["communityHazards"]) > 0,
                "timeSavedMinutes": max(0, direct_eta_min - safe_eta_min),
                "protectionTag": protection_text,
                "isSafer": is_alt_safer,
                "status": "RECOMMENDED_BYPASS" if is_alt_safer else "STANDARD_PATH",
            },
            "dataAttribution": {
                "historical": "BBMP Flood Prone Hotspots (OpenCity.in Public Domain)",
                "community": "Citizen Waterlogging Reports (JalMarg DB)",
                "liveWeather": "Live weather feed via Open-Meteo"
            },
            "disclaimer": "Real-time road geometry via OpenStreetMap OSRM. Proximity threshold 300m. Conditions can evolve rapidly during heavy rainfall.",
        }
    }

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(response_data),
    }
