import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import { useJudgeSessionSync, usePollJudgeSession } from '../../hooks/useJudgeSessionSync';
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : '');
const GAUGE_RADIUS = 58;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

const getAqiMeta = (aqi) => {
  if (aqi > 300) return { label: 'Severe', className: 'hazardous', color: '#ef4444' };
  if (aqi > 200) return { label: 'Very Unhealthy', className: 'very-unhealthy', color: '#f97316' };
  if (aqi > 100) return { label: 'Unhealthy', className: 'unhealthy', color: '#f59e0b' };
  if (aqi > 50) return { label: 'Moderate', className: 'moderate', color: '#4ac9ff' };
  return { label: 'Good', className: 'good', color: '#90f4aa' };
};

const getDominantSource = (ward) => {
  if (!ward) return 'Mixed';
  const vehicular = Number(ward.vehicular_pct || 0);
  const industrial = Number(ward.industrial_pct || 0);
  const gap = Math.abs(vehicular - industrial);
  if (gap < 8) return 'Mixed';
  return vehicular > industrial ? 'Traffic' : 'Industrial';
};

const normalizeContributions = (vehicularRaw, industrialRaw) => {
  const vehicular = Math.max(0, Number(vehicularRaw || 0));
  const industrial = Math.max(0, Number(industrialRaw || 0));
  const total = vehicular + industrial;
  if (total <= 0) return { vehicular: 0, industrial: 0, other: 100 };
  if (total > 100) {
    const scale = 100 / total;
    const v = Math.round(vehicular * scale);
    const i = Math.round(industrial * scale);
    return { vehicular: v, industrial: i, other: Math.max(0, 100 - v - i) };
  }
  const v = Math.round(vehicular);
  const i = Math.round(industrial);
  return { vehicular: v, industrial: i, other: Math.max(0, 100 - v - i) };
};

const getInitials = (name) => {
  const words = String(name || '').split(' ').filter(Boolean);
  if (!words.length) return 'WD';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
};

const weatherCodeToLabel = (code) => {
  const key = Number(code);
  if ([0, 1].includes(key)) return 'Clear';
  if ([2, 3].includes(key)) return 'Cloudy';
  if ([45, 48].includes(key)) return 'Fog';
  if ([51, 53, 55, 61, 63, 65].includes(key)) return 'Rain';
  if ([71, 73, 75].includes(key)) return 'Snow';
  if ([95, 96, 99].includes(key)) return 'Storm';
  return 'Haze';
};

const getHealthRisk = (pm25) => {
  if (pm25 >= 151) return { label: 'Lung Stress High', className: 'high' };
  if (pm25 >= 86) return { label: 'Respiratory Caution', className: 'medium' };
  return { label: 'Manageable Exposure', className: 'low' };
};

