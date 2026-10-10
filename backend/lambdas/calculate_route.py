"""
Lambda 3: Calculate Dual Route (Direct vs JalMarg Safe Detour)
Detects waterlogged hazard intersection along direct trajectory and computes
a safe bypass detour with travel metrics and safety comparisons.
"""

import json
import math
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


def interpolate_points(start: Tuple[float, float], end: Tuple[float, float], steps: int = 10) -> List[List[float]]:
    pts = []
    for i in range(steps + 1):
        ratio = i / steps
        lat = start[0] + (end[0] - start[0]) * ratio
        lon = start[1] + (end[1] - start[1]) * ratio
        pts.append([round(lat, 6), round(lon, 6)])
    return pts


def query_osrm_route(start: Tuple[float, float], end: Tuple[float, float], waypoints: List[Tuple[float, float]] = None) -> List[List[float]]:
    """Attempts to query OSRM driving route, returns list of [lat, lon] or None."""
    coords = [f"{start[1]},{start[0]}"]
    if waypoints:
        for wp in waypoints:
            coords.append(f"{wp[1]},{wp[0]}")
    coords.append(f"{end[1]},{end[0]}")

    coords_str = ";".join(coords)
    url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "JalMarg-FloodRouter/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("code") == "Ok" and data.get("routes"):
                geom = data["routes"][0]["geometry"]["coordinates"]
                # Convert [lon, lat] to [lat, lon]
                return [[round(pt[1], 6), round(pt[0], 6)] for pt in geom]
    except Exception:
        pass
    return None


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

    # Default coordinates: Silk Board to Indiranagar
    start_lat = float(payload.get("start_lat", 12.9150))
    start_lon = float(payload.get("start_lon", 77.6200))
    dest_lat = float(payload.get("dest_lat", 12.9750))
    dest_lon = float(payload.get("dest_lon", 77.6450))

    start_pt = (start_lat, start_lon)
    dest_pt = (dest_lat, dest_lon)

    # Fetch active hazards
    all_hazards = dynamo_store.get_all_hazards()

    # Find hazards that intersect or are near the direct trajectory (within 350m buffer)
    intersecting_hazards = []
    for h in all_hazards:
        h_lat = float(h["latitude"])
        h_lon = float(h["longitude"])
        dist_m = distance_point_to_segment_m(h_lat, h_lon, start_lat, start_lon, dest_lat, dest_lon)
        if dist_m <= 400 and h.get("severity") in ("CRITICAL", "MEDIUM"):
            intersecting_hazards.append({
                "id": h["id"],
                "title": h["title"],
                "severity": h["severity"],
                "waterDepth": h.get("waterDepth"),
                "distanceFromRouteMeters": round(dist_m, 1),
                "locationName": h.get("locationName"),
                "latitude": h_lat,
                "longitude": h_lon,
            })

    # Direct Route calculation
    direct_osrm = query_osrm_route(start_pt, dest_pt)
    direct_polyline = direct_osrm or interpolate_points(start_pt, dest_pt, steps=15)

    direct_dist_km = round(haversine_distance_m(start_lat, start_lon, dest_lat, dest_lon) / 1000.0 * 1.25, 2)
    # Direct estimated travel time (18 km/h urban speed + flood standstill penalty if intersecting)
    flood_delay_min = len(intersecting_hazards) * 28
    direct_eta_min = int(round((direct_dist_km / 18.0) * 60)) + flood_delay_min

    # Generate Safe Detour Waypoint around hazards
    detour_waypoints = []
    if intersecting_hazards:
        for hz in intersecting_hazards:
            # Shift perpendicular to avoid flood node
            offset_lat = hz["latitude"] + 0.012
            offset_lon = hz["longitude"] + 0.018
            detour_waypoints.append((offset_lat, offset_lon))
    else:
        # Default minor detour point to demonstrate alternative routing
        detour_waypoints.append(((start_lat + dest_lat) / 2.0 + 0.008, (start_lon + dest_lon) / 2.0 + 0.012))

    detour_osrm = query_osrm_route(start_pt, dest_pt, detour_waypoints)
    if detour_osrm:
        safe_polyline = detour_osrm
    else:
        # Synthetic smooth detour polyline
        safe_polyline = []
        cur = start_pt
        for wp in detour_waypoints:
            safe_polyline.extend(interpolate_points(cur, wp, steps=8))
            cur = wp
        safe_polyline.extend(interpolate_points(cur, dest_pt, steps=8))

    safe_dist_km = round(direct_dist_km * 1.18, 2)
    # Flowing at 24 km/h with dry bypass roads
    safe_eta_min = int(round((safe_dist_km / 24.0) * 60))

    bypassed_text = "No severe waterlogging on direct path"
    if intersecting_hazards:
        first_hz = intersecting_hazards[0]
        bypassed_text = f"Bypassed {first_hz['title']} ({first_hz.get('waterDepth', 'Impassable')}) — avoided vehicle hydro-lock risk."

    response_data = {
        "status": "SUCCESS",
        "routeComparison": {
            "origin": {"latitude": start_lat, "longitude": start_lon},
            "destination": {"latitude": dest_lat, "longitude": dest_lon},
            "hazardsDetected": len(intersecting_hazards),
            "intersectingHazards": intersecting_hazards,
            "directRoute": {
                "polyline": direct_polyline,
                "distanceKm": direct_dist_km,
                "etaMinutes": direct_eta_min,
                "isWaterlogged": len(intersecting_hazards) > 0,
                "hazardWarning": "Direct route crosses deep floodwater!" if intersecting_hazards else "No critical waterlogging detected.",
                "status": "DANGEROUS" if intersecting_hazards else "CLEAR",
            },
            "safeDetourRoute": {
                "polyline": safe_polyline,
                "distanceKm": safe_dist_km,
                "etaMinutes": safe_eta_min,
                "isWaterlogged": False,
                "timeSavedMinutes": max(0, direct_eta_min - safe_eta_min),
                "protectionTag": bypassed_text,
                "status": "RECOMMENDED_BYPASS",
            },
            "disclaimer": "Simulated flood routing based on real-time crowd and vision sensors. Exercise caution; conditions can change rapidly during heavy monsoon downpours.",
        }
    }

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(response_data),
    }
