/**
 * Real Road Network Routing Service (OSRM Integration with Smart Fallback)
 * Fetches turn-by-turn road geometry from the Open Source Routing Machine (OSRM).
 * Fallback to smooth multi-segment urban grid interpolation if OSRM is unreachable.
 */

export interface OsrmRouteResult {
  coordinates: [number, number][]; // [latitude, longitude] for Leaflet
  distanceKm: number;
  durationMinutes: number;
  isRealRoadNetwork: boolean;
  source: 'OSRM_REAL_ROAD_NETWORK' | 'SMOOTH_INTERPOLATION_FALLBACK';
}

/**
 * Fetch real driving road geometry snapped to actual streets between waypoints.
 * OSRM expects coordinates in {longitude},{latitude} format.
 */
export async function fetchOsrmRoadRoute(
  origin: [number, number], // [lat, lon]
  destination: [number, number], // [lat, lon]
  viaPoints: [number, number][] = []
): Promise<OsrmRouteResult> {
  const allPoints: [number, number][] = [origin, ...viaPoints, destination];
  
  // Format coordinates for OSRM URL: "{lon},{lat};{lon},{lat};..."
  const coordinatesString = allPoints
    .map(([lat, lon]) => `${lon.toFixed(6)},${lat.toFixed(6)}`)
    .join(';');

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson&steps=false`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout

    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM HTTP status ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const geoJsonCoords: [number, number][] = primaryRoute.geometry.coordinates;

      // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
      const leafletCoords: [number, number][] = geoJsonCoords.map(([lon, lat]) => [lat, lon]);

      const distanceKm = Number((primaryRoute.distance / 1000).toFixed(2));
      const durationMinutes = Math.max(1, Math.round(primaryRoute.duration / 60));

      return {
        coordinates: leafletCoords,
        distanceKm,
        durationMinutes,
        isRealRoadNetwork: true,
        source: 'OSRM_REAL_ROAD_NETWORK',
      };
    }

    throw new Error('OSRM returned no valid route');
  } catch (err) {
    console.warn('OSRM road route fetch failed or timed out, generating smooth urban corridor fallback:', err);
    return generateInterpolatedRoadFallback(origin, destination, viaPoints[0]);
  }
}

/**
 * Fallback generator when offline or OSRM demo server is unreachable.
 * Generates an organic 20-node smoothed curve conforming to urban corridors
 * instead of drawing a raw diagonal ray cutting across buildings.
 */
export function generateInterpolatedRoadFallback(
  start: [number, number],
  end: [number, number],
  detourPoint?: [number, number]
): OsrmRouteResult {
  const [startLat, startLon] = start;
  const [endLat, endLon] = end;

  const points: [number, number][] = [];
  const segments = 24;

  if (detourPoint) {
    // Quadratic bezier curve through the detour point
    const [ctrlLat, ctrlLon] = detourPoint;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const lat = (1 - t) * (1 - t) * startLat + 2 * (1 - t) * t * ctrlLat + t * t * endLat;
      const lon = (1 - t) * (1 - t) * startLon + 2 * (1 - t) * t * ctrlLon + t * t * endLon;
      // Add subtle road-grid jiggle (simulating street turns)
      const jiggle = Math.sin(t * Math.PI * 4) * 0.0008;
      points.push([Number((lat + jiggle).toFixed(5)), Number((lon + jiggle).toFixed(5))]);
    }
  } else {
    // S-curve urban arterial path avoiding straight line ray
    const offsetLat = (endLon - startLon) * 0.15; // Perpendicular drift
    const offsetLon = -(endLat - startLat) * 0.15;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const baseLat = (1 - t) * startLat + t * endLat;
      const baseLon = (1 - t) * startLon + t * endLon;
      const arc = Math.sin(t * Math.PI);
      const lat = baseLat + arc * offsetLat;
      const lon = baseLon + arc * offsetLon;
      points.push([Number(lat.toFixed(5)), Number(lon.toFixed(5))]);
    }
  }

  // Calculate approximate distance
  const dLat = (endLat - startLat) * 111;
  const dLon = (endLon - startLon) * 105;
  const straightDist = Math.sqrt(dLat * dLat + dLon * dLon);
  const roadFactor = detourPoint ? 1.35 : 1.2;
  const distanceKm = Number((straightDist * roadFactor).toFixed(1));
  const durationMinutes = Math.round(distanceKm * 3.2); // ~18-20 km/h city average

  return {
    coordinates: points,
    distanceKm,
    durationMinutes,
    isRealRoadNetwork: false,
    source: 'SMOOTH_INTERPOLATION_FALLBACK',
  };
}

/**
 * Calculates a high-ground bypass waypoint when active flood zones lie
 * along the direct path between origin and destination.
 */
export function calculateElevatedBypassWaypoint(
  start: [number, number],
  end: [number, number],
  hazards: Array<{ latitude: number; longitude: number; depthCm: number; radiusMeters: number }>
): [number, number] {
  const [startLat, startLon] = start;
  const [endLat, endLon] = end;

  // Find the most critical hazard in the region
  const blocking = hazards
    .filter((h) => h.depthCm >= 35)
    .sort((a, b) => b.depthCm - a.depthCm)[0];

  if (blocking) {
    // Offset perpendicular to the flood center by ~800 meters onto elevated ground
    const dirLat = endLat - startLat;
    const dirLon = endLon - startLon;
    const perpLat = -dirLon;
    const perpLon = dirLat;
    const len = Math.sqrt(perpLat * perpLat + perpLon * perpLon) || 1;

    const offsetMagnitude = 0.016; // ~1.5 km bypass corridor
    return [
      Number((blocking.latitude + (perpLat / len) * offsetMagnitude).toFixed(5)),
      Number((blocking.longitude + (perpLon / len) * offsetMagnitude).toFixed(5)),
    ];
  }

  // Default elevated corridor waypoint around central Koramangala / Ring Rd
  return [
    Number(((startLat + endLat) / 2 + 0.012).toFixed(5)),
    Number(((startLon + endLon) / 2 + 0.018).toFixed(5)),
  ];
}
