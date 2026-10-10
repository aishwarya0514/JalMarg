import React, { useState, useEffect, useCallback } from 'react';
import type { FloodHazard, RouteComparison, ReportHazardInput } from './types';
import {
  checkBackendHealth,
  fetchHazards,
  reportHazard,
  calculateRoute,
} from './services/api';
import type { ApiStatus } from './services/api';
import { Navbar } from './components/Navbar';
import { FloodMap } from './components/FloodMap';
import { RouteComparisonCard, PRESET_ROUTES } from './components/RouteComparisonCard';
import { HazardList } from './components/HazardList';
import { ReportHazardModal } from './components/ReportHazardModal';
import {
  AlertTriangle,
  CheckCircle,
  Layers,
} from 'lucide-react';

export const App: React.FC = () => {
  const [hazards, setHazards] = useState<FloodHazard[]>([]);
  const [routeComparison, setRouteComparison] = useState<RouteComparison | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<FloodHazard | null>(null);
  const [activePreset, setActivePreset] = useState<number>(0);

  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isPinningLocation, setIsPinningLocation] = useState<boolean>(false);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    connected: false,
    mode: 'local_fallback',
    url: 'http://localhost:5000',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [status, hazardList] = await Promise.all([
        checkBackendHealth(),
        fetchHazards(),
      ]);
      setApiStatus(status);
      setHazards(hazardList);

      // Load initial route comparison for active preset
      const preset = PRESET_ROUTES[activePreset];
      const routeData = await calculateRoute(preset.origin, preset.destination);
      setRouteComparison(routeData);
    } catch (err) {
      console.error('Error loading JalMarg data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activePreset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleSelectPreset = async (presetIdx: number) => {
    setActivePreset(presetIdx);
    const preset = PRESET_ROUTES[presetIdx];
    try {
      const routeData = await calculateRoute(preset.origin, preset.destination);
      setRouteComparison(routeData);
      showToast(`Recalculated detour corridor: ${preset.name}`);
    } catch (err) {
      console.error('Error calculating route preset:', err);
    }
  };

  const handleReportSubmit = async (input: ReportHazardInput) => {
    const created = await reportHazard(input);
    showToast(`Hazard reported! Verified by AWS Rekognition (${created.verificationConfidence}%)`);
    await loadData();
    setSelectedHazard(created);
    setPinnedCoords(null);
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (isPinningLocation) {
      setPinnedCoords({ lat, lon });
      setIsPinningLocation(false);
      setIsReportModalOpen(true);
      showToast(`Pinned coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }
  };

  const criticalCount = hazards.filter((h) => h.severity === 'CRITICAL').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        apiStatus={apiStatus}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        totalHazardsCount={hazards.length}
        criticalCount={criticalCount}
      />

      <main className="app-container" style={{ flex: 1 }}>
        {/* Urgent Monsoon Warning Ribbon */}
        {criticalCount > 0 && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.22) 0%, rgba(15, 23, 42, 0.7) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fca5a5' }}>
                  MONSOON FLOOD HAZARD DETECTED:
                </span>{' '}
                <span style={{ fontSize: '0.85rem', color: '#ffffff' }}>
                  {criticalCount} underpass node(s) submerged (&gt;3.5ft). JalMarg active detour routing engaged.
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const firstCrit = hazards.find((h) => h.severity === 'CRITICAL');
                if (firstCrit) setSelectedHazard(firstCrit);
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: '#fecaca',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Inspect Blocked Underpass
            </button>
          </div>
        )}

        {/* Dual Route Comparison Card */}
        <RouteComparisonCard
          routeComparison={routeComparison}
          onSelectPreset={handleSelectPreset}
          activePreset={activePreset}
          loading={loading}
        />

        {/* Interactive Flood Map Section */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                Hyperlocal Flood Hazard Map (Bengaluru Monsoon Grid)
              </h2>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click any hazard pin for depth telemetry &amp; AWS CV evidence
            </span>
          </div>

          <FloodMap
            hazards={hazards}
            routeComparison={routeComparison}
            selectedHazard={selectedHazard}
            onSelectHazard={setSelectedHazard}
            onMapClick={handleMapClick}
            isPinningLocation={isPinningLocation}
          />
        </div>

        {/* Active Hazards List */}
        <HazardList
          hazards={hazards}
          selectedHazard={selectedHazard}
          onSelectHazard={setSelectedHazard}
        />
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(7, 13, 25, 0.95)',
        padding: '1.5rem 2rem',
        marginTop: '3.5rem',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <strong>JalMarg</strong> — WeMakeDevs x AWS Bharat Builds Tour (Environmental Hacks).
            {' '}Serverless stack: React (Vite) + Leaflet + AWS Lambda (Python 3.11) + DynamoDB (TTL) + Amazon Rekognition + S3 + API Gateway.
          </div>
          <div>
            Offline demo fallback &amp; AWS CloudFormation / SAM deployment ready.
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid var(--accent-cyan)',
            boxShadow: '0 8px 30px rgba(6, 182, 212, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#f8fafc',
            fontSize: '0.88rem',
            zIndex: 2000,
          }}
        >
          <CheckCircle size={18} color="var(--accent-cyan)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Report Modal */}
      <ReportHazardModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        pinnedCoords={pinnedCoords}
        onStartPinning={() => {
          setIsPinningLocation(true);
          showToast('Click anywhere on the map to pin the hazard spot!');
        }}
      />
    </div>
  );
};
export default App;
