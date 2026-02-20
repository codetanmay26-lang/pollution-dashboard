import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './Solutions.css';

const API_BASE = import.meta.env.DEV ? 'https://delhi-pollution-2.onrender.com' : '';

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

const toTitleCase = (value) => {
  return String(value || '')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const urgencyClass = (urgency) => {
  if (urgency === 'critical') return 'critical';
  if (urgency === 'high') return 'high';
  if (urgency === 'moderate') return 'moderate';
  return 'watch';
};

const Solutions = () => {
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [playbookFilter, setPlaybookFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority_desc');
  const [selectedWard, setSelectedWard] = useState('');

  const fetchSolutions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/analytics/solutions`);
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const data = await response.json();
      setPayload(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load policy solutions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSolutions();
  }, [fetchSolutions]);

  useEffect(() => {
    if (!payload) return;
    anime({
      targets: '.sol-reveal',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      easing: 'easeOutExpo',
      delay: anime.stagger(45),
    });
  }, [payload]);

  const model = payload?.model || {};
  const metadata = payload?.metadata || {};
  const citySummary = Array.isArray(payload?.cityPlaybookSummary) ? payload.cityPlaybookSummary : [];
  const topImmediate = Array.isArray(payload?.topImmediateActions) ? payload.topImmediateActions : [];
  const recommendations = useMemo(() => (
    Array.isArray(payload?.wardRecommendations) ? payload.wardRecommendations : []
  ), [payload]);

  const playbookOptions = useMemo(() => {
    const unique = [...new Set(recommendations.map((row) => row.playbook).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [recommendations]);

  const filteredRows = useMemo(() => {
    let rows = recommendations;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((row) => String(row.ward || '').toLowerCase().includes(q));
    }
    if (playbookFilter !== 'all') {
      rows = rows.filter((row) => row.playbook === playbookFilter);
    }
    if (urgencyFilter !== 'all') {
      rows = rows.filter((row) => row.urgency === urgencyFilter);
    }

    const copy = [...rows];
    copy.sort((a, b) => {
      switch (sortBy) {
        case 'priority_asc':
          return Number(a.priorityScore || 0) - Number(b.priorityScore || 0);
        case 'aqi_desc':
          return Number(b.aqi || 0) - Number(a.aqi || 0);
        case 'delta72_desc':
          return Number(b.delta72 || 0) - Number(a.delta72 || 0);
        case 'name':
          return String(a.ward || '').localeCompare(String(b.ward || ''));
        default:
          return Number(b.priorityScore || 0) - Number(a.priorityScore || 0);
      }
    });
    return copy;
  }, [recommendations, search, playbookFilter, urgencyFilter, sortBy]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedWard('');
      return;
    }
    const exists = filteredRows.some((row) => row.ward === selectedWard);
    if (!exists) {
      setSelectedWard(filteredRows[0].ward);
    }
  }, [filteredRows, selectedWard]);

  const selected = useMemo(() => {
    return filteredRows.find((row) => row.ward === selectedWard) || null;
  }, [filteredRows, selectedWard]);

  if (loading && !payload) {
    return (
      <div className="solutions-loading">
        <div className="loading-ring"></div>
        <p>Loading solution engine...</p>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="solutions-loading">
        <h2>Unable to load solutions</h2>
        <p>{error}</p>
        <button className="btn-solid" onClick={fetchSolutions}>Retry</button>
      </div>
    );
  }

  return (
    <div className="solutions-page">
      <header className="solutions-header sol-reveal">
        <div>
          <p className="page-kicker">Delhi Ward Pollution Monitor</p>
          <h1>Policy Solutions Engine</h1>
          <p>
            ML-driven ward recommendations combining AQI forecast, weather impact, and source attribution.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn-ghost" onClick={() => navigate('/weather-correlation')}>Weather</button>
          <button className="btn-ghost" onClick={() => navigate('/predictive-aqi')}>Predictive</button>
          <button className="btn-solid" onClick={() => navigate('/map')}>Map</button>
        </div>
      </header>

      <section className="model-overview sol-reveal">
        <article>
          <p>Model</p>
          <h3>{toTitleCase(model.type)}</h3>
          <span>{model.clusters || 0} clusters</span>
        </article>
        <article>
          <p>Training Rows</p>
          <h3>{model.trainingRows || 0}</h3>
          <span>{model.featureCount || 0} features</span>
        </article>
        <article>
          <p>Ward Recommendations</p>
          <h3>{metadata.wardCount || recommendations.length || 0}</h3>
          <span>Live inference</span>
        </article>
        <article>
          <p>Last Updated</p>
          <h3>{formatDateTime(metadata.lastUpdated || model.generatedAt)}</h3>
          <span>Auto refresh capable</span>
        </article>
      </section>

      <section className="playbook-summary sol-reveal">
        {citySummary.map((row) => (
          <article key={row.playbook}>
            <h3>{row.playbook}</h3>
            <p>{row.wards} wards | Avg priority {row.avgPriority}</p>
            <small>Top ward: {row.topWard}</small>
          </article>
        ))}
      </section>

      <section className="immediate-actions sol-reveal">
        <div className="section-head">
          <h2>Top Immediate Actions</h2>
          <p>{topImmediate.length} queued interventions</p>
        </div>
        <div className="actions-list">
          {topImmediate.slice(0, 10).map((row) => (
            <article key={`${row.ward}-${row.playbook}`} className={`action-item ${urgencyClass(row.urgency)}`}>
              <div>
                <h4>{row.ward}</h4>
                <p>{row.playbook}</p>
              </div>
              <span className="priority-pill">{row.priorityScore}</span>
              <small>{row.primaryAction}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="solutions-main sol-reveal">
        <article className="solutions-table-panel">
          <div className="table-controls">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ward"
            />
            <select value={playbookFilter} onChange={(event) => setPlaybookFilter(event.target.value)}>
              <option value="all">All playbooks</option>
              {playbookOptions.map((playbook) => (
                <option key={playbook} value={playbook}>{playbook}</option>
              ))}
            </select>
            <select value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value)}>
              <option value="all">All urgency</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
              <option value="watch">Watch</option>
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="priority_desc">Sort: Priority high-low</option>
              <option value="priority_asc">Sort: Priority low-high</option>
              <option value="aqi_desc">Sort: AQI high-low</option>
              <option value="delta72_desc">Sort: Delta72 high-low</option>
              <option value="name">Sort: Name A-Z</option>
            </select>
          </div>

          <div className="table-wrap">
            <table className="solutions-table">
              <thead>
                <tr>
                  <th>Ward</th>
                  <th>Priority</th>
                  <th>Playbook</th>
                  <th>AQI</th>
                  <th>+24h</th>
                  <th>+72h</th>
                  <th>Source</th>
                  <th>Weather Driver</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={`${row.ward}-${row.clusterId}`}
                    className={`solution-row ${selected?.ward === row.ward ? 'active' : ''}`}
                    onClick={() => setSelectedWard(row.ward)}
                  >
                    <td>{row.ward}</td>
                    <td>
                      <span className={`priority-tag ${urgencyClass(row.urgency)}`}>
                        {row.priorityScore}
                      </span>
                    </td>
                    <td>{row.playbook}</td>
                    <td>{row.aqi}</td>
                    <td>{row.forecast24} ({row.delta24 > 0 ? `+${row.delta24}` : row.delta24})</td>
                    <td>{row.forecast72} ({row.delta72 > 0 ? `+${row.delta72}` : row.delta72})</td>
                    <td>{row.dominantSource}</td>
                    <td>{row.weatherDriver}</td>
                    <td>
                      <button
                        className="btn-ghost small"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/wards/${encodeURIComponent(row.ward)}`);
                        }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="solution-detail-panel">
          {selected ? (
            <>
              <h2>{selected.ward}</h2>
              <p className="detail-sub">{selected.playbook} | Priority {selected.priorityScore}</p>
              <div className="detail-metrics">
                <div><span>Current AQI</span><strong>{selected.aqi}</strong></div>
                <div><span>Forecast +24h</span><strong>{selected.forecast24}</strong></div>
                <div><span>Forecast +72h</span><strong>{selected.forecast72}</strong></div>
                <div><span>Weather Driver</span><strong>{selected.weatherDriver}</strong></div>
              </div>
              <div className="actions-checklist">
                <h3>Recommended Actions</h3>
                {(selected.recommendedActions || []).map((action) => (
                  <p key={action}>{action}</p>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-note">Select a ward row to inspect full solution actions.</p>
          )}
        </aside>
      </section>
    </div>
  );
};

export default Solutions;
