import React from 'react';
import {
  Clock,
  MapPin,
  AlertTriangle,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import type { FloodHazard } from '../types';

interface RecentReportsSectionProps {
  hazards: FloodHazard[];
  onSelectHazard: (hazard: FloodHazard) => void;
  onOpenViewAll: () => void;
  selectedSeverity?: 'ALL' | 'CRITICAL' | 'MEDIUM' | 'LOW';
  onSelectSeverity?: (sev: 'ALL' | 'CRITICAL' | 'MEDIUM' | 'LOW') => void;
  onDeletePhoto?: (hazardId: string) => Promise<void> | void;
  onDeleteReport?: (hazardId: string) => Promise<void> | void;
}

export const RecentReportsSection: React.FC<RecentReportsSectionProps> = ({
  hazards,
  onSelectHazard,
  onOpenViewAll,
  selectedSeverity = 'ALL',
  onSelectSeverity,
  onDeletePhoto,
  onDeleteReport,
}) => {
  const filtered = hazards.filter((h) => selectedSeverity === 'ALL' || h.severity === selectedSeverity);
  const displayReports = filtered.slice(0, 4);

  return (
    <div
      className="jalmarg-card"
      style={{
        padding: '1.25rem 1.5rem',
        marginTop: '1.5rem',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-dark)' }}>
              Recent Flood Reports
            </h2>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: '#f1f5f9',
                color: 'var(--text-muted)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
              }}
            >
              LIVE TELEMETRY
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Crowdsourced waterlogging reports and computer vision verified evidence
          </p>
        </div>

        {/* Filter Pills & View All */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {onSelectSeverity && (
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {(['ALL', 'CRITICAL', 'MEDIUM', 'LOW'] as const).map((sev) => {
                const isActive = selectedSeverity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => onSelectSeverity(sev)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isActive ? '1px solid var(--primary-blue)' : '1px solid var(--border-card)',
                      backgroundColor: isActive ? 'var(--primary-blue)' : '#f8fafc',
                      color: isActive ? '#ffffff' : 'var(--text-body)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sev === 'ALL' ? 'All Severities' : sev}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={onOpenViewAll}
            style={{
              background: 'none',
              border: '1px solid var(--border-card)',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--primary-blue)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
            }}
            className="hover:bg-slate-50"
          >
            <span>View All ({hazards.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 4 Horizontal Cards Row on Desktop */}
      {displayReports.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No flood reports found for this filter.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}
        >
          {displayReports.map((report) => {
            const isCritical = report.severity === 'CRITICAL';
            const isMedium = report.severity === 'MEDIUM';

            return (
              <div
                key={report.id}
                onClick={() => onSelectHazard(report)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-card)',
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-blue)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-card)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                }}
              >
                <div>
                  {/* Photo Display */}
                  <div
                    style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      height: 120,
                      marginBottom: '0.65rem',
                      backgroundColor: '#f1f5f9',
                      position: 'relative',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {report.imageUrl ? (
                      <img
                        src={report.imageUrl}
                        alt={report.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                          fontSize: '0.75rem',
                        }}
                      >
                        🌊 Incident Evidence Photo
                      </div>
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        backgroundColor: report.verified ? 'rgba(22, 101, 52, 0.88)' : 'rgba(71, 85, 105, 0.88)',
                        color: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {report.verified ? '✓ CV Verified' : 'Community'}
                    </span>

                    {report.imageUrl && onDeletePhoto && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Delete photo from report "${report.title}"?\n\nThe hazard report, depth data, and map location will be preserved.`
                            )
                          ) {
                            onDeletePhoto(report.id);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          left: 6,
                          backgroundColor: 'rgba(239, 68, 68, 0.92)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                          zIndex: 5,
                        }}
                        title="Delete photo from report"
                      >
                        <Trash2 size={11} />
                        <span>Delete photo</span>
                      </button>
                    )}
                  </div>

                  {/* Badges Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <span
                      className={
                        isCritical
                          ? 'badge-critical'
                          : isMedium
                          ? 'badge-medium'
                          : 'badge-low'
                      }
                    >
                      {isCritical && <AlertTriangle size={11} />}
                      <span>{report.severity}</span>
                    </span>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {report.waterDepth || `${report.depthCm} cm`}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: 'var(--text-dark)',
                      marginBottom: '0.25rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {report.title}
                  </h3>

                  {/* Location */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <MapPin size={13} color="var(--primary-blue)" style={{ flexShrink: 0 }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {report.locationName}
                    </span>
                  </div>
                </div>

                {/* Timestamp & Click hint */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.5rem',
                    fontSize: '0.72rem',
                    color: 'var(--text-light)',
                    marginTop: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={12} />
                    <span>
                      {(() => {
                        const diffMin = Math.round((Date.now() - new Date(report.reportedAt).getTime()) / 60000);
                        if (diffMin < 1) return 'Just now';
                        if (diffMin < 60) return `${diffMin} mins ago`;
                        const diffHr = Math.floor(diffMin / 60);
                        return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
                      })()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {onDeleteReport && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Delete report "${report.title}" completely?\n\nThis will remove the report and pin from the map.`
                            )
                          ) {
                            onDeleteReport(report.id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                        title="Delete this hazard report"
                      >
                        Delete
                      </button>
                    )}
                    <span style={{ color: 'var(--primary-blue)', fontWeight: 600, fontSize: '0.7rem' }}>
                      Locate on map →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
