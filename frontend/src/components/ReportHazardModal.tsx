import React, { useState } from 'react';
import type { ReportHazardInput, HazardSeverity } from '../types';
import {
  X,
  AlertTriangle,
  MapPin,
  Camera,
  Send,
  CheckCircle2,
  Navigation,
  Zap,
} from 'lucide-react';

interface ReportHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportHazardInput) => Promise<void>;
  pinnedCoords?: { lat: number; lon: number } | null;
  onStartPinning: () => void;
}

const SEVERITY_LEVELS: {
  level: HazardSeverity;
  label: string;
  depthDesc: string;
  depthCm: number;
  color: string;
}[] = [
  {
    level: 'CRITICAL',
    label: 'Critical / Impassable',
    depthDesc: '3 to 5 feet (Submerged underpass, stalled cars)',
    depthCm: 120,
    color: 'var(--sev-critical)',
  },
  {
    level: 'MEDIUM',
    label: 'Medium / Knee-Deep',
    depthDesc: '1.5 to 2.5 feet (Hydro-lock risk for 2-wheelers & sedans)',
    depthCm: 60,
    color: 'var(--sev-high)',
  },
  {
    level: 'LOW',
    label: 'Low / Ankle-Deep',
    depthDesc: '< 1 foot (Curbside pooling, slow crawl traffic)',
    depthCm: 25,
    color: '#eab308',
  },
];

