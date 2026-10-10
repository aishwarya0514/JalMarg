import { Compass, AlertTriangle, RefreshCw, Server, PlusCircle } from 'lucide-react';
import type { ApiStatus } from '../services/api';

interface NavbarProps {
  apiStatus: ApiStatus;
  onOpenReportModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalHazardsCount: number;
  criticalCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  apiStatus,
  onOpenReportModal,
  onRefresh,
  isRefreshing,
  totalHazardsCount,
  criticalCount,
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(7, 13, 25, 0.88)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 1100,
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0.85rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.45)',
          }}>
            <Compass size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.03em' }}>
                JalMarg <span style={{ color: 'var(--accent-cyan)' }}>जलमार्ग</span>
              </h1>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--accent-sky)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}>
                AWS BHARAT BUILDS
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Hyperlocal Urban Flood &amp; Waterlogging Hazard Router
            </p>
          </div>
        </div>

        {/* Status Pill & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          {/* Active Hazard Counter Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            background: criticalCount > 0 ? 'var(--sev-critical-bg)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${criticalCount > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
            fontSize: '0.78rem',
            fontWeight: 700,
            color: criticalCount > 0 ? '#fca5a5' : 'var(--text-secondary)',
          }}>
            {criticalCount > 0 ? (
              <>
                <AlertTriangle size={13} color="var(--sev-critical)" />
                <span>{criticalCount} Impassable Underpass(es)</span>
              </>
            ) : (
              <span>{totalHazardsCount} Active Hazards</span>
            )}
          </div>

          {/* Backend Status indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            background: apiStatus.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${apiStatus.connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            fontSize: '0.78rem',
            fontWeight: 600,
            color: apiStatus.connected ? '#6ee7b7' : '#fcd34d',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: apiStatus.connected ? '#10b981' : '#f59e0b',
              display: 'inline-block',
            }} className="animate-pulse-slow" />
            <Server size={14} />
            <span>
              {apiStatus.connected
                ? 'AWS Lambda / API Gateway'
                : 'Local Demo Fallback Active'}
            </span>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="btn-secondary"
            title="Refresh Flood Sensor Telemetry"
            style={{ padding: '0.55rem 0.85rem' }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>

          {/* Report Button */}
          <button onClick={onOpenReportModal} className="btn-primary">
            <PlusCircle size={17} />
            <span>Report Waterlogging</span>
          </button>
        </div>
      </div>
    </header>
  );
};
