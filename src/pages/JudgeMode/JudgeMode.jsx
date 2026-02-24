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

  const buildFallbackAnalysis = (base) => {
    const analysis = {
      vehicular: base?.vehicular ?? 32,
      industrial: base?.industrial ?? 48,
      construction: base?.construction ?? 12,
      seasonal: base?.seasonal ?? 8,
      insight: base?.insight || "AI analysis based on local source signals and ward conditions."
    };

    if (!Array.isArray(base?.healthRisks) || base.healthRisks.length === 0) {
      const aqi = selectedWard?.currentAqi || wardData?.currentAqi || 220;
      analysis.healthRisks = [
        {
          risk: "Respiratory Distress",
          population: aqi > 250 ? 52000 : 38000,
          severity: aqi > 250 ? "high" : "moderate"
        },
        {
          risk: "Cardiovascular Stress",
          population: aqi > 200 ? 26000 : 18000,
          severity: "moderate"
        },
        {
          risk: "Child Development Impact",
          population: aqi > 200 ? 17000 : 12000,
          severity: aqi > 200 ? "high" : "moderate"
        }
      ];
    } else {
      analysis.healthRisks = base.healthRisks;
    }

    if (!Array.isArray(base?.actions) || base.actions.length === 0) {
      const generatedActions = [];
      if (analysis.vehicular >= 30) generatedActions.push({ text: "Peak-hour traffic restrictions", impact: "15 AQI reduction" });
      if (analysis.industrial >= 25) generatedActions.push({ text: "Temporary industrial emission caps", impact: "18 AQI reduction" });
      if (analysis.construction >= 15) generatedActions.push({ text: "Dust suppression at active sites", impact: "8 AQI reduction" });
      if (analysis.seasonal >= 12) generatedActions.push({ text: "Protective school and hospital filtration", impact: "10 AQI reduction" });
      generatedActions.push({ text: "Public health advisory for vulnerable groups", impact: "Protective measure" });
      analysis.actions = generatedActions;
    } else {
      analysis.actions = base.actions;
    }

    if (typeof base?.totalImpact !== "number") {
      analysis.totalImpact = analysis.actions
        .map((item) => {
          const num = parseInt((item.impact || "").split(" ")[0], 10);
          return Number.isFinite(num) ? num : 0;
        })
        .reduce((sum, value) => sum + value, 0);
    } else {
      analysis.totalImpact = base.totalImpact;
    }

    return analysis;
  };

  const revealAIAnalysis = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/source-analysis/${selectedWard?.name || 'default'}`);
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(buildFallbackAnalysis(data));
        setCurrentView("comparison");
      }
    } catch (err) {
      console.error("Failed to get AI analysis:", err);
      // Fallback AI data
      setAiAnalysis(buildFallbackAnalysis({
        vehicular: 32,
        industrial: 48,
        construction: 12,
        seasonal: 8,
        insight: "This ward has 8 factories within 3km radius. Industrial emissions contribute heavily."
      }));
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

  // Comparison Screen (Judge vs AI) + Health + Actions - All in One
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

    const handleApproveAction = async () => {
      const actionPayload = {
        wardName: selectedWard?.name,
        actions: aiAnalysis?.actions || [],
        totalImpact: aiAnalysis?.totalImpact || 0
      };

      const persistApprovedAction = async () => {
        const persistRes = await fetch(`${API_BASE}/api/judge-sessions/${sessionId}/source-estimate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...sourceEstimate,
            approvedAction: {
              wardName: actionPayload.wardName,
              actions: actionPayload.actions,
              expectedImpact: actionPayload.totalImpact,
              status: 'deployed',
              timestamp: new Date().toISOString()
            }
          })
        });

        if (!persistRes.ok) {
          throw new Error(`source-estimate failed: ${persistRes.status}`);
        }
      };

      try {
        const response = await fetch(`${API_BASE}/api/judge-sessions/${sessionId}/approve-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(actionPayload)
        });

        if (response.ok) {
          // Fast path on newer backend: single deploy call only.
          alert(`✓ Action plan deployed for ${selectedWard?.name}!\n\nThe implemented action appears in Live Action Feed.`);
          setCurrentView("ward-select");
          return;
        }

        throw new Error(`approve-action failed: ${response.status}`);
      } catch (err) {
        console.error("Action approval error:", err);

        try {
          // Backward-compatible fallback for older backend
          await persistApprovedAction();

          alert(`✓ Action plan deployed for ${selectedWard?.name}!\n\nImplemented action is shown there (compatibility mode).`);
        } catch (fallbackErr) {
          console.error("Compatibility deploy failed:", fallbackErr);
          alert(`Deploy sync failed for session ${sessionId?.slice(0, 8)}.\nPlease keep same QR session open and retry once.\n(${fallbackErr.message})`);
        } finally {
          setCurrentView("ward-select");
        }
      }
    };

    return (
      <div className="judge-container">
        <div className="judge-nav">
          <button className="back-btn" onClick={() => setCurrentView("detective")}>
            ← Back
          </button>
          <div className="nav-title">Complete Analysis & Action Plan</div>
        </div>

        <div className="comparison-content">
          {/* ACCURACY SCORE */}
          <div className="accuracy-hero">
            <div className="accuracy-score" style={{ color: accuracy >= 75 ? '#51cf66' : '#f59e0b' }}>
              {accuracy}%
            </div>
            <div className="accuracy-label">{getMessage()}</div>
          </div>

          {/* SOURCE COMPARISON TABLE */}
          <div className="section-header">Source Attribution Comparison</div>
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

          {/* AI INSIGHT */}
          {aiAnalysis?.insight && (
            <div className="ai-insight">
              <div className="insight-badge">AI ANALYSIS</div>
              <div className="insight-text">
                {aiAnalysis.insight}
              </div>
            </div>
          )}

          {/* HEALTH RISKS SECTION */}
          {aiAnalysis?.healthRisks && aiAnalysis.healthRisks.length > 0 && (
            <>
              <div className="section-header">Predicted Health Impacts</div>
              <div className="health-risks-grid">
                {aiAnalysis.healthRisks.map((risk, idx) => (
                  <div key={idx} className="health-risk-card">
                    <div className="risk-header">
                      <span className="risk-name">{risk.risk}</span>
                      <span className={`risk-severity ${risk.severity}`}>
                        {risk.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="risk-population">
                      {risk.population.toLocaleString()} people at risk
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* RECOMMENDED ACTIONS SECTION */}
          {aiAnalysis?.actions && aiAnalysis.actions.length > 0 && (
            <>
              <div className="section-header">AI-Recommended Actions</div>
              <div className="actions-list-compact">
                {aiAnalysis.actions.map((action, idx) => (
                  <div key={idx} className="action-item-compact">
                    <div className="action-number-compact">{idx + 1}</div>
                    <div className="action-content">
                      <div className="action-text-compact">{action.text}</div>
                      <div className="action-impact">{action.impact}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {aiAnalysis.totalImpact > 0 && (
                <div className="total-impact-badge">
                  Expected Total Reduction: <strong>-{aiAnalysis.totalImpact} AQI points</strong>
                </div>
              )}
            </>
          )}

          {/* ACTION BUTTONS */}
          <div className="action-buttons">
            <button className="action-btn success-large" onClick={handleApproveAction}>
              ✓ Approve & Deploy Action Plan
            </button>
            <button className="action-btn secondary" onClick={() => setCurrentView("detective")}>
              Revise Estimates
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default JudgeMode;
