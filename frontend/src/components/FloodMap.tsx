import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { FloodHazard, RouteComparison } from '../types';

interface FloodMapProps {
  hazards: FloodHazard[];
  routeComparison: RouteComparison | null;
  selectedHazard: FloodHazard | null;
  onSelectHazard: (hazard: FloodHazard | null) => void;
  onMapClick?: (lat: number, lon: number) => void;
  isPinningLocation?: boolean;
}

// Custom SVG Circle Marker Generator for Leaflet
const createHazardIcon = (severity: string, isVerified: boolean) => {
  const color =
    severity === 'CRITICAL'
      ? '#ef4444'
      : severity === 'MEDIUM'
      ? '#f59e0b'
      : '#eab308';

  const glowColor =
    severity === 'CRITICAL'
      ? 'rgba(239, 68, 68, 0.45)'
      : severity === 'MEDIUM'
      ? 'rgba(245, 158, 11, 0.35)'
      : 'rgba(234, 179, 8, 0.3)';

  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${glowColor};
        animation: pulse-dot 2s infinite ease-in-out;
      "></div>
      <div style="
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
      ">
        ${severity === 'CRITICAL' ? '!' : severity === 'MEDIUM' ? '▲' : '•'}
      </div>
      ${isVerified ? `
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: #10b981;
          color: white;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid white;
          font-size: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">✓</div>` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hazard-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createWaypointIcon = (type: 'origin' | 'destination') => {
  const isOrigin = type === 'origin';
  const color = isOrigin ? '#38bdf8' : '#10b981';
  const label = isOrigin ? 'A' : 'B';

  const html = `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
    ">${label}</div>
  `;

  return L.divIcon({
    html,
    className: 'waypoint-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export const FloodMap: React.FC<FloodMapProps> = ({
  hazards,
  routeComparison,
  selectedHazard,
  onSelectHazard,
  onMapClick,
  isPinningLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Bangalore: Silk Board / Koramangala
    const map = L.map(mapContainerRef.current, {
      center: [12.9300, 77.6350],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dark high-contrast CartoDB tiles suitable for aquatic theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    hazardsLayerGroupRef.current = L.layerGroup().addTo(map);
    routesLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Map Click Listener for pinning report coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick]);

  // Update Hazard Markers
  useEffect(() => {
    const layer = hazardsLayerGroupRef.current;
    if (!layer || !mapInstanceRef.current) return;

    layer.clearLayers();

    hazards.forEach((hazard) => {
      const icon = createHazardIcon(hazard.severity, hazard.verified);
      const marker = L.marker([hazard.latitude, hazard.longitude], { icon });

      // Construct popup content
      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '220px';
      popupContent.style.maxWidth = '280px';
      popupContent.style.fontSize = '12px';
      popupContent.style.fontFamily = 'Plus Jakarta Sans, sans-serif';

      popupContent.innerHTML = `
        <div style="margin-bottom: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 2px 6px;
              border-radius: 4px;
              background: ${hazard.severity === 'CRITICAL' ? '#fee2e2' : hazard.severity === 'MEDIUM' ? '#fef3c7' : '#fef9c3'};
              color: ${hazard.severity === 'CRITICAL' ? '#b91c1c' : hazard.severity === 'MEDIUM' ? '#b45309' : '#854d0e'};
            ">${hazard.severity} • ${hazard.depthCm} cm</span>
            ${hazard.verified ? `
              <span style="font-size: 10px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">
                ✓ AWS CV Verified
              </span>
            ` : ''}
          </div>
          <strong style="font-size: 13px; color: #0f172a; line-height: 1.3; display: block;">
            ${hazard.title}
          </strong>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            📍 ${hazard.locationName}
          </div>
        </div>
        ${hazard.imageUrl ? `
          <div style="border-radius: 6px; overflow: hidden; margin-bottom: 8px; height: 110px;">
            <img src="${hazard.imageUrl}" alt="Flood evidence" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        ` : ''}
        <p style="font-size: 11px; color: #334155; line-height: 1.4; margin-bottom: 8px;">
          ${hazard.description}
        </p>
        ${hazard.detectedLabels && hazard.detectedLabels.length > 0 ? `
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;">
            ${hazard.detectedLabels.map((l: string) => `
              <span style="font-size: 9px; background: #f1f5f9; color: #475569; padding: 1px 5px; border-radius: 3px;">
                ${l}
              </span>
            `).join('')}
          </div>
        ` : ''}
        <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px;">
          Reported ${new Date(hazard.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • by ${hazard.reporter}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => onSelectHazard(hazard));

      layer.addLayer(marker);
    });
  }, [hazards, onSelectHazard]);

  // Update Route Polylines
  useEffect(() => {
    const layer = routesLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    if (!routeComparison) return;

    const { origin, destination, directRoute, safeDetourRoute } = routeComparison;

    // 1. Direct Route: Red dashed line (crosses flood hazard)
    if (directRoute && directRoute.polyline && directRoute.polyline.length > 0) {
      const directLine = L.polyline(directRoute.polyline, {
        color: '#ef4444',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      });
      directLine.bindTooltip(`Direct Path: ${directRoute.distanceKm} km (Warning: Flooded)`, { sticky: true });
      layer.addLayer(directLine);
    }

    // 2. Safe Detour Route: Solid Emerald Green line
    if (safeDetourRoute && safeDetourRoute.polyline && safeDetourRoute.polyline.length > 0) {
      const safeLine = L.polyline(safeDetourRoute.polyline, {
        color: '#10b981',
        weight: 6,
        opacity: 0.95,
      });
      safeLine.bindTooltip(`JalMarg Safe Detour: ${safeDetourRoute.distanceKm} km (Bypasses flood)`, { sticky: true });
      layer.addLayer(safeLine);
    }

    // 3. Waypoint Markers
    if (origin) {
      const originMarker = L.marker([origin.latitude, origin.longitude], {
        icon: createWaypointIcon('origin'),
      }).bindTooltip('Origin (Start)', { permanent: false });
      layer.addLayer(originMarker);
    }

    if (destination) {
      const destMarker = L.marker([destination.latitude, destination.longitude], {
        icon: createWaypointIcon('destination'),
      }).bindTooltip('Destination (End)', { permanent: false });
      layer.addLayer(destMarker);
    }

    // Fit map bounds to show complete route
    if (safeDetourRoute && safeDetourRoute.polyline.length > 0) {
      const bounds = L.latLngBounds(safeDetourRoute.polyline);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeComparison]);

  // Pan to selected hazard if triggered from card
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedHazard) return;

    map.flyTo([selectedHazard.latitude, selectedHazard.longitude], 15, {
      duration: 1.2,
    });
  }, [selectedHazard]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '560px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Map Legend Overlay */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 1000,
          padding: '0.85rem 1rem',
          fontSize: '0.78rem',
          maxWidth: '260px',
        }}
      >
        <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Flood Hazard Depth Legend</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ color: '#fecaca', fontWeight: 600 }}>Critical (&gt;3ft / Impassable)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ color: '#fde68a', fontWeight: 600 }}>Medium (1.5 - 2.5ft / Knee-deep)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
            <span style={{ color: '#fef08a', fontWeight: 600 }}>Low (&lt;1ft / Ankle-deep)</span>
          </div>
        </div>

        {routeComparison && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.55rem', paddingTop: '0.55rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ width: 14, height: 3, background: '#ef4444', display: 'inline-block' }} />
              <span style={{ color: '#fca5a5' }}>Direct Path (Danger)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 14, height: 4, background: '#10b981', display: 'inline-block' }} />
              <span style={{ color: '#6ee7b7', fontWeight: 700 }}>JalMarg Safe Detour</span>
            </div>
          </div>
        )}
      </div>

      {isPinningLocation && (
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--accent-cyan)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
            color: '#38bdf8',
            fontSize: '0.85rem',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          📍 Click anywhere on the map to pin waterlogging hazard coordinates
        </div>
      )}
    </div>
  );
};
