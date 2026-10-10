import React from 'react';
import type { RouteComparison } from '../types';
import {
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Info,
} from 'lucide-react';

interface RouteComparisonCardProps {
  routeComparison: RouteComparison | null;
  onSelectPreset: (presetIndex: number) => void;
  activePreset: number;
  loading: boolean;
}

export const PRESET_ROUTES = [
  {
    name: 'Silk Board to Indiranagar',
    origin: { latitude: 12.9150, longitude: 77.6200, label: 'Silk Board South' },
    destination: { latitude: 12.9750, longitude: 77.6450, label: 'Indiranagar 100ft' },
    description: 'Bypasses submerged Silk Board Underpass and Koramangala 80ft backflow.',
  },
  {
    name: 'Koramangala to Bellandur Tech Park',
    origin: { latitude: 12.9340, longitude: 77.6200, label: 'Koramangala 4th Block' },
    destination: { latitude: 12.9280, longitude: 77.6850, label: 'Ecospace Outer Ring Rd' },
    description: 'Bypasses severe Bellandur Ecospace service road waterlogging.',
  },
];

export const RouteComparisonCard: React.FC<RouteComparisonCardProps> = ({
  routeComparison,
  onSelectPreset,
  activePreset,
  loading,
}) => {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      {/* Header and Preset Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Navigation size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
              Dual Routing & Hazard Avoidance Engine
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Compare standard shortest path against JalMarg's dynamic detour bypassing flooded nodes.
          </p>
        </div>

        {/* Preset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Simulate Corridors:
          </span>
          {PRESET_ROUTES.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPreset(idx)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: activePreset === idx ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: activePreset === idx ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: activePreset === idx ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Recalculating safe detour around active waterlogged underpasses...
        </div>
      ) : routeComparison ? (
        <div>
          {/* Dual Route Comparison Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.25rem',
          }}>
            {/* Direct Route Card (Danger) */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: routeComparison.directRoute.isWaterlogged
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: routeComparison.directRoute.isWaterlogged
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}>
                  Default Direct Route
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={13} /> {routeComparison.directRoute.etaMinutes} mins
                </span>
              </div>

              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>
                {routeComparison.directRoute.distanceKm} km
              </div>

              <div style={{
                fontSize: '0.82rem',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.4rem',
                lineHeight: 1.4,
                marginBottom: '0.75rem',
              }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{routeComparison.directRoute.hazardWarning}</span>
              </div>

              {routeComparison.intersectingHazards && routeComparison.intersectingHazards.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '0.5rem' }}>
                  Intersects <strong>{routeComparison.intersectingHazards.length}</strong> active hazard node(s):{' '}
                  <span style={{ color: '#fca5a5' }}>
                    {routeComparison.intersectingHazards.map((h) => h.title).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* JalMarg Safe Detour Card (Emerald Green) */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                }}>
                  JalMarg Safe Detour (Recommended)
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={13} /> {routeComparison.safeDetourRoute.etaMinutes} mins
                </span>
              </div>

              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>
                {routeComparison.safeDetourRoute.distanceKm} km
              </div>

              <div style={{
                fontSize: '0.82rem',
                color: '#6ee7b7',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.4rem',
                lineHeight: 1.4,
                marginBottom: '0.75rem',
              }}>
                <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{routeComparison.safeDetourRoute.protectionTag}</span>
              </div>

              {routeComparison.safeDetourRoute.timeSavedMinutes > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-sky)', borderTop: '1px solid rgba(16, 185, 129, 0.2)', paddingTop: '0.5rem' }}>
                  ⚡ Saved estimated <strong>{routeComparison.safeDetourRoute.timeSavedMinutes} minutes</strong> of waterlogged traffic gridlock.
                </div>
              )}
            </div>
          </div>

          {/* Safety Disclaimer Banner */}
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(7, 13, 25, 0.5)',
            padding: '0.5rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
            <Info size={13} color="var(--accent-sky)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Safety Disclaimer:</strong> Routes are simulated based on crowdsourced and sensor reports. Water depth can vary dynamically. Never attempt to drive through flooded underpasses or unmeasured standing water.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
