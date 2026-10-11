import React from 'react';
import {
  X,
  Droplets,
  AlertTriangle,
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay-solid" onClick={onClose}>
      <div
        className="modal-dialog-solid"
        style={{ padding: '1.75rem', maxWidth: 640 }}
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
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Droplets size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                About JalMarg
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Flood-Aware Urban Navigation &amp; Citizen Hazard Intelligence
              </p>
            </div>
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

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.84rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
          <p>
            <strong>JalMarg (जलमार्ग)</strong> is a civic navigation platform engineered to protect urban commuters during heavy Indian monsoon rains and flash flood events.
          </p>

          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <strong style={{ color: '#1e40af', fontSize: '0.88rem' }}>How It Works:</strong>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li>
                <strong>Crowdsourced &amp; IoT Telemetry:</strong> Collects community waterlogging reports with water depth and photographic evidence.
              </li>
              <li>
                <strong>Dynamic Clearance Routing:</strong> Bypasses submerged bottlenecks (e.g. Silk Board Underpass, Bellandur Ecospace, Hebbal) by navigating along elevated high-ground corridors.
              </li>
              <li>
                <strong>Emergency Integration:</strong> Direct one-tap access to national disaster rescue services (112, NDMA, NDRF).
              </li>
            </ul>
          </div>

          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              color: '#92400e',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} color="#d97706" />
            <div style={{ fontSize: '0.78rem' }}>
              <strong>Important Safety Disclaimer:</strong> Sample markers, hazard reports, and routes displayed in this demonstration mode are simulated. Real-world flood conditions fluctuate rapidly. Always follow advisories from local municipal authorities, traffic police, and national emergency agencies.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              onClick={onClose}
              className="btn-primary-blue"
              style={{ padding: '0.5rem 1.25rem' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
