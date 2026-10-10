import React from 'react';
import type { FloodHazard } from '../types';
import { Clock, MapPin } from 'lucide-react';

interface HazardListProps {
  hazards: FloodHazard[];
  selectedHazard: FloodHazard | null;
  onSelectHazard: (hazard: FloodHazard) => void;
}

const formatDepth = (hazard: FloodHazard) => {
  return `${hazard.depthCm} cm (~${(hazard.depthCm / 30.48).toFixed(1)} ft)`;
};

const formatTimeAgo = (iso: string) => {
  try {
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ${diffMin % 60}m ago`;
  } catch {
    return iso;
  }
};

export const HazardList: React.FC<HazardListProps> = ({
  hazards,
  selectedHazard,
  onSelectHazard,
}) => {
  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
      }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
            Active Urban Flood Hazard Feed ({hazards.length})
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Dynamic 3-hour TTL indexed by Geohash with AWS Rekognition validation.
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '1.25rem',
      }}>
        {hazards.map((hazard) => {
          const isSelected = selectedHazard?.id === hazard.id;
          const isCritical = hazard.severity === 'CRITICAL';
          const isMedium = hazard.severity === 'MEDIUM';

          return (
            <div
              key={hazard.id}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                border: isSelected
                  ? '1px solid var(--accent-cyan)'
                  : isCritical
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : isMedium
                  ? '1px solid rgba(245, 158, 11, 0.3)'
                  : '1px solid var(--border-subtle)',
                background: isSelected
                  ? 'rgba(6, 182, 212, 0.12)'
                  : 'var(--bg-glass-card)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => onSelectHazard(hazard)}
            >
              {/* Badges Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.65rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span className={`badge badge-${hazard.severity.toLowerCase()}`}>
                    {hazard.severity} • {formatDepth(hazard)}
                  </span>
                  {hazard.verified && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      ✓ CV Verified ({hazard.verificationConfidence}%)
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} /> {formatTimeAgo(hazard.reportedAt)}
                </span>
              </div>

              {/* Title & Image Layout */}
              <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '0.65rem' }}>
                {hazard.imageUrl && (
                  <div style={{
                    width: 76,
                    height: 76,
                    flexShrink: 0,
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <img
                      src={hazard.imageUrl}
                      alt={hazard.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.3, marginBottom: '0.25rem' }}>
                    {hazard.title}
                  </h4>
                  <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {hazard.description}
                  </p>
                </div>
              </div>

              {/* Location & Action */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.65rem',
                fontSize: '0.78rem',
              }}>
                <span style={{ color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                  <MapPin size={13} style={{ flexShrink: 0 }} />
                  {hazard.locationName}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectHazard(hazard);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  Locate 📍
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
