import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CitizenReview.css';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const NEXT_STATUS = {
  submitted: 'reviewed',
  reviewed: 'action_planned',
  action_planned: 'action_in_progress',
  action_in_progress: 'resolved',
  resolved: 'resolved',
};

const formatTime = (value) => {
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

const CitizenReview = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [latestSync, setLatestSync] = useState(null);
  const [focusedTicketId, setFocusedTicketId] = useState('');

  const fetchReview = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '80' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (wardFilter.trim()) params.set('ward', wardFilter.trim());
      const response = await fetch(`${API_BASE}/api/citizen-signals/review?${params.toString()}`);
      if (!response.ok) throw new Error(`Review request failed (${response.status})`);
      const payload = await response.json();
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      setItems(rows);
      const sync = payload?.sync?.latestScan || null;
      setLatestSync(sync);
      if (sync?.ticketId) {
        setFocusedTicketId(sync.ticketId);
        setTimeout(() => {
          const element = document.getElementById(`ticket-${sync.ticketId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load review data.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, wardFilter]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchReview();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchReview]);

  const triggerAction = useCallback(async (row) => {
    if (!row?.ticketId || row.status === 'resolved') return;
    try {
      setUpdatingId(row.ticketId);
      const firstAction = row?.modelSolution?.recommendedActions?.[0] || 'Model action initiated.';
      const response = await fetch(`${API_BASE}/api/citizen-signals/${encodeURIComponent(row.ticketId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'action_in_progress',
          actor: 'government_review',
          note: `Action triggered: ${firstAction}`,
        }),
      });
      if (!response.ok) throw new Error(`Action update failed (${response.status})`);
      await fetchReview();
    } catch (err) {
      setError(err.message || 'Unable to start action.');
    } finally {
      setUpdatingId('');
    }
  }, [fetchReview]);

  const advanceStatus = useCallback(async (row) => {
    if (!row?.ticketId || row.status === 'resolved') return;
    const next = NEXT_STATUS[row.status] || 'reviewed';
    try {
      setUpdatingId(row.ticketId);
      const response = await fetch(`${API_BASE}/api/citizen-signals/${encodeURIComponent(row.ticketId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: next,
          actor: 'government_review',
          note: `Progressed to ${next.replaceAll('_', ' ')}`,
        }),
      });
      if (!response.ok) throw new Error(`Status update failed (${response.status})`);
      await fetchReview();
    } catch (err) {
      setError(err.message || 'Unable to advance status.');
    } finally {
      setUpdatingId('');
    }
  }, [fetchReview]);

  const wards = useMemo(() => {
    const values = new Set(items.map((item) => String(item.ward || '').trim()).filter(Boolean));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [items]);

  return (
    <div className="review-page">
      <header className="review-header">
        <div>
          <p className="review-kicker">Government Workflow</p>
          <h1>Ward Review Center</h1>
          <p>Current ward condition, citizen report, and model-generated action playbook in one place.</p>
        </div>
        <div className="review-actions">
          <button className="review-btn solid" onClick={fetchReview}>Refresh</button>
        </div>
      </header>

      <section className="review-filters">
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="action_planned">Action Planned</option>
            <option value="action_in_progress">Action In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label>
          Ward
          <select value={wardFilter} onChange={(event) => setWardFilter(event.target.value)}>
            <option value="">All wards</option>
            {wards.map((ward) => (
              <option key={ward} value={ward}>{ward}</option>
            ))}
          </select>
        </label>
      </section>

      {latestSync?.ticketId ? (
        <p className="sync-banner">
          Live Sync: QR scanned for {latestSync.ticketId} ({latestSync.ward}) at {formatTime(latestSync.lastScannedAt)}.
        </p>
      ) : null}

      {error ? <p className="review-error">{error}</p> : null}
      {loading ? <p className="review-loading">Loading review system...</p> : null}

      <section className="review-list">
        {items.map((row) => (
          <article
            className={`review-card ${focusedTicketId === row.ticketId ? 'live-focus' : ''}`}
            key={row.ticketId}
            id={`ticket-${row.ticketId}`}
          >
            <div className="review-row-top">
              <div>
                <strong>{row.ticketId}</strong>
                <p>{row.ward} · {row.signalType} · {row.severity}</p>
              </div>
              <span className={`review-status ${row.status}`}>{row.status.replaceAll('_', ' ')}</span>
            </div>

            <div className="review-grid">
              <div>
                <h3>Ward Status</h3>
                <p>AQI {row?.wardStatus?.currentAqi ?? '-'} ({row?.wardStatus?.band || '-'})</p>
                <p>24h forecast {row?.wardStatus?.forecast24 ?? '-'} ({row?.wardStatus?.delta24 ?? 0 >= 0 ? '+' : ''}{row?.wardStatus?.delta24 ?? 0})</p>
                <p>Trend {row?.wardStatus?.trendDirection || 'stable'} · Model {row?.wardStatus?.modelQuality || 'unavailable'}</p>
              </div>
              <div>
                <h3>Citizen Report</h3>
                <p>{row.note || 'No additional note provided.'}</p>
                <p>Submitted {formatTime(row.createdAt)}</p>
                <p>Mission scans {row.scanCount || 0}</p>
              </div>
              <div>
                <h3>Model Solution</h3>
                <p>{row?.modelSolution?.playbook || 'Mixed Local Mitigation'}</p>
                <p>Urgency {row?.modelSolution?.urgency || 'watch'} · Priority {row?.modelSolution?.priorityScore ?? 0}</p>
                <ul>
                  {(row?.modelSolution?.recommendedActions || []).slice(0, 3).map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="review-ops">
              <button
                className="review-btn solid"
                disabled={updatingId === row.ticketId || row.status === 'resolved'}
                onClick={() => triggerAction(row)}
              >
                {updatingId === row.ticketId ? 'Updating...' : row.status === 'resolved' ? 'Closed' : 'Take Action'}
              </button>
              <button
                className="review-btn ghost"
                disabled={updatingId === row.ticketId || row.status === 'resolved'}
                onClick={() => advanceStatus(row)}
              >
                {row.status === 'resolved' ? 'Closed' : 'Advance'}
              </button>
              <button className="review-btn ghost" onClick={() => navigate(`/ticket/${encodeURIComponent(row.ticketId)}`)}>Open Ticket</button>
            </div>
          </article>
        ))}

        {!loading && !items.length ? <p className="review-loading">No tickets match current filters.</p> : null}
      </section>
    </div>
  );
};

export default CitizenReview;
