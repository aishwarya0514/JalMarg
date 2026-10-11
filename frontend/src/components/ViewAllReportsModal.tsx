import React, { useState } from 'react';
import {
  X,
  MapPin,
  Search,
  Trash2,
} from 'lucide-react';
import type { FloodHazard, HazardSeverity } from '../types';

interface ViewAllReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hazards: FloodHazard[];
  onSelectHazard: (hazard: FloodHazard) => void;
  onDeletePhoto?: (hazardId: string) => Promise<void> | void;
  onDeleteReport?: (hazardId: string) => Promise<void> | void;
}

export const ViewAllReportsModal: React.FC<ViewAllReportsModalProps> = ({
  isOpen,
  onClose,
  hazards,
  onSelectHazard,
  onDeletePhoto,
  onDeleteReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<HazardSeverity | 'ALL'>('ALL');

  if (!isOpen) return null;

  const filteredHazards = hazards.filter((h) => {
    const matchesSeverity =
      selectedSeverity === 'ALL' || h.severity === selectedSeverity;
    const matchesSearch =
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="modal-overlay-solid" onClick={onClose}>
      <div
        className="modal-dialog-solid"
        style={{ padding: '1.5rem', maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-card)',
            paddingBottom: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)' }}>
              All Flood &amp; Waterlogging Reports ({hazards.length})
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Crowdsourced community telemetry and IoT sensor data for Bengaluru
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by area, road, or description..."
              className="jalmarg-input"
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>

          {/* Severity Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {(['ALL', 'CRITICAL', 'MEDIUM', 'LOW'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: selectedSeverity === sev ? '1px solid var(--primary-blue)' : '1px solid var(--border-card)',
                  backgroundColor: selectedSeverity === sev ? 'var(--primary-blue)' : '#f8fafc',
                  color: selectedSeverity === sev ? '#ffffff' : 'var(--text-body)',
                  transition: 'all 0.15s ease',
                }}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        <div
          style={{
            maxHeight: '60vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {filteredHazards.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hazard reports match your search criteria.
            </div>
          ) : (
            filteredHazards.map((hazard) => (
              <div
                key={hazard.id}
                style={{
                  border: '1px solid var(--border-card)',
                  borderRadius: '10px',
                  padding: '1rem',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  onSelectHazard(hazard);
                  onClose();
                }}
                className="hover:border-blue-400 hover:shadow-sm"
              >
                {hazard.imageUrl && (
                  <div
                    style={{
                      width: 110,
                      height: 85,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={hazard.imageUrl}
                      alt={hazard.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    {onDeletePhoto && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Delete photo from "${hazard.title}"?\n\nThe report and map marker will remain active.`
                            )
                          ) {
                            onDeletePhoto(hazard.id);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          backgroundColor: 'rgba(239, 68, 68, 0.92)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 5px',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        }}
                        title="Delete photo"
                      >
                        <Trash2 size={10} />
                        <span>Delete photo</span>
                      </button>
                    )}
                  </div>
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span
                        className={
                          hazard.severity === 'CRITICAL'
                            ? 'badge-critical'
                            : hazard.severity === 'MEDIUM'
                            ? 'badge-medium'
                            : 'badge-low'
                        }
                      >
                        {hazard.severity}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                        {hazard.title}
                      </span>
                    </div>

                    <span
                      className={
                        hazard.verified ? 'badge-verified' : 'badge-unverified'
                      }
                    >
                      {hazard.verified ? '✓ CV Verified' : 'Community'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <MapPin size={13} color="var(--primary-blue)" />
                    <span>{hazard.locationName}</span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', lineHeight: 1.35, margin: '2px 0' }}>
                    {hazard.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.45rem',
                      marginTop: '0.2rem',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span>🌊 {hazard.waterDepth || `${hazard.depthCm} cm`}</span>
                      <span>•</span>
                      <span>Reported by: {hazard.reporter}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {hazard.imageUrl && onDeletePhoto && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Delete photo from "${hazard.title}"?\n\nThe report data and map location will remain intact.`
                              )
                            ) {
                              onDeletePhoto(hazard.id);
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
                                `Delete hazard report "${hazard.title}" completely?\n\nThis will remove the report and pin from the map.`
                              )
                            ) {
                              onDeleteReport(hazard.id);
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

                      <span style={{ color: 'var(--primary-blue)', fontWeight: 700 }}>
                        Show on Map →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
