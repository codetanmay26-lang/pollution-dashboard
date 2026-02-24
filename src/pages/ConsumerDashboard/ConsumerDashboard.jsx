import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './ConsumerDashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : '');
const PROFILE_STORAGE_KEY = 'dwlp_consumer_profile';

const getRiskClass = (level) => {
  const value = String(level || '').toLowerCase();
  if (value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  return 'low';
};

const formatTimestamp = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAqiGlowColor = (aqi) => {
  if (aqi > 300) return 'rgba(239, 68, 68, 0.4)';
  if (aqi > 200) return 'rgba(249, 115, 22, 0.4)';
  if (aqi > 100) return 'rgba(245, 158, 11, 0.35)';
  if (aqi > 50) return 'rgba(74, 201, 255, 0.3)';
  return 'rgba(34, 197, 94, 0.3)';
};

const getAqiAccentColor = (aqi) => {
  if (aqi > 300) return '#ef4444';
  if (aqi > 200) return '#f97316';
  if (aqi > 100) return '#f59e0b';
  if (aqi > 50) return '#4ac9ff';
  return '#22c55e';
};

const ConsumerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialTab = searchParams.get('tab') || 'overview';
  const validTabs = ['overview', 'alerts', 'health', 'hotspots', 'reports'];
  const [activeTab, setActiveTab] = useState(validTabs.includes(initialTab) ? initialTab : 'overview');
  const [overview, setOverview] = useState(null);
  const [insight, setInsight] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [submittingSignal, setSubmittingSignal] = useState(false);
  const [error, setError] = useState('');
  const [signalError, setSignalError] = useState('');
  const [signalTimeline, setSignalTimeline] = useState([]);
  const [signalReviewRows, setSignalReviewRows] = useState([]);
  const [latestTicket, setLatestTicket] = useState(null);
  const [signalForm, setSignalForm] = useState({
    ward: '',
    signalType: 'dust',
    severity: 'medium',
    note: '',
  });

  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      const response = await fetch(`${API_BASE}/api/consumer/overview`);
      if (!response.ok) throw new Error(`Overview request failed (${response.status})`);
      const payload = await response.json();
      setOverview(payload);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load consumer overview.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchInsight = useCallback(async (profilePayload) => {
    try {
      setLoadingInsight(true);
      const response = await fetch(`${API_BASE}/api/consumer/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      });
      if (!response.ok) throw new Error(`Personalization request failed (${response.status})`);
      const payload = await response.json();
      setInsight(payload);
    } catch (err) {
      setError(err.message || 'Failed to load personalized insight.');
      setInsight(null);
    } finally {
      setLoadingInsight(false);
    }
  }, []);

  const fetchSignals = useCallback(async () => {
    try {
      setLoadingSignals(true);
      const response = await fetch(`${API_BASE}/api/citizen-signals?limit=20`);
      if (!response.ok) throw new Error(`Signal request failed (${response.status})`);
      const payload = await response.json();
      const rows = Array.isArray(payload?.signals) ? payload.signals : [];
      setSignalTimeline(rows);
      setSignalError('');
      if (rows.length && !latestTicket) {
        setLatestTicket(rows[0]);
      }
    } catch (err) {
      setSignalError(err.message || 'Failed to fetch citizen signals.');
    } finally {
      setLoadingSignals(false);
    }
  }, [latestTicket]);

  const fetchSignalReview = useCallback(async () => {
    try {
      setLoadingReview(true);
      const response = await fetch(`${API_BASE}/api/citizen-signals/review?limit=40`);
      if (!response.ok) throw new Error(`Review request failed (${response.status})`);
      const payload = await response.json();
      setSignalReviewRows(Array.isArray(payload?.items) ? payload.items : []);
      setSignalError('');
    } catch (err) {
      setSignalError(err.message || 'Failed to load ward review details.');
    } finally {
      setLoadingReview(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchSignals();
    fetchSignalReview();
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        setProfile(JSON.parse(raw));
      }
    } catch {
      setProfile(null);
    }
  }, [fetchOverview, fetchSignals, fetchSignalReview]);

  useEffect(() => {
    if (!profile) {
      setInsight(null);
      return;
    }
    fetchInsight(profile);
  }, [profile, fetchInsight]);

  // Sync tab state to URL
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Sync URL changes to tab state (browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // **INSTANT REVEAL - NO BLANK SPACE**
  useEffect(() => {
    anime({
      targets: '.consumer-reveal',
      opacity: 1,
      translateY: 0,
      duration: 100,
      delay: 0,
    });
    return () => {
      anime.remove('.consumer-reveal');
    };
  }, [overview, insight, loadingOverview, loadingInsight, activeTab]);

  const saveProfile = (nextProfile) => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    setProfile(nextProfile);
  };

  const clearProfile = () => {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfile(null);
    setInsight(null);
  };

  const togglePremium = () => {
    if (!profile) return;
    saveProfile({ ...profile, premium: !profile.premium });
  };

  const city = overview?.city || {};
  const alerts = overview?.alerts || [];
  const advisories = overview?.generalAdvisories || [];
  const wardRows = overview?.wardTable || [];
  const pricingPlans = overview?.pricing?.plans || [];
  const weatherFactors = overview?.weatherCorrelation?.factors || [];
  const weatherDriver = weatherFactors.length > 0 ? weatherFactors[0] : null;

  const hotspotRows = wardRows.slice(0, 14);
  const profileSummary = insight?.profile || {};
  const currentWardAqi = Number(insight?.wardSnapshot?.aqi || 0);
  const qrTrackingUrl = latestTicket
    ? `${window.location.origin}/ticket/${latestTicket.ticketId}`
    : '';
  const qrImageUrl = qrTrackingUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrTrackingUrl)}`
    : '';

  const downloadQrCode = async () => {
    if (!qrImageUrl || !latestTicket?.ticketId) return;
    try {
      const response = await fetch(qrImageUrl);
      if (!response.ok) throw new Error('Unable to download QR image right now.');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `signal-ticket-${latestTicket.ticketId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setSignalError('');
    } catch (err) {
      setSignalError(err.message || 'Failed to download QR code.');
    }
  };

  const submitSignal = async (event) => {
    event.preventDefault();
    if (!signalForm.ward) {
      setSignalError('Select a ward before submitting signal.');
      return;
    }

    try {
      setSubmittingSignal(true);
      const response = await fetch(`${API_BASE}/api/citizen-signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ward: signalForm.ward,
          signal_type: signalForm.signalType,
          severity: signalForm.severity,
          note: signalForm.note,
          source: 'consumer_dashboard',
        }),
      });
      if (!response.ok) throw new Error(`Submit failed (${response.status})`);
      const payload = await response.json();
      const ticket = payload?.ticket || null;
      if (ticket) {
        setLatestTicket(ticket);
      }
      setSignalForm((prev) => ({ ...prev, note: '' }));
      await Promise.all([fetchSignals(), fetchSignalReview()]);
      setSignalError('');
    } catch (err) {
      setSignalError(err.message || 'Unable to submit signal.');
    } finally {
      setSubmittingSignal(false);
    }
  };

  const forecastCards = [
    { label: '24h', point: insight?.forecast?.point24h },
    { label: '48h', point: insight?.forecast?.point48h },
    { label: '72h', point: insight?.forecast?.point72h },
  ];
  const latestReview = latestTicket
    ? signalReviewRows.find((row) => row.ticketId === latestTicket.ticketId) || null
    : signalReviewRows[0] || null;

  if (loadingOverview && !overview) {
    return (
      <div className="consumer-loading">
        <div className="consumer-loading-ring"></div>
        <p>Loading consumer dashboard...</p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="consumer-loading">
        <h2>Unable to load consumer dashboard</h2>
        <p>{error}</p>
        <button className="consumer-btn-primary" onClick={fetchOverview}>Retry</button>
      </div>
    );
  }

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', badge: null, badgeType: 'default' },
    { id: 'alerts', label: 'Alerts & Warnings', badge: alerts.length || null, badgeType: 'alert' },
    { id: 'health', label: 'Health Advice', badge: null, badgeType: 'default' },
    { id: 'hotspots', label: 'Ward Hotspots', badge: wardRows.length || null, badgeType: 'default' },
    { id: 'reports', label: 'Report & Plans', badge: null, badgeType: 'default' },
  ];

  const cityAqi = city.aqi || 0;
  const aqiGlowColor = getAqiGlowColor(cityAqi);
  const aqiAccentColor = getAqiAccentColor(cityAqi);

  return (
    <div className="consumer-dashboard-page">
      <div className="consumer-glow a"></div>
      <div className="consumer-glow b"></div>
      <div className="consumer-grid-overlay"></div>

      <main className="consumer-dashboard-main">
        <header className="consumer-header consumer-reveal">
          <div className="header-content">
            <p className="consumer-kicker">Consumer Air Protection Portal</p>
            <h1>Personal AQI Intelligence</h1>
            <p>Ward-level pollution visibility with family-aware recommendations.</p>
          </div>
        </header>

        {/* Tab Bar */}
        <nav className="consumer-tabs consumer-reveal">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`consumer-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
              {tab.badge !== null && (
                <span className={`tab-badge ${tab.badgeType === 'alert' ? 'tab-badge-alert' : ''}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <>
            {/* Hero AQI Display */}
            <section className="consumer-hero-aqi consumer-reveal">
              <div 
                className="hero-aqi-glow"
                style={{ 
                  background: `radial-gradient(ellipse at center, ${aqiGlowColor} 0%, transparent 70%)` 
                }}
              ></div>
              <div className="hero-aqi-content">
                <p className="hero-aqi-label">Delhi City AQI</p>
                <h2 
                  className="hero-aqi-value"
                  style={{ color: aqiAccentColor }}
                >
                  {cityAqi}
                </h2>
                <span className={`city-band ${city.status || 'moderate'}`}>{city.band || 'Moderate'}</span>
              </div>
            </section>

            {/* Summary Stats Row */}
            <section className="consumer-summary-row consumer-reveal">
              <div className="summary-stat">
                <span className="summary-label">Critical Wards</span>
                <span className="summary-value">{city.criticalWards || 0}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Active Alerts</span>
                <span className="summary-value">{city.activeAlerts || 0}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Top Driver</span>
                <span className="summary-value">{weatherDriver?.label || 'N/A'}</span>
              </div>
            </section>

            <section className="consumer-hero consumer-reveal">
              <article className="consumer-panel city-focus">
                <p className="panel-kicker">City Snapshot</p>
                <div className="city-meta">
                  <div>
                    <strong>{city.criticalWards || 0}</strong>
                    <p>Critical wards</p>
                  </div>
                  <div>
                    <strong>{city.activeAlerts || 0}</strong>
                    <p>Active alerts</p>
                  </div>
                </div>
              </article>

              <article className="consumer-panel profile-focus">
                <p className="panel-kicker">Your Profile</p>
                {profile ? (
                  <>
                    <h3>{profileSummary.wardMatched || profile.ward || '-'}</h3>
                    <p>
                      Family {profileSummary.familyMembers || profile.family_members || 1} • Travel {profileSummary.dailyTravelMinutes || profile.daily_travel_minutes || 0} min/day
                    </p>
                    <div className="profile-tags">
                      {profileSummary.children || profile.children ? <span>Children</span> : null}
                      {profileSummary.elderly || profile.elderly ? <span>Elderly</span> : null}
                      {profileSummary.respiratoryIssues || profile.respiratory_issues ? <span>Respiratory</span> : null}
                      <span className={profile.premium ? 'premium-on' : ''}>{profile.premium ? 'Premium On' : 'Free Mode'}</span>
                    </div>
                    <div className="profile-actions">
                      <button className="consumer-btn-ghost" onClick={togglePremium}>
                        {profile.premium ? 'Switch to Free' : 'Enable Premium'}
                      </button>
                      <button className="consumer-btn-ghost danger" onClick={clearProfile}>Reset Profile</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>No profile configured</h3>
                    <p>Complete onboarding to unlock personalized health risk scoring and route advice.</p>
                    <button className="consumer-btn-primary" onClick={() => navigate('/consumer/onboarding')}>
                      Create Consumer Profile
                    </button>
                  </>
                )}
              </article>
            </section>

            {/* Weather Driver Card */}
            <section className="consumer-panel consumer-reveal weather-driver-section">
              <div className="weather-chip-large">
                <p>Strongest Weather Driver</p>
                <strong>{weatherDriver?.label || 'Unavailable'}</strong>
                <span>Correlation {weatherDriver?.correlation ?? '-'}</span>
              </div>
            </section>
          </>
        )}

        {/* Tab 2: Alerts & Warnings */}
        {activeTab === 'alerts' && (
          <>
            <section className="consumer-panel consumer-reveal">
              <div className="panel-head">
                <h2>What needs attention now</h2>
                <span>{alerts.length} active</span>
              </div>
              <ul className="alert-list">
                {alerts.slice(0, 12).map((alert) => (
                  <li key={alert.id}>
                    <div>
                      <strong>{alert.ward}</strong>
                      <p>{alert.message}</p>
                    </div>
                    <div className="alert-meta">
                      <span className={`sev ${alert.severity}`}>{alert.severity}</span>
                      <strong>AQI {alert.aqi}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="consumer-panel consumer-reveal">
              <div className="panel-head">
                <h3>Action Status Timeline</h3>
                <span>{signalTimeline.length} ticket(s)</span>
              </div>
              {signalError ? <p className="signal-error">{signalError}</p> : null}
              {loadingSignals ? <p className="insight-loading">Loading signal timeline...</p> : null}
              <ul className="signal-timeline">
                {signalTimeline.slice(0, 12).map((item) => (
                  <li key={item.ticketId}>
                    <div>
                      <strong>{item.ticketId}</strong>
                      <p>{item.ward} · {item.signalType} · {item.severity}</p>
                    </div>
                    <div className="timeline-meta">
                      <span className={`sev ${item.severity}`}>{item.status}</span>
                      <button className="consumer-btn-ghost" onClick={() => navigate(`/ticket/${encodeURIComponent(item.ticketId)}`)}>
                        View
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* Tab 3: Health Advice */}
        {activeTab === 'health' && (
          <>
            <section className="consumer-panel consumer-reveal">
              <div className="panel-head">
                <h2>What you should do now</h2>
                <span>Public guidance</span>
              </div>
              <ul className="advisory-list">
                {advisories.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="consumer-panel consumer-reveal">
              <div className="weather-chip-large">
                <p>Strongest Weather Driver</p>
                <strong>{weatherDriver?.label || 'Unavailable'}</strong>
                <span>Correlation {weatherDriver?.correlation ?? '-'}</span>
              </div>
            </section>

            {profile && insight ? (
              <section className="consumer-panel consumer-reveal">
                <div className="panel-head">
                  <h2>Your personalized plan</h2>
                  <span>{loadingInsight ? 'Refreshing...' : 'Profile-based output'}</span>
                </div>
                {loadingInsight ? (
                  <div className="insight-loading">Generating personalized recommendation set...</div>
                ) : (
                  <div className="insight-stack">
                    <div className="risk-row">
                      <div className={`risk-block ${getRiskClass(insight?.risk?.level)}`}>
                        <p>Risk Level</p>
                        <h3>{insight?.risk?.level || 'Low'}</h3>
                        <strong>{insight?.risk?.score || 0}/100</strong>
                        <span>{insight?.wardSnapshot?.band || '-'}</span>
                      </div>
                      <div className="risk-drivers">
                        <p>Top drivers</p>
                        <div>
                          {(insight?.risk?.drivers || []).map((driver) => (
                            <span key={driver}>{driver}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="forecast-row">
                      {forecastCards.map((item) => {
                        const predicted = Number(item.point?.predictedAqi ?? currentWardAqi);
                        const delta = predicted - currentWardAqi;
                        return (
                          <article key={item.label} className="forecast-card">
                            <p>{item.label} Forecast</p>
                            <h4>{Math.round(predicted)}</h4>
                            <span className={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}>
                              {delta > 0 ? '+' : ''}{Math.round(delta)} vs now
                            </span>
                            <small>{formatTimestamp(item.point?.timestamp)}</small>
                          </article>
                        );
                      })}
                    </div>

                    <div className="insight-columns">
                      <article>
                        <h3>Personal Health Actions</h3>
                        <ul>
                          {(insight?.healthAdvisories || []).map((advice, idx) => (
                            <li key={`${advice}-${idx}`}>{advice}</li>
                          ))}
                        </ul>
                      </article>
                      <article>
                        <h3>Low-Pollution Route Suggestions</h3>
                        <ul className="route-list">
                          {(insight?.routeSuggestions || []).map((route) => (
                            <li key={route.routeName}>
                              <div>
                                <strong>{route.routeName}</strong>
                                <p>{route.reason}</p>
                              </div>
                              <div className="route-meta">
                                <span>{route.estimatedMinutes} min</span>
                                <span>Exposure {route.aqiExposureScore}</span>
                                <span>{route.travelWindow}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </article>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section className="consumer-panel consumer-reveal">
                <p className="insight-loading">Set up your profile to receive personalized health recommendations.</p>
                <button className="consumer-btn-primary" onClick={() => navigate('/consumer/onboarding')}>
                  Create Consumer Profile
                </button>
              </section>
            )}
          </>
        )}

        {/* Tab 4: Ward Hotspots */}
        {activeTab === 'hotspots' && (
          <section className="consumer-panel consumer-reveal">
            <div className="panel-head">
              <h2>Ward Hotspot List</h2>
              <span>{wardRows.length} wards</span>
            </div>
            <div className="hotspot-table-wrap">
              <table className="hotspot-table">
                <thead>
                  <tr>
                    <th>Ward</th>
                    <th>AQI</th>
                    <th>PM2.5</th>
                    <th>PM10</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {wardRows.map((row) => (
                    <tr key={row.ward}>
                      <td>{row.ward}</td>
                      <td>{row.aqi}</td>
                      <td>{row.pm2_5}</td>
                      <td>{row.pm10}</td>
                      <td>{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab 5: Report & Plans */}
        {activeTab === 'reports' && (
          <>
            <section className="consumer-panel consumer-reveal report-review-panel">
              <div className="panel-head">
                <h2>Ward Review Ticket Desk</h2>
                <span>Consumer ↔ Government Workflow</span>
              </div>
              <div className="report-review-layout">
                <article className="report-card">
                  <h3>Submit Ward Report</h3>
                  <form className="signal-form" onSubmit={submitSignal}>
                    <label>
                      Ward
                      <select
                        value={signalForm.ward}
                        onChange={(event) => setSignalForm((prev) => ({ ...prev, ward: event.target.value }))}
                      >
                        <option value="">Select ward</option>
                        {wardRows.slice(0, 80).map((row) => (
                          <option key={row.ward} value={row.ward}>{row.ward}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Signal type
                      <select
                        value={signalForm.signalType}
                        onChange={(event) => setSignalForm((prev) => ({ ...prev, signalType: event.target.value }))}
                      >
                        <option value="dust">Dust surge</option>
                        <option value="smoke">Smoke / open burning</option>
                        <option value="traffic">Traffic congestion burst</option>
                        <option value="health">Breathing discomfort cluster</option>
                      </select>
                    </label>
                    <label>
                      Severity
                      <select
                        value={signalForm.severity}
                        onChange={(event) => setSignalForm((prev) => ({ ...prev, severity: event.target.value }))}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </label>
                    <label>
                      Note
                      <textarea
                        rows="3"
                        value={signalForm.note}
                        onChange={(event) => setSignalForm((prev) => ({ ...prev, note: event.target.value }))}
                        placeholder="Optional context"
                      />
                    </label>
                    <button className="consumer-btn-primary" type="submit" disabled={submittingSignal}>
                      {submittingSignal ? 'Submitting...' : 'Submit Signal'}
                    </button>
                  </form>

                  {latestTicket ? (
                    <div className="qr-card">
                      <p>Latest Ticket: {latestTicket.ticketId}</p>
                      <img src={qrImageUrl} alt="Signal tracking QR" />
                      <div className="qr-actions">
                        <button className="consumer-btn-ghost" onClick={() => navigate(`/ticket/${encodeURIComponent(latestTicket.ticketId)}`)}>
                          Open Ticket Tracker
                        </button>
                        <button className="consumer-btn-ghost" onClick={downloadQrCode}>
                          Download QR
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>

                <article className="report-card">
                  <h3>Latest Ward Review</h3>
                  {loadingReview ? <p className="insight-loading">Loading model review...</p> : null}
                  {latestReview ? (
                    <div className="review-summary">
                      <p>
                        Ticket <strong>{latestReview.ticketId}</strong> · {latestReview.ward}
                      </p>
                      <p>
                        Status <strong>{latestReview.status}</strong> · Ward AQI <strong>{latestReview?.wardStatus?.currentAqi ?? '-'}</strong>
                      </p>
                      <p>
                        Forecast 24h <strong>{latestReview?.wardStatus?.forecast24 ?? '-'}</strong> ({(latestReview?.wardStatus?.delta24 ?? 0) >= 0 ? '+' : ''}{latestReview?.wardStatus?.delta24 ?? 0})
                      </p>
                      <p>
                        Model playbook <strong>{latestReview?.modelSolution?.playbook || 'Mixed Local Mitigation'}</strong>
                      </p>
                      <ul>
                        {(latestReview?.modelSolution?.recommendedActions || []).slice(0, 3).map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="insight-loading">Submit a report to see ward-level review with model solution.</p>
                  )}
                </article>
              </div>
            </section>

            <section className="consumer-pricing consumer-reveal">
              <h2>Plans</h2>
              <div className="plan-grid">
                {pricingPlans.map((plan) => (
                  <article className={`plan-card ${plan.id === 'premium' ? 'premium' : ''}`} key={plan.id}>
                    <p>{plan.name}</p>
                    <h3>{plan.priceMonthly === 0 ? 'Free' : `Rs ${plan.priceMonthly}/month`}</h3>
                    <ul>
                      {(plan.features || []).map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default ConsumerDashboard;
