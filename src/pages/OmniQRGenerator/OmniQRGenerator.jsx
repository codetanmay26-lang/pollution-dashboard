import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OmniQRGenerator.css";

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const OmniQRGenerator = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const qrRef = useRef();

  useEffect(() => {
    console.log('OmniQRGenerator mounted, sessionId:', sessionId);
  }, [sessionId]);

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

  const downloadQR = () => {
    if (sessionId && qrRef.current) {
      const link = document.createElement("a");
      link.href = qrRef.current.src;
      link.download = `judge-session-${sessionId}.png`;
      link.click();
    }
  };

  const launchDemo = () => {
    if (sessionId) {
      navigate(`/judge/${sessionId}`);
    }
  };

  const copyQRUrl = () => {
    const url = `${window.location.origin}/judge/${sessionId}`;
    navigator.clipboard.writeText(url);
    alert("Session link copied to clipboard");
  };

  if (sessionId) {
    const qrImageUrl = `/api/judge-sessions/${sessionId}/qr`;

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
            <h1 style={{fontSize: '28px', color: '#51cf66', margin: '0 0 8px 0'}}>Decision Theater</h1>
            <p style={{color: '#aaa', margin: '0'}}>Session {sessionId.substring(0, 8)}...</p>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px', marginBottom: '30px'}}>
            <div>
              <h2 style={{color: '#fff', marginTop: 0}}>Session QR Code</h2>
              <p style={{color: '#aaa'}}>Share this code with judges</p>
              <div style={{background: '#fff', padding: '16px', borderRadius: '8px', display: 'inline-block'}}>
                <img
                  ref={qrRef}
                  src={qrImageUrl}
                  alt="Judge Session QR"
                  style={{width: '300px', height: '300px', display: 'block'}}
                  onError={(e) => console.error('QR load error:', e)}
                />
              </div>
              <p style={{color: '#888', fontSize: '12px', marginTop: '12px'}}>Scan to initiate theater</p>
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
                    <span style={{width: '6px', height: '6px', background: '#51cf66', borderRadius: '50%'}}></span> Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap'}}>
            <button
              onClick={launchDemo}
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
              Launch Demo
            </button>
            <button
              onClick={downloadQR}
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
              onClick={() => setSessionId(null)}
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
      fontFamily: "'Manrope', sans-serif"
    }}>
      <div style={{maxWidth: '900px', margin: '0 auto'}}>
        <h1 style={{fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '12px', fontFamily: "'Sora', sans-serif"}}>
          Judge Portal
        </h1>
        <p style={{fontSize: '14px', color: '#aaa', marginTop: 0, marginBottom: '30px'}}>
          Create synchronized judge experiences with live ecosystem engagement.
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
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {[
            { title: 'Auto-Detection', desc: 'System identifies top 3 at-risk wards' },
            { title: 'Cinematic Sequence', desc: '45-second automated presentation flow' },
            { title: 'Real-time Sync', desc: 'Website auto-sync at each phase' },
            { title: 'Health Impact', desc: 'Estimates vulnerable population benefits' },
            { title: 'Model Integration', desc: 'Trained forecast and policy models' },
            { title: 'Dashboard Control', desc: 'Command center with real-time tracking' }
          ].map((feature, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(81, 207, 102, 0.2)',
                borderRadius: '10px',
                padding: '20px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(81, 207, 102, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(81, 207, 102, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(81, 207, 102, 0.2)';
              }}
            >
              <h3 style={{fontSize: '14px', color: '#51cf66', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                {feature.title}
              </h3>
              <p style={{fontSize: '13px', color: '#ccc', margin: 0, lineHeight: '1.6'}}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{textAlign: 'center'}}>
          <button
            onClick={createJudgeSession}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #51cf66, #a0f77d)',
              color: '#000',
              padding: '14px 40px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {loading ? "Creating Session..." : "Create Judge Session"}
          </button>
          <p style={{marginTop: '16px', color: '#888', fontSize: '13px', margin: '16px 0 0 0'}}>
            Press to create and receive QR code for distribution.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OmniQRGenerator;
