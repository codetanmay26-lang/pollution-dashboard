import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OmniQRGenerator.css";

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const OmniQRGenerator = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const qrRef = useRef();
  const liveFeedRef = useRef(null);

  useEffect(() => {
    console.log('OmniQRGenerator mounted, sessionId:', sessionId);
    // Auto-create session on mount
    if (!sessionId && !loading) {
      createJudgeSession();
    }
  }, []);

  const createJudgeSession = async () => {
    console.log('Creating judge session...');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/judge-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wardIndex: 0 }),
      });

      console.log('Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Session created:', data);
        setSessionId(data.sessionId);
        setSessionState(data);
      } else {
        const errorData = await res.text();
        const errorMsg = `Server error (${res.status}): ${errorData || res.statusText}`;
        console.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = `Network error: ${err.message}`;
      console.error(errorMsg, err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    const pollSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/judge-sessions/${sessionId}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          setSessionState(data);
          setLastSyncAt(new Date());
        }
      } catch (err) {
        console.error('Session polling error:', err);
      }
    };

    pollSession();
    const intervalId = setInterval(pollSession, 500);

    return () => clearInterval(intervalId);
  }, [sessionId]);

  const downloadQR = () => {
    if (sessionId && qrRef.current) {
      const link = document.createElement("a");
      link.href = qrRef.current.src;
      link.download = `crisis-session-${sessionId}.png`;
      link.click();
    }
  };

  const copyQRUrl = () => {
    const url = `${window.location.origin}/judge/${sessionId}`;
    navigator.clipboard.writeText(url);
    alert("Session link copied to clipboard");
  };

  if (sessionId) {
    const qrImageUrl = `${API_BASE}/api/judge-sessions/${sessionId}/qr`;
    const approvedAction = sessionState?.approvedAction || sessionState?.sourceEstimate?.approvedAction || null;
    const syncLabel = lastSyncAt ? lastSyncAt.toLocaleTimeString() : 'Waiting';

    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1f2e',
        color: '#fff',
        padding: '20px',
        fontFamily: "'Manrope', sans-serif"
      }}>
        <div style={{maxWidth: '1200px', margin: '0 auto'}}>
          <div style={{marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(81, 207, 102, 0.2)'}}>
            <h1 style={{fontSize: '28px', color: '#51cf66', margin: '0 0 8px 0'}}>Pollution Interaction Console</h1>
            <p style={{color: '#aaa', margin: '0'}}>QR Session {sessionId.substring(0, 8)}...</p>
          </div>

          <div style={{
            marginBottom: '20px',
            background: approvedAction ? 'rgba(59, 130, 246, 0.10)' : 'rgba(245, 158, 11, 0.08)',
            border: approvedAction ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            <div style={{fontSize: '13px', color: approvedAction ? '#bfdbfe' : '#fcd34d'}}>
              <strong>{approvedAction ? 'Action Implemented' : 'Awaiting Approval'}</strong>
              {' '}• Session {sessionId.substring(0, 8)} • Last Sync: {syncLabel}
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${API_BASE}/api/judge-sessions/${sessionId}?t=${Date.now()}`, { cache: 'no-store' });
                  if (res.ok) {
                    const data = await res.json();
                    setSessionState(data);
                    setLastSyncAt(new Date());
                  }
                } catch (err) {
                  console.error('Manual refresh error:', err);
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Refresh Status
            </button>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px', marginBottom: '30px'}}>
            <div>
              <h2 style={{color: '#fff', marginTop: 0}}>Mobile Intervention QR</h2>
              <p style={{color: '#aaa'}}>Scan with mobile device to access source analysis flow</p>
              <div style={{background: '#fff', padding: '16px', borderRadius: '8px', display: 'inline-block'}}>
                <img
                  ref={qrRef}
                  src={qrImageUrl}
                  alt="Crisis Intervention QR"
                  style={{width: '300px', height: '300px', display: 'block'}}
                  onError={(e) => console.error('QR load error:', e)}
                />
              </div>
              <p style={{color: '#888', fontSize: '12px', marginTop: '12px'}}>Opens interactive ward selection & action approval interface</p>
            </div>

            <div>
              <div style={{background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(81, 207, 102, 0.2)', borderRadius: '8px', padding: '20px'}}>
                <h3 style={{fontSize: '14px', color: '#51cf66', margin: '0 0 16px 0', textTransform: 'uppercase'}}>Session Info</h3>
                <div style={{marginBottom: '16px'}}>
                  <div style={{fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px'}}>ID</div>
                  <code style={{fontSize: '12px', color: '#a0f77d', fontFamily: 'monospace', wordBreak: 'break-all'}}>{sessionId}</code>
                </div>
                <div>
                  <div style={{fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px'}}>Status</div>
                  <span style={{display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(81, 207, 102, 0.2)', border: '1px solid rgba(81, 207, 102, 0.4)', borderRadius: '4px', fontSize: '12px', color: '#51cf66'}}>
                    <span style={{width: '6px', height: '6px', background: '#51cf66', borderRadius: '50%'}}></span>
                    {approvedAction ? 'Action Implemented' : 'Waiting for Mobile Action'}
                  </span>
                </div>
                <div style={{marginTop: '14px'}}>
                  <div style={{fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px'}}>Current Phase</div>
                  <span style={{fontSize: '12px', color: '#cbd5e1'}}>{(sessionState?.currentPhase || 'ward_select').replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div ref={liveFeedRef} style={{background: approvedAction ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.03)', border: approvedAction ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '20px', marginTop: '16px'}}>
                <h3 style={{fontSize: '14px', color: approvedAction ? '#60a5fa' : '#94a3b8', margin: '0 0 14px 0', textTransform: 'uppercase'}}>
                  Pollution Action Console
                </h3>

                {approvedAction ? (
                  <>
                    <p style={{margin: '0 0 10px 0', color: '#dbeafe', fontSize: '13px'}}>
                      <strong>{approvedAction.wardName}</strong> action plan implemented.
                    </p>
                    <p style={{margin: '0 0 12px 0', color: '#93c5fd', fontSize: '12px'}}>
                      Expected AQI improvement: <strong>-{approvedAction.expectedImpact || 0}</strong>
                    </p>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                      {(approvedAction.actions || []).slice(0, 4).map((item, idx) => (
                        <div key={idx} style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#cbd5e1'}}>
                          {idx + 1}. {item.text || item}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{margin: 0, color: '#94a3b8', fontSize: '12px'}}>
                    No implemented action yet. Keep this exact session page open. Once mobile user taps <strong>Approve & Deploy</strong>, result appears here automatically.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={{display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap'}}>
            <button
              onClick={downloadQR}
              style={{
                background: 'linear-gradient(135deg, #51cf66, #a0f77d)',
                color: '#000',
                padding: '12px 28px',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Download QR
            </button>
            <button
              onClick={copyQRUrl}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#51cf66',
                padding: '12px 28px',
                border: '1px solid rgba(81, 207, 102, 0.3)',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Copy Link
            </button>
            <button
              onClick={() => liveFeedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{
                background: 'rgba(59, 130, 246, 0.18)',
                color: '#93c5fd',
                padding: '12px 28px',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Open Action Console
            </button>
            <button
              onClick={() => {
                setSessionId(null);
                setSessionState(null);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#51cf66',
                padding: '12px 28px',
                border: '1px solid rgba(81, 207, 102, 0.3)',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              New Session
            </button>
          </div>

          <div style={{textAlign: 'center', color: '#51cf66', fontSize: '12px'}}>
            Ecosystem sync ready
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)',
      color: '#fff',
      padding: '40px 20px',
      fontFamily: "'Manrope', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{maxWidth: '500px', textAlign: 'center'}}>
        <h1 style={{fontSize: '32px', fontWeight: 700, color: '#51cf66', marginBottom: '12px', fontFamily: "'Sora', sans-serif"}}>
          Creating QR Session...
        </h1>
        <p style={{fontSize: '14px', color: '#aaa', marginTop: 0, marginBottom: '30px'}}>
          Generating QR code for mobile source analysis
        </p>

        {error && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            color: '#ff8888'
          }}>
            <strong>Error:</strong> {error}
            <button
              onClick={createJudgeSession}
              style={{
                background: '#ff6b6b',
                color: '#fff',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                marginTop: '12px',
                cursor: 'pointer',
                display: 'block',
                margin: '12px auto 0'
              }}
            >
              Retry
            </button>
          </div>
        )}

        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(81, 207, 102, 0.2)',
          borderTop: '4px solid #51cf66',
          borderRadius: '50%',
          margin: '0 auto',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default OmniQRGenerator;