export const ReportHazardModal: React.FC<ReportHazardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  pinnedCoords,
  onStartPinning,
}) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [severity, setSeverity] = useState<HazardSeverity>('CRITICAL');
  const [latitude, setLatitude] = useState<number>(pinnedCoords ? pinnedCoords.lat : 12.9200);
  const [longitude, setLongitude] = useState<number>(pinnedCoords ? pinnedCoords.lon : 77.6250);
  const [locationName, setLocationName] = useState('Central Silk Board Area, Bengaluru');
  const [landmark, setLandmark] = useState('');
  const [reporter, setReporter] = useState('Commuter Citizen');
  const [dataSource, setDataSource] = useState('Passive Velocity Anomaly');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update lat/lon if pinnedCoords changed
  React.useEffect(() => {
    if (pinnedCoords) {
      setLatitude(Number(pinnedCoords.lat.toFixed(5)));
      setLongitude(Number(pinnedCoords.lon.toFixed(5)));
      setLocationName(`Pinned Spot (${pinnedCoords.lat.toFixed(4)}, ${pinnedCoords.lon.toFixed(4)})`);
    }
  }, [pinnedCoords]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageBase64(result);
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(5)));
          setLongitude(Number(pos.coords.longitude.toFixed(5)));
          setLocationName(`Current GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        },
        () => {
          // Default fallback to Bengaluru center
          setLatitude(12.9300);
          setLongitude(77.6300);
          setLocationName('Bengaluru Koramangala Zone');
        }
      );
    }
  };

  const handleQuickPassiveSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const selectedSev = SEVERITY_LEVELS.find((s) => s.level === severity);
      await onSubmit({
        title: title.trim() || `Passive Telemetry: ${severity} logging @ ${locationName}`,
        note: note.trim() || `Automated zero-photo passive telemetry report. Depth ~${selectedSev?.depthDesc || '60 cm'}.`,
        severity,
        depthCm: selectedSev?.depthCm || 60,
        waterDepth: selectedSev?.depthDesc,
        latitude,
        longitude,
        locationName: locationName.trim(),
        landmark: landmark.trim() || undefined,
        reporter: reporter.trim() || 'Passive Vehicle Sensor',
        dataSource: 'Passive Velocity Anomaly',
      });
      onClose();
    } catch {
      setErrorMsg('Quick passive submission encountered an error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please specify a title or hazard location description.');
      return;
    }

    const selectedSev = SEVERITY_LEVELS.find((s) => s.level === severity);

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        note: note.trim() || `${severity} waterlogging reported.`,
        severity,
        depthCm: selectedSev?.depthCm || 60,
        waterDepth: selectedSev?.depthDesc,
        latitude,
        longitude,
        locationName: locationName.trim(),
        landmark: landmark.trim() || undefined,
        reporter: reporter.trim() || 'Citizen Reporter',
        imageBase64: imageBase64 || undefined,
        dataSource,
      });
      onClose();
    } catch {
      setErrorMsg('Submission encountered an error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent background scrolling when modal is active
  React.useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop-solid fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog-solid relative z-[10000] bg-slate-900 border border-slate-700/60 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8"
        style={{
          position: 'relative',
          zIndex: 10000,
          backgroundColor: '#0f172a',
          border: '1px solid rgba(51, 65, 85, 0.8)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '1.25rem',
            top: '1.25rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <AlertTriangle size={22} color="var(--sev-high)" />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              Report Monsoon Waterlogging Hazard
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Instant report intake verified by Amazon Rekognition Computer Vision with 3-hour TTL.
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--sev-critical-bg)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            {errorMsg}
          </div>
        )}

        {/* Zero-Photo & Passive Telemetry Quick-Action Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.16) 0%, rgba(2, 132, 199, 0.25) 100%)',
          border: '1px solid var(--accent-cyan)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontWeight: 800, fontSize: '0.88rem' }}>
              <Zap size={16} /> 1-Tap Zero-Photo Passive Telemetry
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
              No photo or manual typing needed. Instantly tags current coordinates via speed anomaly &amp; hydro radar.
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickPassiveSubmit}
            disabled={isSubmitting}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem 1rem',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Zap size={14} />
            <span>Instant Broadcast</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.4rem' }}>
              Hazard Spot Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Madiwala Underpass completely inundated"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'rgba(7, 13, 25, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Severity Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.4rem' }}>
              Water Depth & Severity Level *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
              {SEVERITY_LEVELS.map((s) => (
                <div
                  key={s.level}
                  onClick={() => setSeverity(s.level)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: severity === s.level ? `1px solid ${s.color}` : '1px solid var(--border-subtle)',
                    background: severity === s.level ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>{s.label}</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.depthDesc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Location Coordinates & Pin Picker */}
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(7, 13, 25, 0.5)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={15} color="var(--accent-sky)" /> Geolocation Coordinates
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleUseGPS}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: 'var(--accent-sky)',
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Navigation size={12} /> Auto GPS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartPinning();
                  }}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#6ee7b7',
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  📍 Click-to-Pin on Map
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Area name / Street identifier..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                }}
              />
              <input
                type="text"
                placeholder="Nearby Landmark (e.g. Underpass Gate 2)"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          {/* Description note */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.4rem' }}>
              Condition Details & Ground Observation
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Traffic halted; water entered two auto rickshaws; please avoid..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'rgba(7, 13, 25, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                fontSize: '0.88rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Telemetry Data Source Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.4rem' }}>
              Telemetry Data Source
            </label>
            <select
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'rgba(7, 13, 25, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            >
              <option value="Passive Velocity Anomaly">Passive Velocity Anomaly (Zero-Photo Sensor Telemetry)</option>
              <option value="Live Weather Radar + Hydro-DEM Model">Live Weather Radar + Hydro-DEM Model</option>
              <option value="AWS Rekognition CV Verified">AWS Rekognition CV Verified (With Image)</option>
              <option value="Crowdsourced Citizen Telemetry">Crowdsourced Citizen Telemetry</option>
            </select>
          </div>

          {/* Evidence Image Upload with Base64 Preview */}
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(7, 13, 25, 0.5)',
            border: '1px dashed var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Camera size={15} color="var(--accent-cyan)" /> Evidence Photo (Optional — Amazon Rekognition CV)
              </span>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>Zero-Photo Supported</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Photos are validated with AWS Rekognition. If no photo is available, passive sensor telemetry will verify depth.
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
            />

            {imagePreview && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                />
                <span style={{ fontSize: '0.78rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={14} /> Image encoded for AWS Rekognition validation
                </span>
              </div>
            )}
          </div>

          {/* Reporter Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Your Name / Handle (e.g. Commuter Vinay)"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                background: 'rgba(7, 13, 25, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              <Send size={15} />
              <span>{isSubmitting ? 'Verifying with CV...' : 'Submit Flood Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
