import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  FloodHazard,
  RouteComparison,
  ReportHazardInput,
  HistoricalFloodPoint,
  LiveWeatherData,
} from './types';
import {
  checkBackendHealth,
  fetchHazards,
  reportHazard,
  calculateRoute,
  resolveLocation,
  deleteHazardPhoto,
  deleteHazardReport,
  fetchOpenCityHistoricalPoints,
  getRecordedDemoRoute,
  fetchLiveWeather,
} from './services/api';
import type { ApiStatus } from './services/api';

import { Navbar } from './components/Navbar';
import { PlanRoutePanel } from './components/PlanRoutePanel';
import { CenterMapPanel } from './components/CenterMapPanel';
import { ReportWaterloggingPanel } from './components/ReportWaterloggingPanel';
import { EmergencyHelpPanel } from './components/EmergencyHelpPanel';
import { RecentReportsSection } from './components/RecentReportsSection';
import { ViewAllReportsModal } from './components/ViewAllReportsModal';
import { AboutModal } from './components/AboutModal';
import { PhoneCall, AlertTriangle, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [hazards, setHazards] = useState<FloodHazard[]>([]);
  const [historicalPoints, setHistoricalPoints] = useState<HistoricalFloodPoint[]>([]);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherData | null>(null);
  const [routeComparison, setRouteComparison] = useState<RouteComparison | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<FloodHazard | null>(null);

  const [isEmergencyPanelOpen, setIsEmergencyPanelOpen] = useState<boolean>(true);
  const [isViewAllOpen, setIsViewAllOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'report' | 'emergency' | 'about'>('home');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'MEDIUM' | 'LOW'>('ALL');

  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const requestSeqRef = useRef<number>(0);

  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    connected: false,
    mode: 'local_fallback',
    url: 'http://localhost:5000',
  });

  const mapRef = useRef<HTMLDivElement | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial Data Load
  const loadData = useCallback(async () => {
    try {
      const [status, hazardList, weatherData] = await Promise.all([
        checkBackendHealth(),
        fetchHazards(),
        fetchLiveWeather(),
      ]);
      setApiStatus(status);
      setHazards(hazardList);
      if (weatherData) setLiveWeather(weatherData);

      // Load 257 OpenCity BBMP historical flood spots
      const hPoints = fetchOpenCityHistoricalPoints();
      setHistoricalPoints(hPoints);

      // Select default reference incident (Silk Board Underpass)
      const silkBoard = hazardList.find((h) => h.id === 'haz-blr-001') || hazardList[0];
      if (silkBoard) setSelectedHazard(silkBoard);

      // Default route calculation (Silk Board to Marathahalli)
      const originRes = await resolveLocation('Silk Board, Bengaluru');
      const destRes = await resolveLocation('Marathahalli, Bengaluru');
      if (originRes.success && destRes.success && originRes.data && destRes.data) {
        const initialRoute = await calculateRoute(originRes.data, destRes.data);
        setRouteComparison(initialRoute);
      }
    } catch (err) {
      console.error('Error loading JalMarg data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Route Calculation from Left Panel with strict geocoding resolution
  const handleCalculateRoute = async (from: string, to: string, forceDemoCorridorId?: string) => {
    const seq = ++requestSeqRef.current;
    setRouteError(null);

    // If explicit demo corridor requested
    if (forceDemoCorridorId) {
      const demo = getRecordedDemoRoute(forceDemoCorridorId);
      if (demo) {
        setRouteComparison(demo);
        showToast(`Loaded verified recorded OSRM corridor: ${demo.corridorName}`);
        return;
      }
    }

    const originRes = await resolveLocation(from);
    if (!originRes.success || !originRes.data) {
      const errMsg =
        originRes.error ||
        `Origin "${from}" cannot be resolved. Please enter a valid Bengaluru location or GPS coordinates.`;
      setRouteError(errMsg);
      setRouteComparison(null);
      showToast(errMsg);
      return;
    }

    const destRes = await resolveLocation(to);
    if (!destRes.success || !destRes.data) {
      const errMsg =
        destRes.error ||
        `Destination "${to}" cannot be resolved. Please enter a valid Bengaluru location or GPS coordinates.`;
      setRouteError(errMsg);
      setRouteComparison(null);
      showToast(errMsg);
      return;
    }

    setLoadingRoute(true);
    try {
      const res = await calculateRoute(originRes.data, destRes.data);
      if (seq !== requestSeqRef.current) return;
      setRouteComparison(res);
      showToast(
        res.hazardsDetected > 0
          ? `Route computed: avoiding ${res.hazardsDetected} waterlogging spot(s) along ${originRes.data.resolvedName} → ${destRes.data.resolvedName}`
          : `Clear route computed: ${originRes.data.resolvedName} → ${destRes.data.resolvedName}`
      );
    } catch (err: any) {
      if (seq !== requestSeqRef.current) return;
      console.error('Failed to calculate safe route:', err);
      const errMsg = err?.message || 'Failed to calculate road route between selected locations.';
      setRouteError(errMsg);
      setRouteComparison(null);
      showToast(errMsg);
    } finally {
      if (seq === requestSeqRef.current) {
        setLoadingRoute(false);
      }
    }
  };

  const handleLoadRecordedDemoRoute = (corridorId: string) => {
    const demo = getRecordedDemoRoute(corridorId);
    if (demo) {
      setRouteError(null);
      setRouteComparison(demo);
      showToast(`Loaded verified recorded OSRM corridor: ${demo.corridorName}`);
    }
  };

  // Handle Photo Deletion after submission
  const handleDeleteHazardPhoto = async (hazardId: string) => {
    try {
      await deleteHazardPhoto(hazardId);
      setHazards((prev) =>
        prev.map((h) => (h.id === hazardId ? { ...h, imageUrl: '' } : h))
      );
      if (selectedHazard?.id === hazardId) {
        setSelectedHazard((prev) => (prev ? { ...prev, imageUrl: '' } : null));
      }
      showToast('Photo removed from report. Report details and map marker preserved.');
    } catch (err) {
      console.error('Error deleting photo:', err);
      showToast('Error removing photo. Please try again.');
    }
  };

  // Handle Report Deletion
  const handleDeleteHazardReport = async (hazardId: string) => {
    try {
      await deleteHazardReport(hazardId);
      setHazards((prev) => prev.filter((h) => h.id !== hazardId));
      if (selectedHazard?.id === hazardId) {
        setSelectedHazard(null);
      }
      showToast('Hazard report removed.');
    } catch (err) {
      console.error('Error deleting report:', err);
      showToast('Error removing report.');
    }
  };

  // Handle Waterlogging Report Submission
  const handleSubmitReport = async (input: ReportHazardInput) => {
    const created = await reportHazard(input);
    showToast(`Hazard report saved successfully! Added to live map and recent reports.`);
    const updatedHazards = await fetchHazards();
    setHazards(updatedHazards);
    setSelectedHazard(created);
    setPinnedCoords(null);
  };

  // Handle Map Pinning
  const handleMapClick = (lat: number, lon: number) => {
    setPinnedCoords({ lat, lon });
    showToast(`Map location selected: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  };

  // Navigation tab routing
  const handleNavigateTab = (tab: 'home' | 'map' | 'report' | 'emergency' | 'about') => {
    setActiveTab(tab);
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'map') {
      mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tab === 'report') {
      reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tab === 'emergency') {
      setIsEmergencyPanelOpen(true);
    } else if (tab === 'about') {
      setIsAboutOpen(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }}>
      {/* Top Navigation Header matching reference */}
      <Navbar
        apiStatus={apiStatus}
        onNavigateTab={handleNavigateTab}
        activeTab={activeTab}
        isEmergencyPanelOpen={isEmergencyPanelOpen}
        onToggleEmergencyPanel={() => setIsEmergencyPanelOpen(!isEmergencyPanelOpen)}
        totalHazardsCount={hazards.length}
        liveWeather={liveWeather}
      />

      {/* Main Dashboard Container (Desktop ~1536px: 4 Columns) */}
      <main
        style={{
          flex: 1,
          maxWidth: 1600,
          margin: '0 auto',
          width: '100%',
          padding: '1.25rem 1.5rem 3rem 1.5rem',
        }}
      >
        {/* Urgent Monsoon Flooding Banner */}
        <div
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            padding: '0.65rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}
            >
              <AlertTriangle size={16} />
            </div>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#9f1239' }}>
                BENGALURU MONSOON ADVISORY:
              </span>{' '}
              <span style={{ fontSize: '0.82rem', color: '#881337' }}>
                Waterlogging reported near Silk Board Underpass &amp; Bellandur. Standard route is blocked; JalMarg Alternative Route engaged.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#047857',
                backgroundColor: '#d1fae5',
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
              }}
            >
              ✓ Detour Active
            </span>
          </div>
        </div>

        {/* 4-Column Main Dashboard Grid */}
        <div
          className="dashboard-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: isEmergencyPanelOpen
              ? '330px minmax(420px, 1fr) 320px 300px'
              : '340px minmax(520px, 1fr) 330px',
            gap: '1.25rem',
            alignItems: 'stretch',
          }}
        >
          {/* Column 1: Left Panel — Plan Your Route */}
          <div>
            <PlanRoutePanel
              onCalculateRoute={handleCalculateRoute}
              routeComparison={routeComparison}
              loading={loadingRoute}
              routeError={routeError}
              onClearRouteError={() => setRouteError(null)}
              onLoadRecordedDemoRoute={handleLoadRecordedDemoRoute}
            />
          </div>

          {/* Column 2: Center Panel — Interactive Bengaluru Map */}
          <div ref={mapRef} style={{ display: 'flex', flexDirection: 'column' }}>
            <CenterMapPanel
              hazards={hazards}
              historicalPoints={historicalPoints}
              routeComparison={routeComparison}
              selectedHazard={selectedHazard}
              onSelectHazard={setSelectedHazard}
              onMapClick={handleMapClick}
              isEmergencyPanelOpen={isEmergencyPanelOpen}
              severityFilter={severityFilter}
              onSelectSeverityFilter={setSeverityFilter}
              onDeletePhoto={handleDeleteHazardPhoto}
              onDeleteReport={handleDeleteHazardReport}
            />
          </div>

          {/* Column 3: Right-Middle Panel — Report Waterlogging */}
          <div ref={reportRef}>
            <ReportWaterloggingPanel
              onSubmitReport={handleSubmitReport}
              pinnedCoords={pinnedCoords}
            />
          </div>

          {/* Column 4: Far-Right Panel — Emergency Help (Visible by default) */}
          {isEmergencyPanelOpen && (
            <div>
              <EmergencyHelpPanel onClose={() => setIsEmergencyPanelOpen(false)} />
            </div>
          )}
        </div>

        {/* Re-Open Emergency Button if collapsed */}
        {!isEmergencyPanelOpen && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button
              onClick={() => setIsEmergencyPanelOpen(true)}
              className="btn-emergency-red"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            >
              <PhoneCall size={14} />
              <span>Show Emergency Help Panel</span>
            </button>
          </div>
        )}

        {/* Bottom Panel — Recent Flood Reports */}
        <RecentReportsSection
          hazards={hazards}
          onSelectHazard={(h) => {
            setSelectedHazard(h);
            mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          onOpenViewAll={() => setIsViewAllOpen(true)}
          selectedSeverity={severityFilter}
          onSelectSeverity={setSeverityFilter}
          onDeletePhoto={handleDeleteHazardPhoto}
          onDeleteReport={handleDeleteHazardReport}
        />
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-card)',
          backgroundColor: '#ffffff',
          padding: '1.25rem 2rem',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <strong>JalMarg</strong> — Flood-Aware Urban Navigation.
            Demonstration mode for urban monsoon flood response in Bengaluru.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--text-light)' }}>
              Emergency Services: Call 112
            </span>
            <button
              onClick={() => setIsAboutOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-blue)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.78rem',
              }}
            >
              About &amp; Disclaimer
            </button>
          </div>
        </div>
      </footer>

      {/* View All Reports Modal */}
      <ViewAllReportsModal
        isOpen={isViewAllOpen}
        onClose={() => setIsViewAllOpen(false)}
        hazards={hazards}
        onSelectHazard={(h) => {
          setSelectedHazard(h);
          mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onDeletePhoto={handleDeleteHazardPhoto}
        onDeleteReport={handleDeleteHazardReport}
      />

      {/* About Project Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
            zIndex: 10000,
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ShieldCheck size={16} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
