import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './WardDetails.css';

const API_BASE = import.meta.env.DEV ? 'https://delhi-pollution-2.onrender.com' : '';

const getAqiBand = (aqi) => {
  if (aqi > 300) return { label: 'Hazardous', className: 'hazardous', color: '#ef4444' };
  if (aqi > 200) return { label: 'Very Unhealthy', className: 'very-unhealthy', color: '#f97316' };
  if (aqi > 100) return { label: 'Unhealthy', className: 'unhealthy', color: '#f59e0b' };
  if (aqi > 50) return { label: 'Moderate', className: 'moderate', color: '#4ac9ff' };
  return { label: 'Good', className: 'good', color: '#90f4aa' };
};

const getDominantSource = (ward) => {
  if (!ward) return 'Mixed';
  const v = Number(ward.vehicular_pct || 0);
  const i = Number(ward.industrial_pct || 0);
  const gap = Math.abs(v - i);
  if (gap < 8) return 'Mixed';
  return v > i ? 'Traffic' : 'Industrial';
};

const normalizeContributions = (vehicularRaw, industrialRaw) => {
  const vehicular = Math.max(0, Number(vehicularRaw || 0));
  const industrial = Math.max(0, Number(industrialRaw || 0));
  const total = vehicular + industrial;

  if (total <= 0) {
    return { vehicular: 0, industrial: 0, other: 100 };
  }

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

const sourceActions = {
  Traffic: [
    'Deploy dynamic diversions on nearby high-volume road segments.',
    'Strengthen no-idling and roadside emissions enforcement.',
    'Increase off-peak public transport frequency to reduce private traffic.'
  ],
  Industrial: [
    'Audit nearby industrial operations for stack/particulate compliance.',
    'Limit high-emission process windows during peak pollution hours.',
    'Increase local dust and fugitive emission control at source.'
  ],
  Mixed: [
    'Run synchronized traffic and dust-control interventions.',
    'Increase ward-level AQI checks during high-risk windows.',
    'Issue targeted advisories for schools, elderly, and respiratory-risk groups.'
  ]
};

const WardDetails = () => {
  const navigate = useNavigate();
  const { wardName } = useParams();
  const [params] = useSearchParams();
  const fallbackWard = params.get('ward');
  const requestedWard = decodeURIComponent(wardName || fallbackWard || '');

  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWards = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/wards`);
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const payload = await response.json();
      setWards(Array.isArray(payload.wards) ? payload.wards : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to fetch ward data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const ward = useMemo(() => {
    if (!requestedWard) return null;
    return wards.find((w) => (w.name || '').toLowerCase() === requestedWard.toLowerCase()) || null;
  }, [wards, requestedWard]);

  useEffect(() => {
    if (!ward) return;
    anime({
      targets: '.details-animate',
      opacity: [0, 1],
      translateY: [22, 0],
      duration: 650,
      easing: 'easeOutExpo',
      delay: anime.stagger(70)
    });

    anime({
      targets: '.bar-fill',
      width: (el) => el.getAttribute('data-width'),
      duration: 900,
      easing: 'easeOutCubic',
      delay: anime.stagger(130, { start: 220 })
    });
  }, [ward]);

  if (loading) {
    return (
      <div className="ward-details-loading">
        <div className="loading-ring"></div>
        <p>Loading ward profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ward-details-loading">
        <h2>Unable to load ward profile</h2>
        <p>{error}</p>
        <button className="btn-solid" onClick={fetchWards}>Retry</button>
      </div>
    );
  }

  if (!requestedWard || !ward) {
    return (
      <div className="ward-details-loading">
        <h2>Ward not found</h2>
        <p>Could not find data for the requested ward profile.</p>
        <button className="btn-solid" onClick={() => navigate('/wards')}>Back to All Wards</button>
      </div>
    );
  }

  const band = getAqiBand(ward.avg_AQI);
  const dominantSource = getDominantSource(ward);
  const actions = sourceActions[dominantSource];
  const normalized = normalizeContributions(ward.vehicular_pct, ward.industrial_pct);

  return (
    <div className="ward-details-page">
      <header className="details-header details-animate">
        <button className="btn-ghost" onClick={() => navigate('/wards')}>Back to All Wards</button>
        <p className="page-kicker">Ward Drill-Down</p>
        <h1>{ward.name}</h1>
        <p className="header-note">
          Use this profile to validate likely source drivers and plan interventions for this ward.
        </p>
      </header>

      <section className="overview-grid">
        <article className="overview-card details-animate">
          <p>Current AQI</p>
          <h2>{Math.round(ward.avg_AQI)}</h2>
          <span className={`band ${band.className}`}>{band.label}</span>
        </article>
        <article className="overview-card details-animate">
          <p>Dominant Source</p>
          <h2>{dominantSource}</h2>
          <span>Based on vehicular vs industrial contribution</span>
        </article>
        <article className="overview-card details-animate">
          <p>Nearest Station</p>
          <h2>{Number(ward.distance_km || 0).toFixed(1)} km</h2>
          <span>Distance to monitoring reference</span>
        </article>
      </section>

      <section className="details-grid">
        <article className="panel details-animate">
          <h3>Pollutant Snapshot</h3>
          <div className="stats-stack">
            <div><p>PM2.5</p><strong>{Math.round(ward.pm2_5)}</strong></div>
            <div><p>PM10</p><strong>{Math.round(ward.pm10)}</strong></div>
            <div><p>Traffic Raw Score</p><strong>{Math.round(ward.traffic_raw || 0)}</strong></div>
            <div><p>Industrial Sites</p><strong>{ward.industrial_count}</strong></div>
          </div>
        </article>

        <article className="panel details-animate">
          <h3>Source Contribution</h3>
          <div className="source-stack">
            <div className="source-line">
              <span>Vehicular</span>
              <div className="bar-track"><i className="bar-fill" data-width={`${normalized.vehicular}%`}></i></div>
              <em>{normalized.vehicular}%</em>
            </div>
            <div className="source-line">
              <span>Industrial</span>
              <div className="bar-track"><i className="bar-fill" data-width={`${normalized.industrial}%`}></i></div>
              <em>{normalized.industrial}%</em>
            </div>
            <div className="source-line">
              <span>Other</span>
              <div className="bar-track"><i className="bar-fill" data-width={`${normalized.other}%`}></i></div>
              <em>{normalized.other}%</em>
            </div>
          </div>
        </article>
      </section>

      <section className="panel details-animate">
        <h3>Recommended Intervention Sequence</h3>
        <div className="actions-stack">
          {actions.map((action) => (
            <p key={action}>{action}</p>
          ))}
        </div>
      </section>
    </div>
  );
};

export default WardDetails;
