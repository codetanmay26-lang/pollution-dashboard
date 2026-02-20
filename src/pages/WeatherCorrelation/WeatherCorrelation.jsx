import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './WeatherCorrelation.css';

const API_BASE = import.meta.env.DEV ? 'https://delhi-pollution-2.onrender.com' : '';

const getAqiBand = (aqi) => {
  if (aqi > 300) return { label: 'Hazardous', className: 'hazardous' };
  if (aqi > 200) return { label: 'Very Unhealthy', className: 'very-unhealthy' };
  if (aqi > 100) return { label: 'Unhealthy', className: 'unhealthy' };
  if (aqi > 50) return { label: 'Moderate', className: 'moderate' };
  return { label: 'Good', className: 'good' };
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

const WeatherCorrelation = () => {
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('impact');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/analytics/weather-correlation`);
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const data = await response.json();
      setPayload(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load weather correlation data.');
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
      targets: '.wc-reveal',
      opacity: [0, 1],
      translateY: [22, 0],
      duration: 620,
      easing: 'easeOutExpo',
      delay: anime.stagger(55),
    });
  }, [payload]);

  const city = payload?.city || {};
  const factors = Array.isArray(city.factors) ? city.factors : [];
  const stations = Array.isArray(payload?.stations) ? payload.stations : [];
  const wards = useMemo(() => (
    Array.isArray(payload?.wards) ? payload.wards : []
  ), [payload]);
  const topImpacted = Array.isArray(payload?.topImpactedWards) ? payload.topImpactedWards : [];

  const filteredWards = useMemo(() => {
    let rows = wards;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => String(row.ward || '').toLowerCase().includes(q));
    }

    if (sortBy === 'aqi') {
      rows = [...rows].sort((a, b) => Number(b.aqi || 0) - Number(a.aqi || 0));
    } else if (sortBy === 'corr') {
      rows = [...rows].sort((a, b) => Math.abs(Number(b.correlation || 0)) - Math.abs(Number(a.correlation || 0)));
    } else {
      rows = [...rows].sort((a, b) => Number(b.impactIndex || 0) - Number(a.impactIndex || 0));
    }
    return rows;
  }, [wards, search, sortBy]);

  if (loading && !payload) {
    return (
      <div className="wc-loading">
        <div className="loading-ring"></div>
        <p>Loading weather correlation analytics...</p>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="wc-loading">
        <h2>Unable to load weather analytics</h2>
        <p>{error}</p>
        <button className="btn-solid" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="weather-page">
      <header className="weather-header wc-reveal">
        <div>
          <p className="page-kicker">Delhi Ward Pollution Monitor</p>
          <h1>Weather Correlation Intelligence</h1>
          <p>Understand how wind, humidity and inversion dynamics align with AQI pressure, then inspect ward-wise impact.</p>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn-ghost" onClick={() => navigate('/predictive-aqi')}>Predictive</button>
          <button className="btn-ghost" onClick={() => navigate('/solutions')}>Solutions</button>
          <button className="btn-solid" onClick={() => navigate('/wards')}>All Wards</button>
        </div>
      </header>

      <section className="weather-hero wc-reveal">
        <div className="city-summary-card">
          <h2>City-Level Weather Signal</h2>
          <p>
            Top correlated driver is <strong>{city.topDriver || 'N/A'}</strong> using {city.sampleHours || 0} hourly
            samples from {formatDateTime(city.periodStart)} to {formatDateTime(city.periodEnd)}.
          </p>
        </div>
        <div className="factor-grid">
          {factors.map((factor) => (
            <article key={factor.id} className="factor-card">
              <div className="factor-head">
                <h3>{factor.label}</h3>
                <span className={Number(factor.correlation) >= 0 ? 'corr-pos' : 'corr-neg'}>
                  {Number(factor.correlation) >= 0 ? '+' : ''}{factor.correlation}
                </span>
              </div>
              <p>{factor.insight}</p>
              <div className="factor-bar">
                <i style={{ width: `${Math.max(6, Math.min(100, Number(factor.impactScore || 0)))}%` }}></i>
              </div>
              <small>{String(factor.strength || '').replace('_', ' ')}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="station-section wc-reveal">
        <div className="section-head">
          <h2>Station-Level Weather Correlation</h2>
          <p>{stations.length} station clusters</p>
        </div>
        <div className="station-grid">
          {stations.map((station) => {
            const band = getAqiBand(Number(station.currentAqi || 0));
            return (
              <article key={station.location} className={`station-card ${band.className}`}>
                <div className="station-top">
                  <h3>{station.location}</h3>
                  <span className="station-aqi">{station.currentAqi}</span>
                </div>
                <p>Top driver: <strong>{station.topDriver || 'N/A'}</strong></p>
                <small>corr {Number(station.topCorrelation || 0) >= 0 ? '+' : ''}{station.topCorrelation}</small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ward-section wc-reveal">
        <div className="section-head">
          <h2>Ward-Wise Weather Impact</h2>
          <div className="ward-controls">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ward"
            />
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="impact">Sort by impact</option>
              <option value="aqi">Sort by AQI</option>
              <option value="corr">Sort by |correlation|</option>
            </select>
          </div>
        </div>

        <div className="top-impacted">
          {topImpacted.slice(0, 6).map((ward) => (
            <button
              key={ward.ward}
              className="top-impact-card"
              onClick={() => navigate(`/wards/${encodeURIComponent(ward.ward)}`)}
            >
              <p>{ward.ward}</p>
              <span>Impact {ward.impactIndex}</span>
              <em>{ward.topDriver}</em>
            </button>
          ))}
        </div>

        <div className="ward-table-wrap">
          <table className="ward-table">
            <thead>
              <tr>
                <th>Ward</th>
                <th>Location</th>
                <th>AQI</th>
                <th>Top Driver</th>
                <th>Correlation</th>
                <th>Impact</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredWards.map((ward) => (
                <tr key={`${ward.ward}-${ward.location}`}>
                  <td>{ward.ward}</td>
                  <td>{ward.location || '-'}</td>
                  <td>{ward.aqi}</td>
                  <td>{ward.topDriver}</td>
                  <td className={Number(ward.correlation) >= 0 ? 'corr-pos' : 'corr-neg'}>
                    {Number(ward.correlation) >= 0 ? '+' : ''}{ward.correlation}
                  </td>
                  <td>{ward.impactIndex}</td>
                  <td>
                    <button
                      className="btn-ghost small"
                      onClick={() => navigate(`/wards/${encodeURIComponent(ward.ward)}`)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default WeatherCorrelation;
