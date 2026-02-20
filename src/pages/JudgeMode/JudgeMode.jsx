import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./JudgeMode.css";

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const JudgeMode = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [wardData, setWardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState(null);
  const [currentView, setCurrentView] = useState("ward-select"); // ward-select, overview, health, action
  const [topWards, setTopWards] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch session data
        const sessionRes = await fetch(`${API_BASE}/api/judge-sessions/${sessionId}`);
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setSession(sessionData);
        }

        // Fetch crisis wards for selection
        const crisisRes = await fetch(`${API_BASE}/api/crisis-detection`);
        if (crisisRes.ok) {
          const crisisData = await crisisRes.json();
          setTopWards(crisisData.crisisWards || []);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load data:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  const handleWardSelect = (ward) => {
    setSelectedWard(ward);
    setWardData(session?.wardStatus || {
      currentAqi: ward.currentAqi,
      forecast24: ward.forecast24,
      forecast72: ward.forecast72,
    });
    setCurrentView("overview");
  };

  const getAqiColor = (aqi) => {
    if (aqi <= 50) return "#10b981";
    if (aqi <= 100) return "#f59e0b";
    if (aqi <= 200) return "#f97316";
    if (aqi <= 300) return "#ef4444";
    return "#991b1b";
  };

  const getAqiBand = (aqi) => {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  };

  if (loading) {
    return (
      <div className="judge-loading">
        <div className="judge-spinner"></div>
        <p>Loading Decision Theater...</p>
      </div>
    );
  }

  // Ward Selection Screen
  if (currentView === "ward-select") {
    return (
      <div className="judge-container">
        <div className="judge-header">
          <h1>🎯 Decision Theater</h1>
          <p>Select a high-risk ward for intervention</p>
        </div>

        <div className="ward-grid">
          {topWards.map((ward, idx) => (
            <div
              key={idx}
              className="ward-card"
              onClick={() => handleWardSelect(ward)}
              style={{ animationDelay: `${idx * 0.15}s` }}
            >
              <div className="ward-rank">#{idx + 1}</div>
              <div className="ward-name">{ward.name}</div>
              
              <div className="aqi-circle" style={{ 
                background: `conic-gradient(${getAqiColor(ward.currentAqi)} ${(ward.currentAqi / 500) * 100}%, #1f2937 0)` 
              }}>
                <div className="aqi-inner">
                  <div className="aqi-value">{ward.currentAqi}</div>
                  <div className="aqi-label">AQI</div>
                </div>
              </div>

              <div className="ward-stats">
                <div className="stat">
                  <span className="stat-label">24h Forecast</span>
                  <span className="stat-value" style={{ color: getAqiColor(ward.forecast24) }}>
                    {ward.forecast24}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">72h Forecast</span>
                  <span className="stat-value" style={{ color: getAqiColor(ward.forecast72) }}>
                    {ward.forecast72}
                  </span>
                </div>
              </div>

              <div className="ward-action">
                <span>Tap to Review</span>
                <span className="arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Overview Screen
  if (currentView === "overview") {
    return (
      <div className="judge-container">
        <div className="judge-nav">
          <button className="back-btn" onClick={() => setCurrentView("ward-select")}>
            ← Back
          </button>
          <div className="nav-title">{selectedWard?.name}</div>
        </div>

        <div className="overview-content">
          <div className="hero-aqi">
            <div className="hero-label">Current Air Quality</div>
            <div className="hero-value" style={{ color: getAqiColor(wardData?.currentAqi || 0) }}>
              {wardData?.currentAqi || 0}
            </div>
            <div className="hero-band" style={{ background: getAqiColor(wardData?.currentAqi || 0) }}>
              {getAqiBand(wardData?.currentAqi || 0)}
            </div>
          </div>

          <div className="forecast-cards">
            <div className="forecast-card">
              <div className="forecast-time">24 Hours</div>
              <div className="forecast-aqi" style={{ color: getAqiColor(wardData?.forecast24 || 0) }}>
                {wardData?.forecast24 || 0}
              </div>
              <div className="forecast-change">
                {wardData?.delta24 > 0 ? "↑" : "↓"} {Math.abs(wardData?.delta24 || 0)}
              </div>
            </div>
            <div className="forecast-card">
              <div className="forecast-time">72 Hours</div>
              <div className="forecast-aqi" style={{ color: getAqiColor(wardData?.forecast72 || 0) }}>
                {wardData?.forecast72 || 0}
              </div>
              <div className="forecast-change">
                {wardData?.delta72 > 0 ? "↑" : "↓"} {Math.abs(wardData?.delta72 || 0)}
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="action-btn primary" onClick={() => setCurrentView("health")}>
              👥 Health Impact
            </button>
            <button className="action-btn primary" onClick={() => setCurrentView("action")}>
              ⚡ Recommended Actions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Health Impact Screen
  if (currentView === "health") {
    const population = session?.wardStatus?.populationEstimate || 500000;
    const vulnerable = session?.wardStatus?.vulnerableCount || 75000;
    const beneficiaries = session?.healthImpact?.estimatedBeneficiaries || 45000;

    return (
      <div className="judge-container">
        <div className="judge-nav">
          <button className="back-btn" onClick={() => setCurrentView("overview")}>
            ← Back
          </button>
          <div className="nav-title">Health Impact</div>
        </div>

        <div className="health-content">
          <div className="impact-hero">
            <div className="impact-number">{beneficiaries.toLocaleString()}</div>
            <div className="impact-label">People Protected</div>
          </div>

          <div className="health-stats">
            <div className="health-stat">
              <div className="stat-icon">👨‍👩‍👧‍👦</div>
              <div className="stat-info">
                <div className="stat-num">{population.toLocaleString()}</div>
                <div className="stat-text">Total Population</div>
              </div>
            </div>
            <div className="health-stat">
              <div className="stat-icon">⚠️</div>
              <div className="stat-info">
                <div className="stat-num">{vulnerable.toLocaleString()}</div>
                <div className="stat-text">Vulnerable Groups</div>
              </div>
            </div>
          </div>

          <div className="impact-chart">
            <div className="chart-bar" style={{ width: `${(beneficiaries / population) * 100}%` }}>
              <span>{Math.round((beneficiaries / population) * 100)}% benefit</span>
            </div>
          </div>

          <button className="action-btn primary" onClick={() => setCurrentView("action")}>
            View Actions →
          </button>
        </div>
      </div>
    );
  }

  // Action Plan Screen
  if (currentView === "action") {
    const actions = session?.modelAction?.recommendedActions || [
      "Enforce traffic restrictions in high-density areas",
      "Activate emergency dust control measures",
      "Deploy mobile air purifiers in vulnerable zones"
    ];

    return (
      <div className="judge-container">
        <div className="judge-nav">
          <button className="back-btn" onClick={() => setCurrentView("overview")}>
            ← Back
          </button>
          <div className="nav-title">Action Plan</div>
        </div>

        <div className="action-content">
          <div className="playbook-badge" style={{ background: "#f59e0b" }}>
            {session?.modelAction?.playbook || "Mixed Local Mitigation"}
          </div>

          <div className="urgency-indicator" style={{ 
            background: session?.modelAction?.urgency === "high" ? "#ef4444" : "#f59e0b" 
          }}>
            <span className="urgency-icon">⚡</span>
            <span className="urgency-text">
              {(session?.modelAction?.urgency || "high").toUpperCase()} PRIORITY
            </span>
          </div>

          <div className="actions-list">
            {actions.map((action, idx) => (
              <div key={idx} className="action-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="action-number">{idx + 1}</div>
                <div className="action-text">{action}</div>
              </div>
            ))}
          </div>

          <div className="impact-estimate">
            <div className="estimate-label">Expected AQI Reduction</div>
            <div className="estimate-value">
              -{session?.impact?.estimatedAqiReduction || 35} points
            </div>
          </div>

          <div className="action-buttons">
            <button className="action-btn success" onClick={() => {
              alert("Action plan approved! Implementation initiated.");
              setCurrentView("ward-select");
            }}>
              ✓ Approve & Deploy
            </button>
            <button className="action-btn secondary" onClick={() => setCurrentView("overview")}>
              Review Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default JudgeMode;
