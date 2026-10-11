import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  MapPin,
  X,
  Compass,
  Info,
  Droplet,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import type { FloodHazard, RouteComparison, HistoricalFloodPoint } from '../types';

interface CenterMapPanelProps {
  hazards: FloodHazard[];
  historicalPoints?: HistoricalFloodPoint[];
  routeComparison: RouteComparison | null;
  selectedHazard: FloodHazard | null;
  onSelectHazard: (hazard: FloodHazard | null) => void;
  onMapClick?: (lat: number, lon: number) => void;
  isEmergencyPanelOpen?: boolean;
  severityFilter?: 'ALL' | 'CRITICAL' | 'MEDIUM' | 'LOW';
  onSelectSeverityFilter?: (sev: 'ALL' | 'CRITICAL' | 'MEDIUM' | 'LOW') => void;
  onDeletePhoto?: (hazardId: string) => Promise<void> | void;
  onDeleteReport?: (hazardId: string) => Promise<void> | void;
}

// Bounding box strictly covering Bengaluru Metropolitan Region
// Prevents over-zooming out to global oceans or outside Karnataka
const BENGALURU_BOUNDS = L.latLngBounds(
  [12.70, 77.30], // Southwest (Kengeri / Hosur border)
  [13.35, 77.90]  // Northeast (Devanahalli / Whitefield border)
);

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];

