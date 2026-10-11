import React, { useState } from 'react';
import {
  PhoneCall,
  X,
  Phone,
  Copy,
  Check,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

interface EmergencyHelpPanelProps {
  onClose: () => void;
}

interface EmergencyContact {
  id: string;
  number: string;
  telUri: string;
  name: string;
  purpose: string;
  prominent?: boolean;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: '112',
    number: '112',
    telUri: 'tel:112',
    name: 'National Emergency Response Support System',
    purpose: 'Police, fire, medical and all emergencies',
    prominent: true,
  },
  {
    id: 'ndma',
    number: '011-1078',
    telUri: 'tel:+9111078',
    name: 'National Disaster Management Authority (NDMA)',
    purpose: 'Disaster-related information & advisory',
  },
  {
    id: 'ndrf',
    number: '+91-9711077372',
    telUri: 'tel:+919711077372',
    name: 'National Disaster Response Force (NDRF)',
    purpose: 'Disaster rescue and response information',
  },
  {
    id: 'nerc',
    number: '011-1070',
    telUri: 'tel:+9111070',
    name: 'Government of India — National Emergency Response Center',
    purpose: 'Disaster management control room',
  },
];

export const EmergencyHelpPanel: React.FC<EmergencyHelpPanelProps> = ({ onClose }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Fallback
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div
      className="jalmarg-card"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
      }}
    >
      {/* Red Header matching reference design */}
      <div
        style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          color: '#ffffff',
          padding: '0.9rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PhoneCall size={17} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
            Emergency Help
          </h2>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          title="Collapse Emergency Help panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* Panel Body */}
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          overflowY: 'auto',
        }}
      >
        {/* Intro text */}
        <p style={{ fontSize: '0.76rem', color: 'var(--text-body)', lineHeight: 1.35 }}>
          For immediate assistance during floods or any emergency, contact the following:
        </p>

        {/* Contact Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {EMERGENCY_CONTACTS.map((c) => {
            const isCopied = copiedId === c.id;

            return (
              <div
                key={c.id}
                style={{
                  border: c.prominent ? '2px solid #ef4444' : '1px solid var(--border-card)',
                  backgroundColor: c.prominent ? '#fff5f5' : '#ffffff',
                  borderRadius: '10px',
                  padding: '0.65rem 0.75rem',
                  boxShadow: c.prominent ? '0 2px 8px rgba(239, 68, 68, 0.12)' : 'none',
                }}
              >
                {/* Number & Name */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: c.prominent ? '#fee2e2' : '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: c.prominent ? '#dc2626' : '#475569',
                      }}
                    >
                      <Phone size={13} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: c.prominent ? '1.05rem' : '0.92rem',
                          fontWeight: 800,
                          color: c.prominent ? '#dc2626' : 'var(--text-dark)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {c.number}
                      </div>
                    </div>
                  </div>

                  {c.prominent && (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}
                    >
                      PRIMARY
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--text-body)',
                    marginTop: '0.25rem',
                  }}
                >
                  {c.name}
                </div>

                <div
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.1rem',
                    lineHeight: 1.25,
                  }}
                >
                  {c.purpose}
                </div>

                {/* Call and Copy Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <a
                    href={c.telUri}
                    style={{
                      flex: 1,
                      textDecoration: 'none',
                      backgroundColor: c.prominent ? '#dc2626' : '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <Phone size={11} />
                    <span>Call</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopy(c.id, c.number)}
                    style={{
                      flex: 1,
                      backgroundColor: isCopied ? '#dcfce7' : '#f8fafc',
                      color: isCopied ? '#166534' : 'var(--text-body)',
                      border: '1px solid var(--border-card)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Copy number to clipboard"
                  >
                    {isCopied ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                    <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flood Safety Tips Card */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-card)',
            borderRadius: '10px',
            padding: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
            <ShieldAlert size={14} color="#f97316" />
            <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-dark)' }}>
              Flood Safety Tips
            </h3>
          </div>
          <ul
            style={{
              paddingLeft: '1rem',
              fontSize: '0.69rem',
              color: 'var(--text-body)',
              lineHeight: 1.45,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}
          >
            <li>Avoid walking or driving through floodwater.</li>
            <li>Stay away from electrical poles and live wires.</li>
            <li>Move to higher ground if water is rising.</li>
            <li>Follow evacuation instructions from local authorities.</li>
            <li>Help children, older adults and people who need assistance.</li>
            <li>Follow official government alerts.</li>
          </ul>
        </div>

        {/* Official Website Link Card */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '0.65rem 0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e40af' }}>
                Official 112 India Portal
              </div>
              <div style={{ fontSize: '0.67rem', color: '#3b82f6' }}>
                Emergency response guidelines
              </div>
            </div>
            <a
              href="https://www.112.gov.in/about"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>Visit</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <p style={{ fontSize: '0.65rem', color: 'var(--text-light)', textAlign: 'center', lineHeight: 1.25 }}>
          Clicking buttons launches your local phone dialer. It does not automatically dispatch rescue or broadcast GPS.
        </p>
      </div>
    </div>
  );
};