const toSparklinePoints = (series, width = 180, height = 52, padding = 6) => {
  const values = (series || []).map((value) => Number(value || 0));
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = padding + (index / Math.max(1, values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / span) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
};

const formatForecastTime = (isoValue) => {
  if (!isoValue) return '-';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return String(isoValue);
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const sourceActions = {
  Traffic: [
    'Deploy peak-hour corridor diversion and no-idling enforcement.',
    'Increase bus/metro frequency in affected micro-zones.',
    'Run targeted emission checks around traffic hot pockets.'
  ],
  Industrial: [
    'Initiate rapid compliance checks for nearby industrial units.',
    'Restrict high-emission process windows for 24-48 hours.',
    'Increase dust and particulate suppression at source.'
  ],
  Mixed: [
    'Coordinate traffic and dust-control teams in one window.',
    'Increase ward-level monitoring frequency.',
    'Issue health advisories for vulnerable residents.'
  ]
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [wardsData, setWardsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7days');
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState([]);
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('all');
  const [alertSourceFilter, setAlertSourceFilter] = useState('all');
  const [weather, setWeather] = useState({
    temp: 21,
    min: 20,
    max: 22,
    condition: 'Haze',
    live: false,
  });

  // Judge session sync
  const [judgeHighlightWard, setJudgeHighlightWard] = useState(null);
  const { activeSession, currentPhase } = useJudgeSessionSync((data) => {
    // When judge session phase changes, highlight corresponding ward
    if (data.sessionId) {
      setJudgeHighlightWard(data.sessionId);
    }
  });
  
  const { sessionState: judgeSessionData } = usePollJudgeSession(activeSession, 500);
  const approvedActionData =
    judgeSessionData?.approvedAction ||
    judgeSessionData?.sourceEstimate?.approvedAction ||
    null;

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardRes, wardsRes] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard`),
        fetch(`${API_BASE}/api/wards`),
      ]);
      if (!dashboardRes.ok) throw new Error(`Dashboard request failed (${dashboardRes.status})`);
      if (!wardsRes.ok) throw new Error(`Wards request failed (${wardsRes.status})`);

      const [dashboardPayload, wardsPayload] = await Promise.all([
        dashboardRes.json(),
        wardsRes.json(),
      ]);
      setDashboardData(dashboardPayload);
      setWardsData(Array.isArray(wardsPayload.wards) ? wardsPayload.wards : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeather = useCallback(async () => {
    try {
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata&forecast_days=1'
      );
      if (!response.ok) throw new Error('Weather request failed');
      const data = await response.json();
      setWeather({
        temp: Math.round(Number(data?.current?.temperature_2m ?? 21)),
        min: Math.round(Number(data?.daily?.temperature_2m_min?.[0] ?? 20)),
        max: Math.round(Number(data?.daily?.temperature_2m_max?.[0] ?? 22)),
        condition: weatherCodeToLabel(data?.current?.weather_code),
        live: true,
      });
    } catch {
      setWeather((prev) => ({
        ...prev,
        live: false,
      }));
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    fetchWeather();
    const dashboardTimer = setInterval(fetchAllData, 5 * 60 * 1000);
    const weatherTimer = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      clearInterval(dashboardTimer);
      clearInterval(weatherTimer);
    };
  }, [fetchAllData, fetchWeather]);

  const wardIndex = useMemo(() => {
    const map = new Map();
    wardsData.forEach((ward) => map.set((ward.name || '').toLowerCase(), ward));
    return map;
  }, [wardsData]);

  const alertsWithContext = useMemo(() => {
    return (dashboardData?.alerts || []).map((alert) => {
      const ward = wardIndex.get((alert.ward || '').toLowerCase());
      return {
        ...alert,
        wardData: ward || null,
        source: getDominantSource(ward),
        location: ward?.location || 'Delhi Sector',
      };
    });
  }, [dashboardData, wardIndex]);

  const filteredAlerts = useMemo(() => {
    return alertsWithContext
      .filter((alert) => !dismissedAlertIds.includes(alert.id))
      .filter((alert) => (alertSeverityFilter === 'all' ? true : alert.severity === alertSeverityFilter))
      .filter((alert) => (alertSourceFilter === 'all' ? true : alert.source.toLowerCase() === alertSourceFilter));
  }, [alertsWithContext, dismissedAlertIds, alertSeverityFilter, alertSourceFilter]);

  useEffect(() => {
    if (!filteredAlerts.length) {
      setSelectedAlertId(null);
      return;
    }
    const exists = filteredAlerts.some((alert) => alert.id === selectedAlertId);
    if (!exists) {
      setSelectedAlertId(filteredAlerts[0].id);
    }
  }, [filteredAlerts, selectedAlertId]);

  const selectedAlert = useMemo(() => {
    return filteredAlerts.find((alert) => alert.id === selectedAlertId) || null;
  }, [filteredAlerts, selectedAlertId]);

  const selectedWard = selectedAlert?.wardData || null;
  const dominantSource = selectedAlert?.source || 'Mixed';
  const normalized = normalizeContributions(selectedWard?.vehicular_pct, selectedWard?.industrial_pct);
  const recommended = sourceActions[dominantSource];

  const cityAqi = Number(dashboardData?.kpis?.cityAqi || 0);
  const gaugeProgress = Math.min(1, cityAqi / 500);
  const gaugeOffset = GAUGE_CIRCUMFERENCE * (1 - gaugeProgress);

  const cityPm25 = useMemo(() => {
    if (!wardsData.length) return 0;
    const sum = wardsData.reduce((acc, ward) => acc + Number(ward.pm2_5 || 0), 0);
    return Math.round(sum / wardsData.length);
  }, [wardsData]);

  const cityPm10 = useMemo(() => {
    if (!wardsData.length) return 0;
    const sum = wardsData.reduce((acc, ward) => acc + Number(ward.pm10 || 0), 0);
    return Math.round(sum / wardsData.length);
  }, [wardsData]);

  const healthRisk = getHealthRisk(cityPm25);

  const recentSeries = dashboardData?.trendData?.['30days'] || [];
  const recentLow = recentSeries.length ? Math.round(Math.min(...recentSeries)) : 170;
  const recentHigh = recentSeries.length ? Math.round(Math.max(...recentSeries)) : 314;

  const trendSeries = dashboardData?.trendData?.[selectedTimeframe] || [];
  const trendMax = Math.max(1, ...trendSeries);
  const trendPoints = trendSeries
    .map((value, index, arr) => {
      const x = arr.length > 1 ? (index / (arr.length - 1)) * 760 : 380;
      const y = 250 - (Number(value || 0) / trendMax) * 220;
      return `${x},${y}`;
    })
    .join(' ');

  const sparkCity = toSparklinePoints(dashboardData?.trendData?.['7days'] || []);
  const sparkWorst = toSparklinePoints((dashboardData?.wardRisks || []).slice(0, 8).map((ward) => ward.aqi));
  const sparkAlerts = toSparklinePoints([
    dashboardData?.citySummary?.hazardous || 0,
    dashboardData?.citySummary?.veryUnhealthy || 0,
    dashboardData?.citySummary?.unhealthy || 0,
    dashboardData?.citySummary?.moderate || 0,
    dashboardData?.citySummary?.good || 0,
  ]);
  const sparkTrend = toSparklinePoints(trendSeries);

  const metricCards = [
    {
      id: 'city',
      title: 'City AQI',
      value: String(dashboardData?.kpis?.cityAqi || 0),
      sub: getAqiMeta(dashboardData?.kpis?.cityAqi || 0).label,
      className: getAqiMeta(dashboardData?.kpis?.cityAqi || 0).className,
      points: sparkCity,
      tip: 'Mean AQI across mapped Delhi wards.',
    },
    {
      id: 'worst',
      title: 'Worst Ward AQI',
      value: String(dashboardData?.kpis?.worstWard || 0),
      sub: getAqiMeta(dashboardData?.kpis?.worstWard || 0).label,
      className: getAqiMeta(dashboardData?.kpis?.worstWard || 0).className,
      points: sparkWorst,
      tip: 'Peak ward AQI from current monitoring cycle.',
    },
    {
      id: 'alerts',
      title: 'Critical Alerts',
      value: String(filteredAlerts.length),
      sub: 'Filterable and dismissible queue',
      className: 'hazardous',
      points: sparkAlerts,
      tip: 'Active alerts after applied filters and dismissals.',
    },
    {
      id: 'trend',
      title: '7-Day Direction',
      value: String(dashboardData?.kpis?.trend || '0%'),
      sub: String(dashboardData?.kpis?.trend || '').includes('+') ? 'Worsening trend' : 'Improving trend',
      className: String(dashboardData?.kpis?.trend || '').includes('+') ? 'unhealthy' : 'good',
      points: sparkTrend,
      tip: 'Compared against baseline trend in your timeseries.',
    },
  ];

  const weatherCorrelation = dashboardData?.weatherCorrelation || {};
  const correlationFactors = Array.isArray(weatherCorrelation.factors) ? weatherCorrelation.factors : [];
  const forecast = dashboardData?.aqiForecast || {};
  const forecastPoints = Array.isArray(forecast.points) ? forecast.points : [];
  const forecastSeries = [cityAqi, ...forecastPoints.map((point) => Number(point.predictedAqi || 0))];
  const forecastSpark = toSparklinePoints(forecastSeries, 260, 64, 8);
  const modelQuality = String(forecast?.model?.quality || 'unavailable').replace('_', ' ');
  const meanMae = forecast?.model?.meanMae;

  useEffect(() => {
    if (!dashboardData) return;
    anime({
      targets: '.dash-reveal',
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 640,
      easing: 'easeOutExpo',
      delay: anime.stagger(70),
    });
    anime({
      targets: '.aqi-ring-progress',
      strokeDashoffset: [GAUGE_CIRCUMFERENCE, gaugeOffset],
      duration: 1100,
      easing: 'easeOutQuad',
    });
  }, [dashboardData, gaugeOffset, selectedTimeframe, alertSeverityFilter, alertSourceFilter]);

  if (loading && !dashboardData) {
    return (
      <div className="dashboard-loading">
        <div className="loading-ring"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="dashboard-loading">
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>
        <button className="btn-solid" onClick={fetchAllData}>Retry</button>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="dashboard-page">
      {/* Mobile Analysis Session Active Banner */}
      {activeSession && judgeSessionData && (
        <div className={`judge-session-banner dash-reveal ${approvedActionData ? 'action-deployed' : ''}`}>
          <div className="banner-content">
            <span className="banner-icon">{approvedActionData ? '✓' : '🎯'}</span>
            <div className="banner-text">
              <h3>{approvedActionData ? 'Action Plan Deployed' : 'Pollution Analysis Active'}</h3>
              {approvedActionData ? (
                <p>
                  <strong>{approvedActionData.wardName}</strong> • 
                  {approvedActionData.actions?.length || 0} interventions deployed • 
                  Expected: <span className="impact-value">-{approvedActionData.expectedImpact || 0} AQI</span>
                </p>
              ) : (
                <p>Mobile session: {judgeSessionData.wardName} • Phase: {judgeSessionData.currentPhase?.replace(/_/g, ' ')}</p>
              )}
            </div>
            <div className="banner-action">
              {approvedActionData ? (
                <span className="deployment-status">ACTIVE</span>
              ) : (
                <span className="judge-count">{judgeSessionData.judgeCount} connected</span>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="dashboard-header dash-reveal">
        <div>
          <p className="page-kicker">Delhi Ward Pollution Monitor</p>
          <h1 className="page-title">Command Dashboard</h1>
          <p className="page-subtitle">Live city signal, focused alert queue, and faster ward-level drill-down.</p>
        </div>
      </header>

      <section className="hero-insight dash-reveal">
        <div className="hero-copy">
          <div className="hero-pill">Live Delhi AQI Window: {recentLow}-{recentHigh}</div>
          <h2>Current city AQI is {cityAqi}, in {getAqiMeta(cityAqi).label.toLowerCase()} band.</h2>
          <p>
            Recent Delhi concentrations remain in unhealthy-to-severe range. PM2.5 currently averages {cityPm25} ug/m3 and PM10 averages {cityPm10} ug/m3.
          </p>
          <div className="hero-health">
            <div className={`risk-chip ${healthRisk.className}`}>
              <span className="risk-icon">!</span>
              <div>
                <strong>{healthRisk.label}</strong>
                <p>PM2.5: {cityPm25} ug/m3</p>
              </div>
            </div>
            <div className="risk-chip">
              <span className="risk-icon">T</span>
              <div>
                <strong>{weather.condition}</strong>
                <p>{weather.min}C - {weather.max}C ({weather.live ? 'Live' : 'Fallback'})</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-gauge">
          <svg className="aqi-ring" viewBox="0 0 160 160">
            <circle className="aqi-ring-track" cx="80" cy="80" r={GAUGE_RADIUS}></circle>
            <circle
              className="aqi-ring-progress"
              cx="80"
              cy="80"
              r={GAUGE_RADIUS}
              style={{
                stroke: getAqiMeta(cityAqi).color,
                strokeDasharray: GAUGE_CIRCUMFERENCE,
                strokeDashoffset: gaugeOffset,
              }}
            ></circle>
          </svg>
          <div className="aqi-ring-text">
            <span>Delhi AQI</span>
            <strong>{cityAqi}</strong>
            <em>{getAqiMeta(cityAqi).label}</em>
            <small>{weather.temp}C now</small>
          </div>
        </div>
      </section>

      <section className="metrics-grid dash-reveal">
        {metricCards.map((card) => (
          <article
            key={card.id}
            className={`metric-card ${card.className} tooltip-target`}
            data-tip={card.tip}
          >
            <p>{card.title}</p>
            <h3>{card.value}</h3>
            <span>{card.sub}</span>
            <svg className="metric-sparkline" viewBox="0 0 180 52" preserveAspectRatio="none">
              <polyline points={card.points} />
            </svg>
          </article>
        ))}
      </section>

      <section className="intel-grid">
        <article className="glass-panel dash-reveal">
          <div className="panel-head">
            <h2>Weather Correlation Layer</h2>
            <span className="panel-micro">{weatherCorrelation.sampleHours || 0} hourly samples</span>
          </div>
          <div className="corr-grid">
            {correlationFactors.map((factor) => (
              <div key={factor.id} className="corr-card">
                <div className="corr-head">
                  <h3>{factor.label}</h3>
                  <span className={`corr-value ${Number(factor.correlation) >= 0 ? 'pos' : 'neg'}`}>
                    {Number(factor.correlation) >= 0 ? '+' : ''}{factor.correlation}
                  </span>
                </div>
                <p>{factor.insight}</p>
                <div className="corr-bar">
                  <i style={{ width: `${Math.max(8, Math.min(100, Number(factor.impactScore || 0)))}%` }}></i>
                </div>
                <small>{String(factor.strength || 'unknown').replace('_', ' ')}</small>
              </div>
            ))}
            {!correlationFactors.length && (
              <p className="empty-note">Weather correlation data is unavailable right now.</p>
            )}
          </div>
        </article>

        <article className="glass-panel dash-reveal">
          <div className="panel-head">
            <h2>Predictive AQI (24-72 hrs)</h2>
            <span className={`model-quality ${forecast?.model?.quality || 'unavailable'}`}>
              {modelQuality}
            </span>
          </div>
          <p className="forecast-note">
            Last observed: {formatForecastTime(forecast.latestObservedAt)}.
            {typeof meanMae === 'number' ? ` MAE ${meanMae}.` : ''}
          </p>
          <svg className="forecast-spark" viewBox="0 0 260 64" preserveAspectRatio="none">
            <polyline points={forecastSpark} />
          </svg>
          <div className="forecast-grid">
            {forecastPoints.map((point) => {
              const meta = getAqiMeta(point.predictedAqi);
              return (
                <div key={point.horizonHours} className="forecast-card">
                  <div>
                    <strong>+{point.horizonHours}h</strong>
                    <p>{formatForecastTime(point.forecastAt)}</p>
                  </div>
                  <div className="forecast-value-wrap">
                    <span className="forecast-value">{point.predictedAqi}</span>
                    <small>{point.lowerAqi}-{point.upperAqi}</small>
                  </div>
                  <span className={`forecast-status ${meta.className}`}>{meta.label}</span>
                </div>
              );
            })}
            {!forecastPoints.length && (
              <p className="empty-note">Forecast model has insufficient data.</p>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-main">
        <article className="glass-panel dash-reveal">
          <div className="panel-head">
            <h2>Priority Alerts</h2>
            <div className="panel-controls">
              <select value={alertSeverityFilter} onChange={(e) => setAlertSeverityFilter(e.target.value)}>
                <option value="all">All severity</option>
                <option value="critical">High</option>
                <option value="warning">Warning</option>
                <option value="emerging">Emerging</option>
              </select>
              <select value={alertSourceFilter} onChange={(e) => setAlertSourceFilter(e.target.value)}>
                <option value="all">All sources</option>
                <option value="traffic">Traffic</option>
                <option value="industrial">Industrial</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>

          <div className="alerts-scroll">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-item ${selectedAlert?.id === alert.id ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedAlertId(alert.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedAlertId(alert.id);
                  }
                }}
              >
                <div className="alert-avatar">{getInitials(alert.ward)}</div>
                <div className="alert-content">
                  <div className="alert-topline">
                    <h4>{alert.ward}</h4>
                    <span className={`severity-badge ${alert.severity}`}>{alert.severity}</span>
                  </div>
                  <p>AQI {alert.aqi} · {alert.type} · {alert.time}</p>
                  <p className="alert-location">
                    <span className="pin">o</span>
                    {alert.location}
                  </p>
                </div>
                <button
                  className="dismiss-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDismissedAlertIds((prev) => [...new Set([...prev, alert.id])]);
                  }}
                >
                  Dismiss
                </button>
              </div>
            ))}
            {!filteredAlerts.length && (
              <div className="empty-state">
                <p>No alerts match current filters.</p>
                <button className="btn-ghost small" onClick={() => setDismissedAlertIds([])}>Reset Dismissed</button>
              </div>
            )}
          </div>
        </article>

        <article className="glass-panel dash-reveal">
          <div className="panel-head">
            <h2>Selected Alert Action</h2>
            {selectedAlert && (
              <button
                className="btn-solid small"
                onClick={() => navigate(`/wards/${encodeURIComponent(selectedAlert.ward)}`)}
              >
                Open Ward
              </button>
            )}
          </div>
          {selectedAlert ? (
            <div className="selected-alert">
              <h3>{selectedAlert.ward}</h3>
              <p>Dominant source: <strong>{dominantSource}</strong></p>
              <div className="source-lines">
                <div className="source-line"><span>Vehicular</span><div><i style={{ width: `${normalized.vehicular}%` }}></i></div><em>{normalized.vehicular}%</em></div>
                <div className="source-line"><span>Industrial</span><div><i style={{ width: `${normalized.industrial}%` }}></i></div><em>{normalized.industrial}%</em></div>
                <div className="source-line"><span>Other</span><div><i style={{ width: `${normalized.other}%` }}></i></div><em>{normalized.other}%</em></div>
              </div>
              <div className="action-list">
                {recommended.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          ) : (
            <p className="empty-note">Select an alert to inspect source attribution and recommended intervention.</p>
          )}
        </article>
      </section>

      <section className="dashboard-bottom">
        <article className="glass-panel dash-reveal">
          <div className="panel-head">
            <h2>AQI Trend</h2>
            <div className="timeframe-toggle">
              {['7days', '30days', '90days'].map((tf) => (
                <button
                  key={tf}
                  className={`toggle-btn ${selectedTimeframe === tf ? 'active' : ''}`}
                  onClick={() => setSelectedTimeframe(tf)}
                >
                  {tf.replace('days', ' days')}
                </button>
              ))}
            </div>
          </div>
          <svg className="trend-chart" viewBox="0 0 760 250" preserveAspectRatio="none">
            <polyline points={`0,250 ${trendPoints} 760,250`} className="trend-fill" />
            <polyline points={trendPoints} className="trend-line" />
          </svg>
        </article>

        <article className="glass-panel dash-reveal">
          <div className="panel-head">
            <h2>Top Risk Wards</h2>
            <button className="btn-ghost small" onClick={() => navigate('/wards')}>View All</button>
          </div>
          <div className="risk-list">
            {(dashboardData.wardRisks || []).slice(0, 6).map((ward) => {
              const meta = getAqiMeta(ward.aqi);
              return (
                <button
                  key={ward.rank}
                  className="risk-row"
                  onClick={() => navigate(`/wards/${encodeURIComponent(ward.ward)}`)}
                >
                  <span>#{ward.rank}</span>
                  <span>{ward.ward}</span>
                  <span className="risk-badge" style={{ background: meta.color }}>{ward.aqi}</span>
                </button>
              );
            })}
          </div>
        </article>
      </section>

    </div>
  );
};

export default Dashboard;
