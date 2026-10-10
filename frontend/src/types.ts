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

export interface RouteComparison {
  origin: { latitude: number; longitude: number; label?: string };
  destination: { latitude: number; longitude: number; label?: string };
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
}
