import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './PredictiveAQI.css';

const API_BASE = import.meta.env.DEV ? 'https://delhi-pollution-2.onrender.com' : '';

const getAqiBand = (aqi) => {
  if (aqi > 300) return { label: 'Hazardous', className: 'hazardous' };
  if (aqi > 200) return { label: 'Very Unhealthy', className: 'very-unhealthy' };
  if (aqi > 100) return { label: 'Unhealthy', className: 'unhealthy' };
  if (aqi > 50) return { label: 'Moderate', className: 'moderate' };
  return { label: 'Good', className: 'good' };
};

const getPoint = (points, horizon) => {
  const rows = Array.isArray(points) ? points : [];
  return rows.find((point) => Number(point.horizonHours) === Number(horizon)) || null;
};

const formatDateTime = (isoValue) => {
  if (!isoValue) return '-';
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return String(isoValue);
  return parsed.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toSparklinePoints = (series, width = 240, height = 60, padding = 8) => {
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

const PredictiveAQI = () => {
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [horizon, setHorizon] = useState(24);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('predicted');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/analytics/predictive-aqi`);
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const data = await response.json();
      setPayload(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load predictive AQI data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!payload) return;
    anime({
      targets: '.pa-reveal',
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 640,
      easing: 'easeOutExpo',
      delay: anime.stagger(60),
    });
  }, [payload, horizon]);

  const city = payload?.city || {};
  const cityPoints = useMemo(() => (
    Array.isArray(payload?.city?.points) ? payload.city.points : []
  ), [payload]);
  const stations = Array.isArray(payload?.stations) ? payload.stations : [];
  const wards = useMemo(() => (
    Array.isArray(payload?.wards) ? payload.wards : []
  ), [payload]);
  const topRisk24 = Array.isArray(payload?.topRisk24h) ? payload.topRisk24h : [];
  const topImprovers72 = Array.isArray(payload?.topImprovers72h) ? payload.topImprovers72h : [];

  const citySeries = useMemo(() => {
    if (!cityPoints.length) return [];
    return cityPoints.map((point) => Number(point.predictedAqi || 0));
  }, [cityPoints]);
  const citySpark = toSparklinePoints(citySeries);

  const wardRows = useMemo(() => {
    let rows = wards.map((ward) => {
      const point = getPoint(ward.points, horizon);
      return {
        ...ward,
        selectedPoint: point,
        predictedAqi: Number(point?.predictedAqi || ward.currentAqi || 0),
      };
    });

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => String(row.ward || '').toLowerCase().includes(q));
    }

    if (sortBy === 'delta') {
      rows = [...rows].sort((a, b) => Number(b.delta72 || 0) - Number(a.delta72 || 0));
    } else if (sortBy === 'current') {
      rows = [...rows].sort((a, b) => Number(b.currentAqi || 0) - Number(a.currentAqi || 0));
    } else {
      rows = [...rows].sort((a, b) => Number(b.predictedAqi || 0) - Number(a.predictedAqi || 0));
    }
    return rows;
  }, [wards, horizon, search, sortBy]);

  if (loading && !payload) {
    return (
      <div className="pa-loading">
        <div className="loading-ring"></div>
        <p>Loading predictive AQI analytics...</p>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="pa-loading">
        <h2>Unable to load forecast analytics</h2>
        <p>{error}</p>
        <button className="btn-solid" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="predictive-page">
      <header className="predictive-header pa-reveal">
        <div>
          <p className="page-kicker">Delhi Ward Pollution Monitor</p>
          <h1>Predictive AQI Command Center</h1>
          <p>24-72 hour AQI forecasts from weather-aware ridge models, with station-level and ward-wise risk ranking.</p>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn-ghost" onClick={() => navigate('/weather-correlation')}>Weather</button>
          <button className="btn-ghost" onClick={() => navigate('/solutions')}>Solutions</button>
          <button className="btn-solid" onClick={() => navigate('/map')}>Map</button>
        </div>
      </header>

      <section className="city-forecast pa-reveal">
        <div className="city-head">
          <h2>City Forecast</h2>
          <p>Model quality: <strong>{String(city?.model?.quality || 'unavailable').replace('_', ' ')}</strong> | MAE {city?.model?.meanMae ?? '-'}</p>
        </div>
        <div className="city-grid">
          {cityPoints.map((point) => {
            const band = getAqiBand(Number(point.predictedAqi || 0));
            return (
              <article key={point.horizonHours} className={`city-point-card ${band.className}`}>
                <p>+{point.horizonHours}h</p>
                <h3>{point.predictedAqi}</h3>
                <span>{point.lowerAqi} to {point.upperAqi}</span>
                <small>{formatDateTime(point.forecastAt)}</small>
              </article>
            );
          })}
        </div>
        <svg className="city-spark" viewBox="0 0 240 60" preserveAspectRatio="none">
          <polyline points={citySpark} />
        </svg>
      </section>

      <section className="station-forecast pa-reveal">
        <div className="section-head">
          <h2>Station Forecasts</h2>
          <p>{stations.length} station models</p>
        </div>
        <div className="station-grid">
          {stations.map((station) => {
            const forecast = station.forecast || {};
            const point24 = getPoint(forecast.points, 24);
            const point72 = getPoint(forecast.points, 72);
            return (
              <article key={station.location} className="station-card">
                <h3>{station.location}</h3>
                <p>Current AQI <strong>{station.currentAqi}</strong></p>
                <div className="station-row">
                  <span>+24h</span>
                  <strong>{point24?.predictedAqi ?? '-'}</strong>
                </div>
                <div className="station-row">
                  <span>+72h</span>
                  <strong>{point72?.predictedAqi ?? '-'}</strong>
                </div>
                <small>Quality {String(forecast?.model?.quality || 'unavailable').replace('_', ' ')}</small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="risk-columns pa-reveal">
        <article className="risk-column">
          <h2>Top Risk 24h</h2>
          {topRisk24.slice(0, 8).map((ward) => {
            const p = getPoint(ward.points, 24);
            return (
              <button
                key={`risk-${ward.ward}`}
                className="risk-row"
                onClick={() => navigate(`/wards/${encodeURIComponent(ward.ward)}`)}
              >
                <span>{ward.ward}</span>
                <strong>{p?.predictedAqi ?? ward.currentAqi}</strong>
              </button>
            );
          })}
        </article>
        <article className="risk-column">
          <h2>Top Improvers 72h</h2>
          {topImprovers72.slice(0, 8).map((ward) => (
            <button
              key={`improve-${ward.ward}`}
              className="risk-row"
              onClick={() => navigate(`/wards/${encodeURIComponent(ward.ward)}`)}
            >
              <span>{ward.ward}</span>
              <strong>{ward.delta72 > 0 ? `+${ward.delta72}` : ward.delta72}</strong>
            </button>
          ))}
        </article>
      </section>

      <section className="ward-forecast pa-reveal">
        <div className="section-head">
          <h2>Ward-Wise Forecast Grid</h2>
          <div className="controls">
            <select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}>
              <option value={24}>+24h</option>
              <option value={48}>+48h</option>
              <option value={72}>+72h</option>
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="predicted">Sort by predicted AQI</option>
              <option value="current">Sort by current AQI</option>
              <option value="delta">Sort by delta72</option>
            </select>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ward"
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="forecast-table">
            <thead>
              <tr>
                <th>Ward</th>
                <th>Current AQI</th>
                <th>Predicted AQI</th>
                <th>Range</th>
                <th>Trend</th>
                <th>Delta24</th>
                <th>Delta72</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {wardRows.map((row) => {
                const point = row.selectedPoint;
                const band = getAqiBand(Number(row.predictedAqi || 0));
                return (
                  <tr key={`${row.ward}-${row.location}`}>
                    <td>{row.ward}</td>
                    <td>{row.currentAqi}</td>
                    <td className={`pred-cell ${band.className}`}>{row.predictedAqi}</td>
                    <td>{point ? `${point.lowerAqi}-${point.upperAqi}` : '-'}</td>
                    <td>{row.trendDirection}</td>
                    <td>{row.delta24 > 0 ? `+${row.delta24}` : row.delta24}</td>
                    <td>{row.delta72 > 0 ? `+${row.delta72}` : row.delta72}</td>
                    <td>
                      <button
                        className="btn-ghost small"
                        onClick={() => navigate(`/wards/${encodeURIComponent(row.ward)}`)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PredictiveAQI;
