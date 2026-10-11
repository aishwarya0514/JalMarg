import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
} from 'lucide-react';
import type { HazardSeverity, ReportHazardInput } from '../types';

interface ReportWaterloggingPanelProps {
  onSubmitReport: (input: ReportHazardInput) => Promise<void>;
  pinnedCoords?: { lat: number; lon: number } | null;
}

export const ReportWaterloggingPanel: React.FC<ReportWaterloggingPanelProps> = ({
  onSubmitReport,
  pinnedCoords,
}) => {
  const [locationName, setLocationName] = useState('Silk Board Underpass, Bengaluru');
  const [latitude, setLatitude] = useState<number>(12.9172);
  const [longitude, setLongitude] = useState<number>(77.6228);
  const [severity, setSeverity] = useState<HazardSeverity>('CRITICAL');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string>('');

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Update coords if pinned from map
  React.useEffect(() => {
    if (pinnedCoords) {
      setLatitude(Number(pinnedCoords.lat.toFixed(5)));
      setLongitude(Number(pinnedCoords.lon.toFixed(5)));
      setLocationName(`Pinned Spot (${pinnedCoords.lat.toFixed(4)}, ${pinnedCoords.lon.toFixed(4)})`);
    }
  }, [pinnedCoords]);

  const handleUseCurrentLocation = () => {
    setGeoLoading(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lon = Number(pos.coords.longitude.toFixed(5));
        setLatitude(lat);
        setLongitude(lon);
        setLocationName(`Current Location (${lat}, ${lon})`);
        setGeoLoading(false);
      },
      (err) => {
        let msg = 'Unable to retrieve location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow GPS or type location.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location signal unavailable.';
        }
        setGeoError(msg);
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve(dataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match('image/jpeg') && !file.type.match('image/png') && !file.type.match('image/webp')) {
        setFormError('Please select a JPG, PNG, or WebP image.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setFormError('Image file is too large. Please select a photo under 8MB.');
        return;
      }
      setFormError(null);
      try {
        const compressedBase64 = await compressImage(file);
        setImageBase64(compressedBase64);
        setImagePreview(compressedBase64);
      } catch {
        setFormError('Failed to process image. Please try another file.');
      }
    }
  };

  const handleRemovePhoto = () => {
    setImageBase64('');
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitSuccess(false);

    if (!locationName.trim()) {
      setFormError('Please provide a valid location name or landmark.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please provide a brief description of the waterlogging.');
      return;
    }

    const depthMap: Record<HazardSeverity, { depthCm: number; text: string }> = {
      CRITICAL: { depthCm: 110, text: 'Not passable (~3.5+ ft)' },
      MEDIUM: { depthCm: 50, text: 'Knee deep (~1.5-2 ft)' },
      LOW: { depthCm: 20, text: 'Ankle deep (< 1 ft)' },
    };

    setIsSubmitting(true);
    try {
      await onSubmitReport({
        title: locationName.trim(),
        note: description.trim(),
        severity,
        depthCm: depthMap[severity].depthCm,
        waterDepth: depthMap[severity].text,
        latitude,
        longitude,
        locationName: locationName.trim(),
        reporter: 'Citizen Commuter',
        imageBase64: imageBase64 || undefined,
        dataSource: 'COMMUNITY_REPORT',
      });

      setSubmitSuccess(true);
      setDescription('');
      setImageBase64('');
      setImagePreview('');

      // Auto-hide success banner after 5s
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch {
      setFormError('Failed to save report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="jalmarg-card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)' }}>
          Report Waterlogging
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Help fellow commuters navigate safely
        </p>
      </div>

      {/* Success Notification Banner */}
      {submitSuccess && (
        <div
          style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#166534',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
          <span>Report submitted successfully &amp; pinned to live map!</span>
        </div>
      )}

      {/* Error Banner */}
      {formError && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#991b1b',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* 1. Location Selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-body)',
              marginBottom: '0.25rem',
            }}
          >
            Location
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MapPin
              size={15}
              color="var(--primary-blue)"
              style={{ position: 'absolute', left: '0.65rem' }}
            />
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="E.g. Silk Board Underpass, ORR Bellandur"
              className="jalmarg-input"
              style={{ paddingLeft: '2rem' }}
            />
          </div>
        </div>

        {/* 2. Use Current Location Button */}
        <div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={geoLoading}
            style={{
              width: '100%',
              padding: '0.45rem',
              fontSize: '0.76rem',
              fontWeight: 600,
              background: '#f8fafc',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--primary-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <Navigation size={13} />
            <span>{geoLoading ? 'Detecting GPS...' : 'Use Current Location'}</span>
          </button>
          {geoError && (
            <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.25rem' }}>
              {geoError}
            </p>
          )}
        </div>

        {/* 3. Severity Selection Cards */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-body)',
              marginBottom: '0.35rem',
            }}
          >
            Severity Level
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.45rem' }}>
            {/* Low */}
            <button
              type="button"
              onClick={() => setSeverity('LOW')}
              style={{
                padding: '0.5rem 0.25rem',
                borderRadius: '8px',
                border: severity === 'LOW' ? '2px solid #eab308' : '1px solid var(--border-card)',
                backgroundColor: severity === 'LOW' ? '#fef9c3' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#854d0e' }}>
                Low
              </div>
              <div style={{ fontSize: '0.66rem', color: '#a16207' }}>
                Ankle deep
              </div>
            </button>

            {/* Medium */}
            <button
              type="button"
              onClick={() => setSeverity('MEDIUM')}
              style={{
                padding: '0.5rem 0.25rem',
                borderRadius: '8px',
                border: severity === 'MEDIUM' ? '2px solid #f97316' : '1px solid var(--border-card)',
                backgroundColor: severity === 'MEDIUM' ? '#ffedd5' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#c2410c' }}>
                Medium
              </div>
              <div style={{ fontSize: '0.66rem', color: '#9a3412' }}>
                Knee deep
              </div>
            </button>

            {/* Critical */}
            <button
              type="button"
              onClick={() => setSeverity('CRITICAL')}
              style={{
                padding: '0.5rem 0.25rem',
                borderRadius: '8px',
                border: severity === 'CRITICAL' ? '2px solid #ef4444' : '1px solid var(--border-card)',
                backgroundColor: severity === 'CRITICAL' ? '#fee2e2' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626' }}>
                Critical
              </div>
              <div style={{ fontSize: '0.66rem', color: '#991b1b' }}>
                Not passable
              </div>
            </button>
          </div>
        </div>

        {/* 4. Description Textarea */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-body)',
              marginBottom: '0.25rem',
            }}
          >
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g. Underpass water logged, vehicles not able to pass"
            className="jalmarg-input"
            style={{ resize: 'none', fontSize: '0.82rem' }}
          />
        </div>

        {/* 5. Optional Photo Upload (JPG / PNG) */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-body)',
              marginBottom: '0.25rem',
            }}
          >
            Photo (Optional JPG / PNG)
          </label>

          {imagePreview ? (
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
              <img
                src={imagePreview}
                alt="Hazard preview"
                style={{ width: '100%', height: 90, objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  background: 'rgba(15, 23, 42, 0.75)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Remove photo"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <label
              style={{
                border: '1px dashed var(--border-card)',
                borderRadius: '8px',
                padding: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                backgroundColor: '#f8fafc',
                color: 'var(--text-muted)',
                fontSize: '0.76rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Camera size={15} color="var(--primary-blue)" />
              <span>Attach incident photo (JPG, PNG)</span>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        {/* 6. Blue Submit Report Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary-blue"
          style={{ width: '100%', marginTop: '0.25rem' }}
        >
          {isSubmitting ? (
            <span>Submitting Report...</span>
          ) : (
            <>
              <Send size={15} />
              <span>Submit Report</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
