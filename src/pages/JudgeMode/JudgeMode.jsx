import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./JudgeMode.css";

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const JudgeMode = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [currentPhase, setCurrentPhase] = useState("emergency_detection");
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const phaseTimeoutRef = useRef(null);

  const phases = [
    "emergency_detection",
    "why_ward_matters",
    "health_impact",
    "action_ready",
    "impact_theater",
  ];

  const phaseDurations = {
    emergency_detection: 5000,
    why_ward_matters: 8000,
    health_impact: 8000,
    action_ready: 10000,
    impact_theater: 10000,
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/judge-sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
          setLoading(false);
          setReveal(true);
        }
      } catch (err) {
        console.error("Failed to load session:", err);
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Auto-advance phases with dramatic timing
  useEffect(() => {
    const currentPhaseIdx = phases.indexOf(currentPhase);
    if (currentPhaseIdx === -1 || currentPhaseIdx >= phases.length - 1) return;

    const duration = phaseDurations[currentPhase] || 8000;

    phaseTimeoutRef.current = setTimeout(() => {
      setReveal(false);
      setTimeout(() => {
        const nextPhase = phases[currentPhaseIdx + 1];
        setCurrentPhase(nextPhase);
        setReveal(true);

        // Advance on backend
        fetch(`${API_BASE}/api/judge-sessions/${sessionId}/advance`, { method: "POST" });

        // Trigger website sync
        window.parent.postMessage(
          {
            type: "JUDGE_PHASE_CHANGE",
            phase: nextPhase,
            sessionId,
          },
          "*"
        );
      }, 300);
    }, duration);

    return () => clearTimeout(phaseTimeoutRef.current);
  }, [currentPhase, sessionId]);

  if (loading) {
    return (
      <div className="judge-mode-container loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Decision Theater...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="judge-mode-container error">
        <div className="error-card">
          <h2>Session Not Found</h2>
          <button onClick={() => navigate("/")}>Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const ph = session.wardStatus || {};
  const impact = session.impact || {};
  const health = session.healthImpact || {};
  const action = session.modelAction || {};

  return (
    <div className="judge-mode-container">
      {/* Phase 1: Emergency Detection */}
      {currentPhase === "emergency_detection" && (
        <div className={`phase emergency-detection ${reveal ? "reveal" : ""}`}>
          <div className="phase-backdrop"></div>
          <div className="phase-content">
            <div className="phase-label">EMERGENCY DETECTION</div>
            <h1 className="ward-name">{session.wardName}</h1>
            <div className="aqi-display">
              <div className="aqi-value">{ph.currentAqi}</div>
              <div className="aqi-band">{ph.band}</div>
            </div>
            <div className="phase-insight">
              <p>Top priority ward detected at risk</p>
              <p className="forecast-delta">
                24h forecast: {ph.forecast24} ({ph.delta24 > 0 ? "↑" : "↓"}{" "}
                {Math.abs(ph.delta24)})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: Why Ward Matters */}
      {currentPhase === "why_ward_matters" && (
        <div className={`phase why-matters ${reveal ? "reveal" : ""}`}>
          <div className="phase-backdrop" style={{backgroundImage: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"}}></div>
          <div className="phase-content">
            <div className="phase-label">WHY THIS WARD MATTERS</div>
            <div className="why-grid">
              <div className="why-card">
                <div className="why-icon">👥</div>
                <h3>Population</h3>
                <p className="why-stat">
                  {(ph.populationEstimate / 1000000).toFixed(1)}M residents
                </p>
              </div>
              <div className="why-card">
                <div className="why-icon">⚠️</div>
                <h3>At Risk</h3>
                <p className="why-stat">
                  {health.estimatedBeneficiaries?.toLocaleString() || "50K"} vulnerable
                </p>
              </div>
              <div className="why-card">
                <div className="why-icon">📈</div>
                <h3>Trend</h3>
                <p className="why-stat">
                  {ph.delta24 > 0 ? "Worsening" : "Improving"}
                </p>
              </div>
            </div>
            <div className="phase-insight">
              <p>Immediate focus required on {session.wardName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: Health Impact */}
      {currentPhase === "health_impact" && (
        <div className={`phase health-impact ${reveal ? "reveal" : ""}`}>
          <div className="phase-backdrop" style={{backgroundImage: "linear-gradient(135deg, #0f3460 0%, #16213e 100%)"}}></div>
          <div className="phase-content">
            <div className="phase-label">PREDICTED HEALTH IMPACT</div>
            <div className="impact-card">
              <div className="impact-hero">
                <div className="impact-number">{health.estimatedBeneficiaries?.toLocaleString() || 50000}</div>
                <div className="impact-label">Lives Protected</div>
              </div>
              <div className="impact-detail">
                <p>{health.description || `Estimated residents who benefit from action`}</p>
                <div className="impact-bar">
                  <div className="impact-fill" style={{width: `${health.beneficiaryPercentage || 60}%`}}></div>
                </div>
                <p className="impact-pct">{health.beneficiaryPercentage || 60}% vulnerable population</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4: Action Ready */}
      {currentPhase === "action_ready" && (
        <div className={`phase action-ready ${reveal ? "reveal" : ""}`}>
          <div className="phase-backdrop" style={{backgroundImage: "linear-gradient(135deg, #533483 0%, #2e0854 100%)"}}></div>
          <div className="phase-content">
            <div className="phase-label">ACTION READY</div>
            <h2>Model-Based Solution</h2>
            <div className="action-card">
              <div className="action-header">
                <h3>{action.playbook || "Mixed Local Mitigation"}</h3>
                <div className={`urgency-pill urgency-${action.urgency || "watch"}`}>
                  {action.urgency?.toUpperCase() || "WATCH"}
                </div>
              </div>
              <div className="action-list">
                {(action.recommendedActions || []).map((act, idx) => (
                  <div key={idx} className="action-item">
                    <span className="action-check">✓</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
              <div className="priority-score">
                Priority Score: <strong>{action.priorityScore || 50}/100</strong>
              </div>
            </div>
            <p className="action-note">
              Pre-opened on government command center
            </p>
          </div>
        </div>
      )}

      {/* Phase 5: Impact Theater */}
      {currentPhase === "impact_theater" && (
        <div className={`phase impact-theater ${reveal ? "reveal" : ""}`}>
          <div className="phase-backdrop" style={{backgroundImage: "linear-gradient(135deg, #1a472a 0%, #0d2818 100%)"}}></div>
          <div className="phase-content">
            <div className="phase-label">IMPACT THEATER</div>
            <div className="impact-theater-card">
              <div className="aqi-curve-container">
                <svg viewBox="0 0 400 200" className="aqi-curve">
                  {/* Before curve */}
                  <path
                    d={`M 10 130 Q 100 ${150 - ph.currentAqi / 3}, 200 ${150 - ph.forecast24 / 3}`}
                    stroke="#ff6b6b"
                    strokeWidth="3"
                    fill="none"
                    className="curve-before"
                  />
                  {/* After curve */}
                  <path
                    d={`M 200 ${150 - ph.forecast24 / 3} Q 300 ${150 - (ph.forecast24 - impact.estimatedAqiReduction) / 3}, 390 ${150 - (ph.forecast24 - Math.max(1, impact.estimatedAqiReduction)) / 3}`}
                    stroke="#51cf66"
                    strokeWidth="3"
                    fill="none"
                    className="curve-after"
                  />
                  {/* Labels */}
                  <text x="50" y="180" fontSize="12" fill="#999">
                    Before
                  </text>
                  <text x="340" y="180" fontSize="12" fill="#999">
                    After Action
                  </text>
                </svg>
              </div>
              <div className="impact-metric">
                <span className="metric-label">Estimated AQI Reduction</span>
                <span className="metric-value">{impact.estimatedAqiReduction || 20} points</span>
              </div>
            </div>
            <div className="impact-footer">
              <p>Full ecosystem synced • All stakeholders notified</p>
              <div className="judge-badge">Judge Session Active</div>
            </div>
          </div>
        </div>
      )}

      {/* Phase indicator and controls */}
      <div className="phase-indicator">
        {phases.map((p, idx) => (
          <div
            key={idx}
            className={`phase-dot ${p === currentPhase ? "active" : ""} ${phases.indexOf(p) < phases.indexOf(currentPhase) ? "completed" : ""}`}
            onClick={() => {
              setReveal(false);
              setTimeout(() => {
                setCurrentPhase(p);
                setReveal(true);
              }, 300);
            }}
          ></div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="judge-mode-footer">
        <div className="judge-count">👤 {session.judgeCount || 1} judge watching</div>
        <div className="judge-timer">
          Auto-advancing • Phase {phases.indexOf(currentPhase) + 1} of {phases.length}
        </div>
      </div>
    </div>
  );
};

export default JudgeMode;