export const CenterMapPanel: React.FC<CenterMapPanelProps> = ({
  hazards,
  historicalPoints = [],
  routeComparison,
  selectedHazard,
  onSelectHazard,
  onMapClick,
  isEmergencyPanelOpen,
  severityFilter = 'ALL',
  onSelectSeverityFilter,
  onDeletePhoto,
  onDeleteReport,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const historicalLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeTileLayer, setActiveTileLayer] = useState<'standard' | 'clean'>('standard');
  const [legendVisible, setLegendVisible] = useState(true);
  const [showHistoricalSpots, setShowHistoricalSpots] = useState(true);
  const [tileErrorOccurred, setTileErrorOccurred] = useState(false);

  // 1. Initialize Map Instance ONCE
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered at Bengaluru with strict zoom and boundary limits
    const map = L.map(mapContainerRef.current, {
      center: BENGALURU_CENTER,
      zoom: 12,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: BENGALURU_BOUNDS,
      maxBoundsViscosity: 0.85,
      zoomControl: true,
      attributionControl: false,
    });

    const standardUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const baseTile = L.tileLayer(standardUrl, {
      maxZoom: 19,
      keepBuffer: 8,
      updateWhenIdle: false,
    }).addTo(map);

    baseTile.on('tileerror', (e: any) => {
      const img = e.tile as HTMLImageElement;
      if (img && !img.dataset.retried) {
        img.dataset.retried = 'true';
        img.src = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${e.coords.z}/${e.coords.x}/${e.coords.y}.png`;
      } else {
        setTileErrorOccurred(true);
      }
    });

    baseTileLayerRef.current = baseTile;
    markersLayerRef.current = L.layerGroup().addTo(map);
    historicalLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Responsive size observer
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        requestAnimationFrame(() => {
          mapInstanceRef.current?.invalidateSize();
        });
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    // Initial progressive size invalidations to ensure proper tile paint
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Invalidate Size whenever the Emergency Help panel is opened or collapsed
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer1 = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 50);
      const timer2 = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isEmergencyPanelOpen]);

  // 3. Tile Layer Switch without Map Re-creation
  useEffect(() => {
    if (!baseTileLayerRef.current) return;
    const newUrl =
      activeTileLayer === 'clean'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    baseTileLayerRef.current.setUrl(newUrl);
  }, [activeTileLayer]);

  // 4. Map Click Listener
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !onMapClick) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick]);

  // 5. Render Route Polylines and Fit Bounds Sensibly (Strict Real Road Geometry)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !routesLayer) return;

    routesLayer.clearLayers();

    // Do NOT draw fabricated routes or default Silk Board if no active route is calculated
    if (!routeComparison || !routeComparison.directRoute?.polyline?.length) {
      return;
    }

    const standardCoords = routeComparison.directRoute.polyline;
    const detourCoords =
      routeComparison.safeDetourRoute?.polyline?.length > 0
        ? routeComparison.safeDetourRoute.polyline
        : standardCoords;

    const originPos: [number, number] = [
      routeComparison.origin.latitude,
      routeComparison.origin.longitude,
    ];

    const destPos: [number, number] = [
      routeComparison.destination.latitude,
      routeComparison.destination.longitude,
    ];

    const originName =
      routeComparison.origin.resolvedName ||
      routeComparison.origin.label ||
      routeComparison.origin.query ||
      'Origin';
    const originQuery = routeComparison.origin.query || originName;
    const originAddress = routeComparison.origin.address || originName;
    const originLat = originPos[0];
    const originLon = originPos[1];

    const destName =
      routeComparison.destination.resolvedName ||
      routeComparison.destination.label ||
      routeComparison.destination.query ||
      'Destination';
    const destQuery = routeComparison.destination.query || destName;
    const destAddress = routeComparison.destination.address || destName;
    const destLat = destPos[0];
    const destLon = destPos[1];

    // Draw Standard Route (RED)
    const standardLine = L.polyline(standardCoords, {
      color: '#ef4444',
      weight: 5,
      opacity: 0.85,
      dashArray: '8, 8',
    }).addTo(routesLayer);
    standardLine.bindTooltip(`Standard Route: ${originName} → ${destName}`, { sticky: true });

    // Draw JalMarg Alternative Route (GREEN)
    const detourLine = L.polyline(detourCoords, {
      color: '#16a34a',
      weight: 5.5,
      opacity: 0.95,
      lineJoin: 'round',
    }).addTo(routesLayer);
    detourLine.bindTooltip(`JalMarg Safe Detour: ${originName} → ${destName}`, { sticky: true });

    // Blue Origin Marker (Point A)
    const originIcon = L.divIcon({
      className: 'custom-origin-marker',
      html: `
        <div style="background-color: #2563eb; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(37,99,235,0.5); font-weight: 800; font-size: 11px;">
          A
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const originPopupHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; padding: 2px; min-width: 210px;">
        <div style="font-weight: 800; font-size: 13px; color: #2563eb; margin-bottom: 2px;">Origin: ${originName}</div>
        ${originQuery && originQuery !== originName ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">Input: "${originQuery}"</div>` : ''}
        <div style="color: #475569; font-size: 11px; margin-bottom: 5px; line-height: 1.35;">📍 ${originAddress}</div>
        <div style="font-size: 10.5px; color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; padding: 3px 6px; border-radius: 4px; font-weight: 600;">
          GPS: ${originLat.toFixed(5)}, ${originLon.toFixed(5)}
        </div>
      </div>
    `;

    L.marker(originPos, { icon: originIcon })
      .bindPopup(originPopupHtml)
      .bindTooltip(`Origin: ${originName}`)
      .addTo(routesLayer);

    // Red Destination Marker (Point B)
    const destIcon = L.divIcon({
      className: 'custom-dest-marker',
      html: `
        <div style="background-color: #dc2626; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(220,38,38,0.5); font-weight: 800; font-size: 11px;">
          B
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const destPopupHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; padding: 2px; min-width: 210px;">
        <div style="font-weight: 800; font-size: 13px; color: #dc2626; margin-bottom: 2px;">Destination: ${destName}</div>
        ${destQuery && destQuery !== destName ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">Input: "${destQuery}"</div>` : ''}
        <div style="color: #475569; font-size: 11px; margin-bottom: 5px; line-height: 1.35;">📍 ${destAddress}</div>
        <div style="font-size: 10.5px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; padding: 3px 6px; border-radius: 4px; font-weight: 600;">
          GPS: ${destLat.toFixed(5)}, ${destLon.toFixed(5)}
        </div>
      </div>
    `;

    L.marker(destPos, { icon: destIcon })
      .bindPopup(destPopupHtml)
      .bindTooltip(`Destination: ${destName}`)
      .addTo(routesLayer);

    // Sensible fitBounds: keep both origin, destination, and the route corridors in view
    const allPoints = [...standardCoords, ...detourCoords];
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 13,
      });
    }
  }, [routeComparison]);

  // 6. Render Verified BBMP Historical Flood Vulnerable Spots (OpenCity.in)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const histLayer = historicalLayerRef.current;
    if (!map || !histLayer) return;

    histLayer.clearLayers();
    if (!showHistoricalSpots || !historicalPoints || historicalPoints.length === 0) return;

    historicalPoints.forEach((pt) => {
      const histIcon = L.divIcon({
        className: 'historical-flood-marker',
        html: `
          <div style="
            background-color: #f59e0b;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 1px 5px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          " title="BBMP Flood Spot: ${pt.name}">
            <span style="font-size: 7px; color: #ffffff; font-weight: 800;">!</span>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([pt.latitude, pt.longitude], { icon: histIcon }).addTo(histLayer);

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; width: 230px; font-size: 11.5px; color: #1e293b; padding: 2px;">
          <div style="font-weight: 800; font-size: 12px; color: #b45309; margin-bottom: 2px;">
            ⚠️ BBMP Vulnerable Spot (Historical)
          </div>
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 3px; font-size: 12.5px;">${pt.name}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 3px;">
            📍 Ward: ${pt.wardName || 'Bengaluru'} ${pt.wardNo ? `(#${pt.wardNo})` : ''}
          </div>
          <div style="font-size: 10px; color: #78350f; background: #fef3c7; border: 1px solid #fde68a; padding: 3px 6px; border-radius: 4px; font-weight: 600;">
            Source: OpenCity.in BBMP Vulnerability Dataset
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml, { maxWidth: 260 });
    });
  }, [historicalPoints, showHistoricalSpots]);

  // 7. Render Citizen Community Flood Hazard Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const visibleHazards = hazards.filter(
      (h) => !severityFilter || severityFilter === 'ALL' || h.severity === severityFilter
    );

    visibleHazards.forEach((h) => {
      const isSelected = selectedHazard?.id === h.id;
      let markerColor = '#eab308'; // Low
      let iconEmoji = '⚠️';

      if (h.severity === 'CRITICAL') {
        markerColor = '#ef4444';
        iconEmoji = '🛑';
      } else if (h.severity === 'MEDIUM') {
        markerColor = '#f97316';
        iconEmoji = '⚠️';
      }

      const iconHtml = `
        <div style="
          background-color: ${markerColor};
          width: ${isSelected ? '32px' : '26px'};
          height: ${isSelected ? '32px' : '26px'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.35);
          cursor: pointer;
          font-size: 11px;
          transition: transform 0.15s ease;
          ${isSelected ? 'transform: scale(1.2); box-shadow: 0 0 15px ' + markerColor + ';' : ''}
        ">
          ${iconEmoji}
        </div>
      `;

      const hazardIcon = L.divIcon({
        className: 'flood-hazard-marker',
        html: iconHtml,
        iconSize: [isSelected ? 32 : 26, isSelected ? 32 : 26],
        iconAnchor: [isSelected ? 16 : 13, isSelected ? 16 : 13],
      });

      const marker = L.marker([h.latitude, h.longitude], { icon: hazardIcon })
        .addTo(markersLayer);

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; width: 230px; font-size: 12px; color: #1e293b; padding: 2px;">
          ${h.imageUrl ? `<div style="height: 105px; width: 100%; border-radius: 6px; overflow: hidden; margin-bottom: 6px; background-color: #f1f5f9;"><img src="${h.imageUrl}" alt="${h.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'" /></div>` : ''}
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${h.title}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">📍 ${h.locationName}</div>
          <div style="font-weight: 700; color: ${markerColor}; margin-bottom: 4px;">🌊 ${h.waterDepth || `${h.depthCm} cm water depth`}</div>
          <div style="color: #334155; line-height: 1.35; margin-bottom: 6px;">${h.description.slice(0, 95)}...</div>
          <div style="font-size: 10px; font-weight: 700; color: ${h.verified ? '#16a34a' : '#64748b'}; border-top: 1px solid #f1f5f9; padding-top: 4px;">
            ${h.verified ? '✓ AI Verified by CV' : 'Community Reported (Unverified)'}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      marker.on('click', () => {
        onSelectHazard(h);
      });
    });
  }, [hazards, selectedHazard, severityFilter, onSelectHazard]);

  // 7. Pan to selected hazard smoothly
  useEffect(() => {
    if (selectedHazard && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedHazard.latitude, selectedHazard.longitude], 14, {
        animate: true,
        duration: 0.7,
      });
    }
  }, [selectedHazard]);

  return (
    <div
      className="jalmarg-card"
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 520,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Map Bar with Controls */}
      <div
        style={{
          padding: '0.65rem 1rem',
          borderBottom: '1px solid var(--border-card)',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-dark)' }}>
            Interactive Bengaluru Flood Map
          </h2>
        </div>

        {/* Severity Filter Pills */}
        {onSelectSeverityFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {(['ALL', 'CRITICAL', 'MEDIUM', 'LOW'] as const).map((sev) => {
              const active = (severityFilter || 'ALL') === sev;
              let activeBg = 'var(--primary-blue)';
              if (sev === 'CRITICAL') activeBg = '#ef4444';
              else if (sev === 'MEDIUM') activeBg = '#f97316';
              else if (sev === 'LOW') activeBg = '#ca8a04';

              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => onSelectSeverityFilter(sev)}
                  style={{
                    padding: '0.2rem 0.45rem',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: active ? `1px solid ${activeBg}` : '1px solid var(--border-card)',
                    backgroundColor: active ? activeBg : '#f8fafc',
                    color: active ? '#ffffff' : 'var(--text-body)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {sev === 'ALL' ? 'All Pins' : sev}
                </button>
              );
            })}
          </div>
        )}

        {/* Layer / View Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo(BENGALURU_CENTER, 12);
              }
            }}
            style={{
              padding: '0.25rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--border-card)',
              background: '#f8fafc',
              cursor: 'pointer',
              color: 'var(--text-body)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Reset map view to Bengaluru corridor"
          >
            <Compass size={12} />
            <span>Center</span>
          </button>

          <button
            onClick={() => setActiveTileLayer(activeTileLayer === 'standard' ? 'clean' : 'standard')}
            style={{
              padding: '0.25rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--border-card)',
              background: '#f8fafc',
              color: 'var(--text-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Switch map basemap layer"
          >
            <Layers size={12} />
            <span>{activeTileLayer === 'standard' ? 'OSM' : 'Voyager'}</span>
          </button>

          <button
            onClick={() => setShowHistoricalSpots(!showHistoricalSpots)}
            style={{
              padding: '0.25rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: showHistoricalSpots ? '1px solid #f59e0b' : '1px solid var(--border-card)',
              background: showHistoricalSpots ? '#fffbeb' : '#f8fafc',
              color: showHistoricalSpots ? '#b45309' : 'var(--text-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Toggle 257 BBMP Historical Flood Vulnerable Spots (OpenCity.in)"
          >
            <span>🛡️</span>
            <span>Historical ({historicalPoints.length || 257})</span>
          </button>

          <button
            onClick={() => setLegendVisible(!legendVisible)}
            style={{
              padding: '0.25rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--border-card)',
              background: legendVisible ? '#eff6ff' : '#f8fafc',
              color: legendVisible ? 'var(--primary-blue)' : 'var(--text-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Info size={12} />
            <span>Legend</span>
          </button>
        </div>
      </div>

      {/* Network Alert if tile loading issues */}
      {tileErrorOccurred && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            borderBottom: '1px solid #fde68a',
            padding: '0.35rem 0.85rem',
            fontSize: '0.72rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            zIndex: 25,
          }}
        >
          <AlertCircle size={13} color="#d97706" />
          <span>Notice: Secondary map tile mirror active. Route lines and hazard nodes remain functional.</span>
        </div>
      )}

      {/* Map Canvas */}
      <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 460 }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

        {/* Map Legend Overlay (Upper-Right Corner matching reference) */}
        {legendVisible && (
          <div
            style={{
              position: 'absolute',
              top: '0.85rem',
              right: '0.85rem',
              zIndex: 30,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(6px)',
              border: '1px solid var(--border-card)',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              fontSize: '0.72rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              maxWidth: 210,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.25rem',
                fontWeight: 800,
                color: 'var(--text-dark)',
              }}
            >
              <span>Map Legend</span>
              <button
                onClick={() => setLegendVisible(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              >
                <X size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 18, height: 4, backgroundColor: '#ef4444', borderRadius: 2 }} />
              <span style={{ color: 'var(--text-body)' }}>Standard Route (Flooded)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 18, height: 4, backgroundColor: '#16a34a', borderRadius: 2 }} />
              <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>JalMarg Alternative</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <span style={{ color: 'var(--text-body)' }}>Critical (&gt;2.5 ft)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f97316' }} />
              <span style={{ color: 'var(--text-body)' }}>Medium (1 to 2 ft)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#eab308' }} />
              <span style={{ color: 'var(--text-body)' }}>Low (&lt;1 ft)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b', border: '1px solid #ffffff' }} />
              <span style={{ color: 'var(--text-body)' }}>BBMP Historical (OpenCity)</span>
            </div>
          </div>
        )}

        {/* Selected Incident Popup Card (Matching Reference: Silk Board Underpass) */}
        {selectedHazard && (
          <div
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              right: '1rem',
              maxWidth: 380,
              zIndex: 35,
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '0.85rem',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {/* Header & Close */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span
                    className={
                      selectedHazard.severity === 'CRITICAL'
                        ? 'badge-critical'
                        : selectedHazard.severity === 'MEDIUM'
                        ? 'badge-medium'
                        : 'badge-low'
                    }
                  >
                    {selectedHazard.severity}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: selectedHazard.verified ? '#dcfce7' : '#f1f5f9',
                      color: selectedHazard.verified ? '#15803d' : 'var(--text-muted)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                    }}
                  >
                    {selectedHazard.verified ? 'Verified Sensor' : 'Active (Unverified)'}
                  </span>
                </div>

                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                  {selectedHazard.title}
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={12} color="var(--primary-blue)" />
                  <span>{selectedHazard.locationName}</span>
                </div>
              </div>

              <button
                onClick={() => onSelectHazard(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                backgroundColor: '#f8fafc',
                padding: '0.5rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Water Level:</span>
                <strong style={{ color: selectedHazard.severity === 'CRITICAL' ? '#b91c1c' : '#c2410c' }}>
                  {selectedHazard.waterDepth || `~${(selectedHazard.depthCm / 30.48).toFixed(1)} ft`}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Reported:</span>
                <strong style={{ color: 'var(--text-dark)' }}>
                  {selectedHazard.title === 'Silk Board Underpass' ? '15 mins ago' : 'Recent'}
                </strong>
              </div>
            </div>

            {/* Description & Designed Photo Thumbnail / Placeholder */}
            <p style={{ fontSize: '0.74rem', color: 'var(--text-body)', lineHeight: 1.35 }}>
              {selectedHazard.description}
            </p>

            {/* Designed incident photo thumbnail */}
            <div
              style={{
                borderRadius: '8px',
                overflow: 'hidden',
                height: 75,
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selectedHazard.imageUrl ? (
                <img
                  src={selectedHazard.imageUrl}
                  alt={selectedHazard.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.72rem' }}>
                  <Droplet size={16} color="#38bdf8" />
                  <span>Monsoon Waterlogging Visual Record</span>
                </div>
              )}
              <span
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                }}
              >
                INCIDENT EVIDENCE
              </span>

              {selectedHazard.imageUrl && onDeletePhoto && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `Delete photo from "${selectedHazard.title}"?\n\nThe report and location pin will remain active on the map.`
                      )
                    ) {
                      onDeletePhoto(selectedHazard.id);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    backgroundColor: 'rgba(239, 68, 68, 0.92)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.2rem 0.45rem',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    zIndex: 10,
                  }}
                  title="Delete uploaded photo"
                >
                  <Trash2 size={11} />
                  <span>Delete photo</span>
                </button>
              )}
            </div>

            {/* Post-submission report actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '0.35rem',
                borderTop: '1px solid #f1f5f9',
                fontSize: '0.72rem',
              }}
            >
              <div style={{ color: 'var(--text-light)', fontSize: '0.68rem' }}>
                ID: {selectedHazard.id}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedHazard.imageUrl && onDeletePhoto && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Delete photo from "${selectedHazard.title}"?\n\nThe hazard report, depth data, and coordinates will be preserved.`
                        )
                      ) {
                        onDeletePhoto(selectedHazard.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    <Trash2 size={11} />
                    <span>Delete photo</span>
                  </button>
                )}

                {onDeleteReport && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Delete report "${selectedHazard.title}" completely?\n\nThis will remove the report and pin from the map.`
                        )
                      ) {
                        onDeleteReport(selectedHazard.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                    }}
                  >
                    Delete report
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Footer Disclaimer */}
      <div
        style={{
          padding: '0.45rem 1rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid var(--border-card)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <Info size={12} color="var(--primary-blue)" />
        <span>
          Real OpenStreetMap tiles. Sample flood markers and route polylines are simulated for demonstration.
        </span>
      </div>
    </div>
  );
};
