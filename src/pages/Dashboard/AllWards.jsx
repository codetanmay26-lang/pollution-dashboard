import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './AllWards.css';

const API_BASE = import.meta.env.DEV ? 'https://delhi-pollution-2.onrender.com' : '';

const getAqiBand = (aqi) => {
  if (aqi > 300) return { label: 'Hazardous', className: 'hazardous', color: '#ef4444' };
  if (aqi > 200) return { label: 'Very Unhealthy', className: 'very-unhealthy', color: '#f97316' };
  if (aqi > 100) return { label: 'Unhealthy', className: 'unhealthy', color: '#f59e0b' };
  if (aqi > 50) return { label: 'Moderate', className: 'moderate', color: '#4ac9ff' };
  return { label: 'Good', className: 'good', color: '#90f4aa' };
};

const deriveSource = (ward) => {
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

const AllWards = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlightWard = params.get('ward') || '';

  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('aqi_desc');

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
      setError(err.message || 'Unable to fetch wards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const prepared = useMemo(() => {
    return wards.map((ward) => {
      const dominantSource = deriveSource(ward);
      const band = getAqiBand(Number(ward.avg_AQI || 0));
      return {
        ...ward,
        dominantSource,
        band,
        dominanceGap: Math.abs(Number(ward.vehicular_pct || 0) - Number(ward.industrial_pct || 0))
      };
    });
  }, [wards]);

  const filteredWards = useMemo(() => {
    let rows = prepared;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      rows = rows.filter((w) => (w.name || '').toLowerCase().includes(q));
    }
    if (sourceFilter !== 'all') {
      rows = rows.filter((w) => w.dominantSource.toLowerCase() === sourceFilter);
    }
    if (severityFilter !== 'all') {
      rows = rows.filter((w) => w.band.className === severityFilter);
    }
    const copy = [...rows];
    copy.sort((a, b) => {
      switch (sortBy) {
        case 'aqi_asc':
          return a.avg_AQI - b.avg_AQI;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'source_gap':
          return b.dominanceGap - a.dominanceGap;
        case 'station_distance':
          return a.distance_km - b.distance_km;
        default:
          return b.avg_AQI - a.avg_AQI;
      }
    });
    return copy;
  }, [prepared, searchTerm, sourceFilter, severityFilter, sortBy]);

  const summary = useMemo(() => {
    const total = prepared.length;
    const critical = prepared.filter((w) => w.avg_AQI > 200).length;
    const trafficDominant = prepared.filter((w) => w.dominantSource === 'Traffic').length;
    const industrialDominant = prepared.filter((w) => w.dominantSource === 'Industrial').length;
    return { total, critical, trafficDominant, industrialDominant };
  }, [prepared]);

  useEffect(() => {
    if (!loading) {
      anime({
        targets: '.ward-table-row',
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 360,
        easing: 'easeOutQuad',
        delay: anime.stagger(16, { start: 30 })
      });
    }
  }, [filteredWards, loading]);

  if (loading) {
    return (
      <div className="wards-loading">
        <div className="loading-ring"></div>
        <p>Loading ward dataset...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wards-loading">
        <h2>Unable to load ward data</h2>
        <p>{error}</p>
        <button className="btn-solid" onClick={fetchWards}>Retry</button>
      </div>
    );
  }

  return (
    <div className="all-wards-page">
      <header className="wards-header">
        <div>
          <p className="page-kicker">Delhi Ward Pollution Monitor</p>
          <h1>All Wards</h1>
          <p>
            Compare ward AQI and dominant source patterns, then open a ward profile for targeted action.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={() => navigate('/map')}>Map View</button>
          <button className="btn-ghost" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </header>

      <section className="summary-row">
        <article>
          <p>Total wards</p>
          <h3>{summary.total}</h3>
        </article>
        <article>
          <p>Wards above AQI 200</p>
          <h3>{summary.critical}</h3>
        </article>
        <article>
          <p>Traffic-dominant wards</p>
          <h3>{summary.trafficDominant}</h3>
        </article>
        <article>
          <p>Industrial-dominant wards</p>
          <h3>{summary.industrialDominant}</h3>
        </article>
      </section>

      <section className="filters-row">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search ward name"
        />
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">All source patterns</option>
          <option value="traffic">Traffic dominant</option>
          <option value="industrial">Industrial dominant</option>
          <option value="mixed">Mixed source</option>
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">All AQI bands</option>
          <option value="hazardous">Hazardous</option>
          <option value="very-unhealthy">Very Unhealthy</option>
          <option value="unhealthy">Unhealthy</option>
          <option value="moderate">Moderate</option>
          <option value="good">Good</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="aqi_desc">Sort: Highest AQI</option>
          <option value="aqi_asc">Sort: Lowest AQI</option>
          <option value="source_gap">Sort: Source dominance gap</option>
          <option value="station_distance">Sort: Nearest station</option>
          <option value="name">Sort: Name A-Z</option>
        </select>
      </section>

      <section className="wards-list-wrapper">
        <table className="wards-table">
          <thead>
            <tr>
              <th>Ward</th>
              <th>AQI</th>
              <th>Band</th>
              <th>PM2.5</th>
              <th>PM10</th>
              <th>Station</th>
              <th>Source Mix</th>
              <th>Industry</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredWards.map((ward) => {
              const highlighted = highlightWard.toLowerCase() === ward.name.toLowerCase();
              const normalized = normalizeContributions(ward.vehicular_pct, ward.industrial_pct);
              return (
                <tr
                  key={ward.name}
                  className={`ward-table-row ${highlighted ? 'highlighted' : ''}`}
                >
                  <td className="ward-cell-name">
                    <strong>{ward.name}</strong>
                    <small>{ward.dominantSource} dominant</small>
                  </td>
                  <td>
                    <span className={`aqi-chip ${ward.band.className}`}>
                      {Math.round(ward.avg_AQI)}
                    </span>
                  </td>
                  <td>{ward.band.label}</td>
                  <td>{Math.round(ward.pm2_5)}</td>
                  <td>{Math.round(ward.pm10)}</td>
                  <td>{Number(ward.distance_km || 0).toFixed(1)} km</td>
                  <td>
                    <div className="source-mini-bar">
                      <i className="veh" style={{ width: `${normalized.vehicular}%` }}></i>
                      <i className="ind" style={{ width: `${normalized.industrial}%` }}></i>
                      <i className="oth" style={{ width: `${normalized.other}%` }}></i>
                    </div>
                    <small className="source-mini-text">
                      V {normalized.vehicular}% | I {normalized.industrial}% | O {normalized.other}%
                    </small>
                  </td>
                  <td>{ward.industrial_count}</td>
                  <td className="ward-actions-cell">
                    <button
                      className="btn-solid small"
                      onClick={() => navigate(`/wards/${encodeURIComponent(ward.name)}`)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {!filteredWards.length && (
        <div className="no-results">
          <h3>No wards match this filter set.</h3>
          <p>Try removing a source/severity filter or broadening search text.</p>
        </div>
      )}
    </div>
  );
};

export default AllWards;
