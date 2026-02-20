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
  const [currentView, setCurrentView] = useState("ward-select"); // ward-select, detective, comparison, overview, health, action
  const [topWards, setTopWards] = useState([]);
  
  // Source Detective state
  const [sourceEstimate, setSourceEstimate] = useState({
    vehicular: 25,
    industrial: 25,
    construction: 25,
    seasonal: 25
  });
  const [aiAnalysis, setAiAnalysis] = useState(null);

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
    setCurrentView("detective"); // Start with pollution detective game
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

  const handleSourceChange = (changedSource, newValue) => {
    const numValue = parseInt(newValue);
    
    // Auto-normalize: distribute remaining percentage across other sources
    const remaining = 100 - numValue;
    const otherSources = ['vehicular', 'industrial', 'construction', 'seasonal'].filter(s => s !== changedSource);
    
    // Calculate current total of other sources
    const otherTotal = otherSources.reduce((sum, source) => sum + sourceEstimate[source], 0);
    
    // Create new estimates with auto-normalization
    const newEstimates = { [changedSource]: numValue };
    
    if (otherTotal === 0) {
      // If others are all 0, distribute equally
      const perSource = Math.floor(remaining / 3);
      const remainder = remaining - (perSource * 3);
      otherSources.forEach((source, idx) => {
        newEstimates[source] = perSource + (idx === 0 ? remainder : 0);
      });
    } else {
      // Distribute proportionally based on current ratios
      let distributed = 0;
      otherSources.forEach((source, idx) => {
        if (idx === otherSources.length - 1) {
          // Last source gets the remainder to ensure exact 100%
          newEstimates[source] = remaining - distributed;
        } else {
          const proportion = sourceEstimate[source] / otherTotal;
          const value = Math.round(remaining * proportion);
          newEstimates[source] = value;
          distributed += value;
        }
      });
    }
    
    setSourceEstimate(newEstimates);
    
    // Send to backend for live sync with main dashboard
    fetch(`${API_BASE}/api/judge-sessions/${sessionId}/source-estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEstimates)
    }).catch(err => console.error('Sync error:', err));
  };

  const getTotalEstimate = () => {
    return sourceEstimate.vehicular + sourceEstimate.industrial + 
           sourceEstimate.construction + sourceEstimate.seasonal;
  };

  const revealAIAnalysis = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/source-analysis/${selectedWard?.name || 'default'}`);
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
        setCurrentView("comparison");
      }
    } catch (err) {
      console.error("Failed to get AI analysis:", err);
      // Fallback AI data
      setAiAnalysis({
        vehicular: 32,
        industrial: 48,
        construction: 12,
        seasonal: 8,
        insight: "This ward has 8 factories within 3km radius. Industrial emissions contribute heavily."
      });
      setCurrentView("comparison");
    }
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
          <h1>Pollution Analysis Center</h1>
          <p>Select a high-risk ward for source attribution analysis</p>
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

  // Pollution Source Detective Screen
  if (currentView === "detective") {
    const total = getTotalEstimate();
    const isValid = total === 100;

    return (
      <div className="judge-container">
        <div className="judge-nav">
          <button className="back-btn" onClick={() => setCurrentView("ward-select")}>
            ← Back
          </button>
          <div className="nav-title">Pollution Source Analysis</div>
        </div>

        <div className="detective-content">
          <div className="detective-header">
            <h2>{selectedWard?.name}</h2>
            <div className="aqi-badge" style={{ background: getAqiColor(selectedWard?.currentAqi || 0) }}>
              AQI: {selectedWard?.currentAqi || 0}
            </div>
          </div>

          <p className="detective-challenge">
            Estimate pollution contribution from each source<br/>
            <strong>Drag any slider — others adjust automatically!</strong>
          </p>

          <div className="source-sliders">
            {[
              { key: 'vehicular', icon: 'VEH', label: 'Vehicular Emissions', color: '#3b82f6' },
              { key: 'industrial', icon: 'IND', label: 'Industrial Activity', color: '#f59e0b' },
              { key: 'construction', icon: 'CON', label: 'Construction Dust', color: '#8b5cf6' },
              { key: 'seasonal', icon: 'SEA', label: 'Seasonal (Stubble)', color: '#10b981' }
            ].map(({ key, icon, label, color }) => (
              <div key={key} className="source-slider-group">
                <div className="source-label">
                  <span className="source-icon" style={{ background: color }}>{icon}</span>
                  <span className="source-name">{label}</span>
                  <span className="source-percent">{sourceEstimate[key]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sourceEstimate[key]}
                  onChange={(e) => handleSourceChange(key, e.target.value)}
                  className="source-slider"
                  style={{
                    background: `linear-gradient(to right, #51cf66 0%, #51cf66 ${sourceEstimate[key]}%, #1f2937 ${sourceEstimate[key]}%, #1f2937 100%)`
                  }}
                />
              </div>
            ))}
          </div>

          <div className="total-badge valid">
            ✓ Total: {total}% — Ready for Analysis
          </div>

          <button
            className="action-btn primary reveal-btn"
            onClick={revealAIAnalysis}
          >
            Reveal AI Analysis →
          </button>
        </div>
      </div>
    );
  }

  // Comparison Screen (Judge vs AI)
  if (currentView === "comparison") {
    const calculateAccuracy = () => {
      if (!aiAnalysis) return 0;
      const diffs = [
        Math.abs(sourceEstimate.vehicular - aiAnalysis.vehicular),
        Math.abs(sourceEstimate.industrial - aiAnalysis.industrial),
        Math.abs(sourceEstimate.construction - aiAnalysis.construction),
        Math.abs(sourceEstimate.seasonal - aiAnalysis.seasonal)
      ];
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / 4;
      return Math.max(0, Math.round(100 - avgDiff));
    };

    const accuracy = calculateAccuracy();
    const getMessage = () => {
      if (accuracy >= 90) return "Excellent - Almost Perfect Match";
      if (accuracy >= 75) return "Good - Close to AI Analysis";
      if (accuracy >= 60) return "Moderate - Some Discrepancies";
      return "Significant Variance from AI Prediction";
    };

    return (
      <div className="judge-container">
        <div className="judge-nav">
          <button className="back-btn" onClick={() => setCurrentView("detective")}>
            ← Back
          </button>
          <div className="nav-title">Analysis Comparison</div>
        </div>

        <div className="comparison-content">
          <div className="accuracy-hero">
            <div className="accuracy-score" style={{ color: accuracy >= 75 ? '#51cf66' : '#f59e0b' }}>
              {accuracy}%
            </div>
            <div className="accuracy-label">{getMessage()}</div>
          </div>

          <div className="comparison-table">
            <div className="comparison-header">
              <div className="col-label">Source</div>
              <div className="col-judge">Your Estimate</div>
              <div className="col-ai">AI Analysis</div>
            </div>

            {[
              { key: 'vehicular', icon: 'VEH', label: 'Vehicular', color: '#3b82f6' },
              { key: 'industrial', icon: 'IND', label: 'Industrial', color: '#f59e0b' },
              { key: 'construction', icon: 'CON', label: 'Construction', color: '#8b5cf6' },
              { key: 'seasonal', icon: 'SEA', label: 'Seasonal', color: '#10b981' }
            ].map(({ key, icon, label, color }) => {
              const diff = Math.abs(sourceEstimate[key] - (aiAnalysis?.[key] || 0));
              const isClose = diff <= 10;
              return (
                <div key={key} className="comparison-row">
                  <div className="col-label">
                    <span className="source-badge" style={{ background: color }}>{icon}</span>
                    <span>{label}</span>
                  </div>
                  <div className="col-judge">
                    <span>{sourceEstimate[key]}%</span>
                    <span className={`accuracy-indicator ${isClose ? 'close' : 'off'}`}>{isClose ? 'Close' : 'Off'}</span>
                  </div>
                  <div className="col-ai highlight">
                    {aiAnalysis?.[key] || 0}%
                  </div>
                </div>
              );
            })}
          </div>

          {aiAnalysis?.insight && (
            <div className="ai-insight">
              <div className="insight-badge">AI ANALYSIS</div>
              <div className="insight-text">
                {aiAnalysis.insight}
              </div>
            </div>
          )}

          <div className="action-buttons">
            <button className="action-btn primary" onClick={() => setCurrentView("overview")}>
              Continue to Overview →
            </button>
          </div>
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
