import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Car,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  ArrowUpDown,
  Info,
  Database,
  MapPin,
  Sparkles,
} from 'lucide-react';
import type { RouteComparison, ResolvedLocation } from '../types';
import { searchBengaluruLocations } from '../services/api';

interface PlanRoutePanelProps {
  onCalculateRoute: (from: string, to: string, forceDemoCorridorId?: string) => Promise<void>;
  routeComparison: RouteComparison | null;
  loading: boolean;
  routeError?: string | null;
  onClearRouteError?: () => void;
  onLoadRecordedDemoRoute?: (corridorId: string) => void;
}

export const PlanRoutePanel: React.FC<PlanRoutePanelProps> = ({
  onCalculateRoute,
  routeComparison,
  loading,
  routeError,
  onClearRouteError,
  onLoadRecordedDemoRoute,
}) => {
  const [fromLocation, setFromLocation] = useState(
    routeComparison?.origin?.query || 'Silk Board, Bengaluru'
  );
  const [toLocation, setToLocation] = useState(
    routeComparison?.destination?.query || 'Marathahalli, Bengaluru'
  );
  const [showLocationDetails, setShowLocationDetails] = useState(true);
  const [demoModeActive, setDemoModeActive] = useState(false);

  // Autocomplete states
  const [fromSuggestions, setFromSuggestions] = useState<ResolvedLocation[]>([]);
  const [toSuggestions, setToSuggestions] = useState<ResolvedLocation[]>([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const fromRef = useRef<HTMLDivElement | null>(null);
  const toRef = useRef<HTMLDivElement | null>(null);

  // Sync inputs if routeComparison changes externally
  useEffect(() => {
    if (routeComparison?.origin?.query) {
      setFromLocation(routeComparison.origin.query);
    }
    if (routeComparison?.destination?.query) {
      setToLocation(routeComparison.destination.query);
    }
  }, [routeComparison]);

  // Debounced Origin Autocomplete (400ms, min 3 chars)
  useEffect(() => {
    const trimmed = fromLocation.trim();
    if (trimmed.length < 3) {
      setFromSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchBengaluruLocations(trimmed);
        setFromSuggestions(results);
      } catch {
        setFromSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [fromLocation]);

  // Debounced Destination Autocomplete (400ms, min 3 chars)
  useEffect(() => {
    const trimmed = toLocation.trim();
    if (trimmed.length < 3) {
      setToSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchBengaluruLocations(trimmed);
        setToSuggestions(results);
      } catch {
        setToSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [toLocation]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) {
        setShowFromDropdown(false);
      }
      if (toRef.current && !toRef.current.contains(e.target as Node)) {
        setShowToDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSwap = () => {
    const tempFrom = fromLocation;
    const tempTo = toLocation;
    setFromLocation(tempTo);
    setToLocation(tempFrom);
    if (onClearRouteError) onClearRouteError();
    if (tempTo.trim() && tempFrom.trim()) {
      onCalculateRoute(tempTo, tempFrom);
    }
  };

  const handleFindSafeRoute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowFromDropdown(false);
    setShowToDropdown(false);
    if (onClearRouteError) onClearRouteError();
    if (!fromLocation.trim() || !toLocation.trim()) return;
    onCalculateRoute(fromLocation, toLocation);
  };

  const handleSelectDemoCorridor = (
    corridorId: string,
    originQuery: string,
    destQuery: string
  ) => {
    setFromLocation(originQuery);
    setToLocation(destQuery);
    setShowFromDropdown(false);
    setShowToDropdown(false);
    if (onClearRouteError) onClearRouteError();

    if (demoModeActive && onLoadRecordedDemoRoute) {
      onLoadRecordedDemoRoute(corridorId);
    } else {
      onCalculateRoute(originQuery, destQuery, demoModeActive ? corridorId : undefined);
    }
  };

  // Popular suggested locations for error correction
  const SUGGESTED_BENGALURU_ZONES = [
    'Jalahalli Cross',
    'Majestic',
    'Yeshwanthpur',
    'Peenya',
    'Rajajinagar',
    'Malleshwaram',
    'Hebbal',
    'Jakkur',
    'Yelahanka',
    'KR Puram',
    'Whitefield',
    'Marathahalli',
    'Silk Board',
    'Electronic City',
    'BTM Layout',
    'Jayanagar',
    'Banashankari',
    'Vijayanagar',
    'Kengeri',
    'RR Nagar',
    'HSR Layout',
    'Koramangala',
    'Indiranagar',
    'MG Road',
    'Devanahalli',
  ];

  return (
    <div
      className="jalmarg-card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Heading & Demo Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'rgba(37, 99, 235, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-blue)',
            }}
          >
            <Navigation size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)' }}>
              Plan Your Route
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Bengaluru-wide flood-aware navigation
            </p>
          </div>
        </div>

        {/* Demo Mode Button */}
        <button
          type="button"
          onClick={() => setDemoModeActive(!demoModeActive)}
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '0.25rem 0.55rem',
            borderRadius: '6px',
            border: demoModeActive ? '1px solid #059669' : '1px solid var(--border-card)',
            backgroundColor: demoModeActive ? '#ecfdf5' : '#f8fafc',
            color: demoModeActive ? '#059669' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition: 'all 0.15s ease',
          }}
          title="Recorded Data Demo Mode uses verified pre-calculated road routing"
        >
          <Database size={11} />
          <span>{demoModeActive ? 'Demo Mode: ON' : 'Recorded Demo'}</span>
        </button>
      </div>

      {/* Form Inputs */}
      <form onSubmit={handleFindSafeRoute} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {/* From Input (Origin) */}
        <div ref={fromRef} style={{ position: 'relative' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-body)',
              marginBottom: '0.25rem',
            }}
          >
            From (Origin)
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.25)',
                zIndex: 2,
              }}
            />
            <input
              type="text"
              value={fromLocation}
              onChange={(e) => {
                setFromLocation(e.target.value);
                setShowFromDropdown(true);
                if (onClearRouteError) onClearRouteError();
              }}
              onFocus={() => {
                if (fromSuggestions.length > 0) setShowFromDropdown(true);
              }}
              placeholder="Locality, junction, metro station or lat, lon..."
              className="jalmarg-input"
              style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
            />
            {fromLocation && (
              <button
                type="button"
                onClick={() => {
                  setFromLocation('');
                  setFromSuggestions([]);
                  setShowFromDropdown(false);
                }}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear input"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown for Origin */}
          {showFromDropdown && fromSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                marginTop: '4px',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {fromSuggestions.map((sug, idx) => (
                <div
                  key={`${sug.resolvedName}-${idx}`}
                  onClick={() => {
                    setFromLocation(sug.resolvedName);
                    setShowFromDropdown(false);
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    borderBottom: idx < fromSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={12} color="#2563eb" />
                    <span>{sug.resolvedName}</span>
                  </div>
                  {sug.address && (
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {sug.address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '-0.2rem 0' }}>
          <button
            type="button"
            onClick={handleSwap}
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border-card)',
              borderRadius: '50%',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
            title="Swap Origin and Destination"
          >
            <ArrowUpDown size={13} />
          </button>
        </div>

        {/* To Input (Destination) */}
        <div ref={toRef} style={{ position: 'relative' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-body)',
              marginBottom: '0.25rem',
            }}
          >
            To (Destination)
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.25)',
                zIndex: 2,
              }}
            />
            <input
              type="text"
              value={toLocation}
              onChange={(e) => {
                setToLocation(e.target.value);
                setShowToDropdown(true);
                if (onClearRouteError) onClearRouteError();
              }}
              onFocus={() => {
                if (toSuggestions.length > 0) setShowToDropdown(true);
              }}
              placeholder="Locality, junction, metro station or lat, lon..."
              className="jalmarg-input"
              style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
            />
            {toLocation && (
              <button
                type="button"
                onClick={() => {
                  setToLocation('');
                  setToSuggestions([]);
                  setShowToDropdown(false);
                }}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear input"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown for Destination */}
          {showToDropdown && toSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                marginTop: '4px',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {toSuggestions.map((sug, idx) => (
                <div
                  key={`${sug.resolvedName}-${idx}`}
                  onClick={() => {
                    setToLocation(sug.resolvedName);
                    setShowToDropdown(false);
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    borderBottom: idx < toSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={12} color="#dc2626" />
                    <span>{sug.resolvedName}</span>
                  </div>
                  {sug.address && (
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {sug.address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Alert with helpful location suggestions */}
        {routeError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.74rem',
              color: '#b91c1c',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
              <AlertTriangle size={14} color="#dc2626" />
              <span>Location Not Found or Routing Error</span>
            </div>
            <div style={{ lineHeight: 1.35 }}>{routeError}</div>
            <div style={{ marginTop: '0.2rem', paddingTop: '0.35rem', borderTop: '1px solid #fecaca' }}>
              <div style={{ fontWeight: 700, fontSize: '0.68rem', color: '#991b1b', marginBottom: '0.3rem' }}>
                Tap a suggested Bengaluru location to use:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {SUGGESTED_BENGALURU_ZONES.slice(0, 10).map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => {
                      if (!fromLocation.trim()) setFromLocation(zone);
                      else setToLocation(zone);
                      if (onClearRouteError) onClearRouteError();
                    }}
                    style={{
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      border: '1px solid #fca5a5',
                      background: '#ffffff',
                      color: '#b91c1c',
                      cursor: 'pointer',
                    }}
                  >
                    + {zone}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Find Safe Route Button */}
        <button
          type="submit"
          className="btn-primary-blue"
          style={{ width: '100%', marginTop: '0.35rem', padding: '0.65rem' }}
          disabled={loading}
        >
          {loading ? (
            <span>Computing Road Geometry...</span>
          ) : (
            <>
              <Search size={16} />
              <span>Find Safe Route</span>
            </>
          )}
        </button>
      </form>

      {/* Resolved Location Details Confirmation Section */}
      {routeComparison && (
        <div
          style={{
            borderTop: '1px solid var(--border-card)',
            paddingTop: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Info size={12} color="var(--primary-blue)" />
              <span>Resolved Location Confirmation</span>
            </span>
            <button
              type="button"
              onClick={() => setShowLocationDetails(!showLocationDetails)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.7rem',
                color: 'var(--primary-blue)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {showLocationDetails ? 'Hide details' : 'Show details'}
            </button>
          </div>

          {showLocationDetails && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.65rem',
                fontSize: '0.72rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {/* Origin Confirmation */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb', fontWeight: 800 }}>
                  <span>● Origin (Point A):</span>
                  <span>{routeComparison.origin.resolvedName || routeComparison.origin.label || fromLocation}</span>
                </div>
                {routeComparison.origin.address && (
                  <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '1px' }}>
                    📍 {routeComparison.origin.address}
                  </div>
                )}
                <div style={{ color: '#0369a1', fontSize: '0.68rem', fontWeight: 600, marginTop: '1px' }}>
                  GPS: {routeComparison.origin.latitude.toFixed(5)}° N, {routeComparison.origin.longitude.toFixed(5)}° E
                </div>
              </div>

              {/* Destination Confirmation */}
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#dc2626', fontWeight: 800 }}>
                  <span>● Destination (Point B):</span>
                  <span>{routeComparison.destination.resolvedName || routeComparison.destination.label || toLocation}</span>
                </div>
                {routeComparison.destination.address && (
                  <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '1px' }}>
                    📍 {routeComparison.destination.address}
                  </div>
                )}
                <div style={{ color: '#b91c1c', fontSize: '0.68rem', fontWeight: 600, marginTop: '1px' }}>
                  GPS: {routeComparison.destination.latitude.toFixed(5)}° N, {routeComparison.destination.longitude.toFixed(5)}° E
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5 Required Test Routes Section */}
      <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={13} color="var(--primary-blue)" />
            <span>5 Verified Bengaluru Test Corridors:</span>
          </div>
          {demoModeActive && (
            <span style={{ fontSize: '0.64rem', color: '#059669', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '1px 5px', borderRadius: '4px' }}>
              Recorded Data Active
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {/* 1. Jalahalli Cross -> Majestic */}
          <button
            type="button"
            onClick={() => handleSelectDemoCorridor('jalahalli-majestic', 'Jalahalli Cross', 'Majestic')}
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              textAlign: 'left',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>1. Jalahalli Cross → Majestic</span>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>West/Central (11.8 km)</span>
          </button>

          {/* 2. Jakkur -> Yelahanka */}
          <button
            type="button"
            onClick={() => handleSelectDemoCorridor('jakkur-yelahanka', 'Jakkur', 'Yelahanka')}
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              textAlign: 'left',
              borderRadius: '6px',
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
              cursor: 'pointer',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>2. Jakkur → Yelahanka</span>
            <span style={{ fontSize: '0.66rem', color: '#1e40af' }}>North (3.0 km)</span>
          </button>

          {/* 3. Whitefield -> Electronic City */}
          <button
            type="button"
            onClick={() => handleSelectDemoCorridor('whitefield-ecity', 'Whitefield', 'Electronic City')}
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              textAlign: 'left',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>3. Whitefield → Electronic City</span>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>East/South (24.7 km)</span>
          </button>

          {/* 4. Kengeri -> Hebbal */}
          <button
            type="button"
            onClick={() => handleSelectDemoCorridor('kengeri-hebbal', 'Kengeri', 'Hebbal')}
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              textAlign: 'left',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>4. Kengeri → Hebbal</span>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>West/North (24.9 km)</span>
          </button>

          {/* 5. BTM Layout -> Yeshwanthpur */}
          <button
            type="button"
            onClick={() => handleSelectDemoCorridor('btm-yeshwanthpur', 'BTM Layout', 'Yeshwanthpur')}
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              textAlign: 'left',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>5. BTM Layout → Yeshwanthpur</span>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>South/Northwest (20.9 km)</span>
          </button>
        </div>
      </div>

      {/* Route Comparison Section */}
      <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '0.75rem' }}>
        <h3
          style={{
            fontSize: '0.88rem',
            fontWeight: 800,
            color: 'var(--text-dark)',
            marginBottom: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            <span>Route Comparison</span>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary-blue)' }}>
              {routeComparison?.corridorName || `${fromLocation} → ${toLocation}`}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: '#e2e8f0',
              padding: '0.1rem 0.45rem',
              borderRadius: '4px',
            }}
          >
            {demoModeActive ? 'RECORDED OSRM' : 'LIVE OSRM'}
          </span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Standard Route Card (Red/Direct Path) */}
          <div
            style={{
              backgroundColor: 'var(--route-standard-bg)',
              border: '1px solid var(--route-standard-border)',
              borderRadius: '10px',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.4rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Car size={16} color="var(--route-standard-red)" />
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: 'var(--route-standard-red)',
                  }}
                >
                  Standard Route (Direct Path)
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--text-dark)',
                marginBottom: '0.45rem',
              }}
            >
              <span>{routeComparison ? `${routeComparison.directRoute.distanceKm} km` : '12.4 km'}</span>
              <span>•</span>
              <span>{routeComparison ? `${routeComparison.directRoute.etaMinutes} mins` : '32 mins'}</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.4rem',
                fontSize: '0.75rem',
                color: '#b91c1c',
                lineHeight: 1.35,
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                {routeComparison?.directRoute?.hazardWarning ||
                  (routeComparison?.directRoute?.isWaterlogged
                    ? 'Caution: Direct route passes near active waterlogged locations.'
                    : 'Direct road is clear of critical waterlogging within 300m.')}
              </span>
            </div>
          </div>

          {/* JalMarg Alternative Route Card (Green Styling) */}
          <div
            style={{
              backgroundColor: 'var(--route-safe-bg)',
              border: '1px solid var(--route-safe-border)',
              borderRadius: '10px',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.4rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Car size={16} color="var(--route-safe-green)" />
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: 'var(--route-safe-green)',
                  }}
                >
                  JalMarg Alternative Route
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                }}
              >
                RECOMMENDED
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--text-dark)',
                marginBottom: '0.45rem',
              }}
            >
              <span>{routeComparison ? `${routeComparison.safeDetourRoute.distanceKm} km` : '14.1 km'}</span>
              <span>•</span>
              <span>{routeComparison ? `${routeComparison.safeDetourRoute.etaMinutes} mins` : '38 mins'}</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.4rem',
                fontSize: '0.75rem',
                color: '#15803d',
                lineHeight: 1.35,
              }}
            >
              <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                {routeComparison?.safeDetourRoute?.protectionTag ||
                  'No alternative route reduces flood risk along this corridor.'}
              </span>
            </div>
          </div>
        </div>

        {/* Data Attributions */}
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            fontSize: '0.68rem',
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div style={{ fontWeight: 700, color: '#334155' }}>
            Data Sources &amp; Flood Proximity Buffer (300m):
          </div>
          <div>• <strong>Historical:</strong> BBMP Monsoon Vulnerable Spots (OpenCity.in)</div>
          <div>• <strong>Community:</strong> Citizen Waterlogging Reports (JalMarg DB)</div>
          <div>• <strong>Live Weather:</strong> Open-Meteo Real-time Forecast API</div>
        </div>
      </div>
    </div>
  );
};
