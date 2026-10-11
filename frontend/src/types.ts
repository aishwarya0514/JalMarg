export type HazardSeverity = 'CRITICAL' | 'MEDIUM' | 'LOW';

export type HazardStatus = 'ACTIVE' | 'UNVERIFIED' | 'EXPIRED';

export interface FloodHazard {
  id: string;
  title: string;
  description: string;
  severity: HazardSeverity;
  waterDepth: string;
  depthCm: number;
  status: HazardStatus;
  latitude: number;
  longitude: number;
  locationName: string;
  landmark?: string;
  verified: boolean;
  verificationSource?: string;
  verificationConfidence?: number;
  detectedLabels?: string[];
  imageUrl: string;
  reportedAt: string;
  expiresAt: number;
  reporter: string;
  geohash: string;
}

export interface IntersectingHazard {
  id: string;
  title: string;
  severity: HazardSeverity;
  waterDepth: string;
  distanceFromRouteMeters: number;
  locationName: string;
  latitude: number;
  longitude: number;
}

export interface ResolvedLocation {
  query: string;
  resolvedName: string;
  address: string;
  latitude: number;
  longitude: number;
  label?: string;
}

export interface RouteComparison {
  origin: {
    latitude: number;
    longitude: number;
    label?: string;
    query?: string;
    resolvedName?: string;
    address?: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    label?: string;
    query?: string;
    resolvedName?: string;
    address?: string;
  };
  corridorName?: string;
  hazardsDetected: number;
  intersectingHazards: IntersectingHazard[];
  directRoute: {
    polyline: [number, number][];
    distanceKm: number;
    etaMinutes: number;
    isWaterlogged: boolean;
    hazardWarning: string;
    status: 'DANGEROUS' | 'CLEAR';
  };
  safeDetourRoute: {
    polyline: [number, number][];
    distanceKm: number;
    etaMinutes: number;
    isWaterlogged: boolean;
    timeSavedMinutes: number;
    protectionTag: string;
    status: 'RECOMMENDED_BYPASS';
  };
  disclaimer: string;
}

export interface ReportHazardInput {
  title: string;
  note: string;
  severity: HazardSeverity;
  waterDepth?: string;
  depthCm?: number;
  latitude: number;
  longitude: number;
  locationName?: string;
  landmark?: string;
  reporter?: string;
  imageBase64?: string;
  dataSource?: string;
}

export type VehicleType = 'bike' | 'car' | 'suv';

export interface VehicleProfile {
  type: VehicleType;
  label: string;
  maxClearanceCm: number;
  iconName: string;
  description: string;
}

export interface TopoZone {
  id: string;
  title: string;
  zoneType: string;
  locationName: string;
  latitude: number;
  longitude: number;
  elevationDipMeters: number;
  drainageCapacityMmH: number;
  radiusMeters: number;
  dataSource: string;
  confidence: string;
  description: string;
}

export interface HistoricalFloodPoint {
  id: string;
  name: string;
  wardName: string;
  wardNo?: string;
  latitude: number;
  longitude: number;
  source: string;
  dataset: string;
  category: string;
}

export interface LiveWeatherData {
  temperatureC: number;
  relativeHumidity: number;
  precipitationMm: number;
  rainMm?: number;
  weatherCode: number;
  conditionText: string;
  windSpeedKmh: number;
  lastUpdated: string;
}
