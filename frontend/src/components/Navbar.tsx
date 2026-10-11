import React from 'react';
import {
  Droplets,
  CloudRain,
  PhoneCall,
  MapPin,
  FileText,
  Info,
  Home,
} from 'lucide-react';
import type { ApiStatus } from '../services/api';
import type { LiveWeatherData } from '../types';

interface NavbarProps {
  apiStatus: ApiStatus;
  onNavigateTab: (tab: 'home' | 'map' | 'report' | 'emergency' | 'about') => void;
  activeTab: string;
  isEmergencyPanelOpen: boolean;
  onToggleEmergencyPanel: () => void;
  onOpenReportModal?: () => void;
  totalHazardsCount: number;
  liveWeather?: LiveWeatherData | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  apiStatus,
  onNavigateTab,
  activeTab,
  isEmergencyPanelOpen,
  onToggleEmergencyPanel,
  totalHazardsCount,
  liveWeather,
}) => {
  return (
    <header
      style={{
        background: 'linear-gradient(90deg, #0a192f 0%, #112240 50%, #1e3a8a 100%)',
        color: '#ffffff',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(10, 25, 47, 0.35)',
      }}
    >
      <div
        style={{
          maxWidth: 1600,
          margin: '0 auto',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Left: Blue Water-Drop Logo & Brand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
          onClick={() => onNavigateTab('home')}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.5)',
            }}
          >
            <Droplets size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  lineHeight: 1.1,
                }}
              >
                JalMarg
              </h1>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                BENGALURU
              </span>
            </div>
            <p
              style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 500,
                marginTop: '1px',
              }}
            >
              Flood-Aware Urban Navigation
            </p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => onNavigateTab('home')}
            style={{
              background: activeTab === 'home' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background 0.15s ease',
            }}
          >
            <Home size={16} />
            <span>Home</span>
          </button>

          <button
            onClick={() => onNavigateTab('map')}
            style={{
              background: activeTab === 'map' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background 0.15s ease',
            }}
          >
            <MapPin size={16} />
            <span>Live Map</span>
          </button>

          <button
            onClick={() => onNavigateTab('report')}
            style={{
              background: activeTab === 'report' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background 0.15s ease',
            }}
          >
            <FileText size={16} />
            <span>Report</span>
          </button>

          {/* Emergency Help - Visually Prominent Red Button */}
          <button
            onClick={onToggleEmergencyPanel}
            style={{
              background: isEmergencyPanelOpen ? '#b91c1c' : '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.45)',
              transition: 'all 0.15s ease',
            }}
            title="Open 24/7 National & State Emergency Helpline Panel"
          >
            <PhoneCall size={16} />
            <span>Emergency Help</span>
          </button>

          <button
            onClick={() => onNavigateTab('about')}
            style={{
              background: activeTab === 'about' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background 0.15s ease',
            }}
          >
            <Info size={16} />
            <span>About</span>
          </button>
        </nav>

        {/* Right: Weather Card (Bengaluru, Light Rain, 26°C) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '0.4rem 0.85rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <CloudRain size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                  Bengaluru
                </span>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>•</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8' }}>
                  {liveWeather ? `${liveWeather.temperatureC}°C` : '26°C'}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.1, marginTop: '2px' }}>
                {liveWeather
                  ? `${liveWeather.conditionText} (${liveWeather.relativeHumidity}%) • ${totalHazardsCount} Reports`
                  : `Light Rain • ${totalHazardsCount} Reports`}
              </p>
            </div>
          </div>

          {/* Backend Status Dot */}
          <div
            title={`Backend Status: ${apiStatus.connected ? 'AWS Lambda / API Gateway Connected' : 'Local Storage Demo Mode'}`}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: apiStatus.connected ? '#10b981' : '#f59e0b',
              boxShadow: `0 0 8px ${apiStatus.connected ? '#10b981' : '#f59e0b'}`,
            }}
          />
        </div>
      </div>
    </header>
  );
};
