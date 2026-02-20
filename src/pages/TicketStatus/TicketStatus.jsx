import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './TicketStatus.css';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : '');

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

const TicketStatus = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMission = async () => {
      try {
        setLoading(true);
        const missionResponse = await fetch(`${API_BASE}/api/citizen-signals/${encodeURIComponent(ticketId || '')}/mission`);
        if (!missionResponse.ok) throw new Error(`Mission request failed (${missionResponse.status})`);
        const response = await fetch(`${API_BASE}/api/citizen-signals/${encodeURIComponent(ticketId || '')}/scan?source=mission_qr`, {
          method: 'POST',
        });
        if (!response.ok) throw new Error(`Scan sync failed (${response.status})`);
        const payload = await missionResponse.json();
        setMission(payload || null);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load mission.');
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      fetchMission();
    }
  }, [ticketId]);

  const timeline = useMemo(() => {
    const events = Array.isArray(mission?.ticket?.events) ? mission.ticket.events : [];
    return [...events].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  }, [mission]);

  if (loading) {
    return <div className="ticket-page"><p>Loading ticket...</p></div>;
  }

  if (error || !mission?.ticket) {
    return (
      <div className="ticket-page">
        <h2>Mission unavailable</h2>
        <p>{error || 'No ticket found for this ID.'}</p>
        <button className="ticket-btn" onClick={() => navigate('/consumer')}>Back to Consumer Dashboard</button>
      </div>
    );
  }

  const ticket = mission.ticket;
  const wardStatus = mission.wardStatus || {};
  const modelSolution = mission.modelSolution || {};
  const impact = mission.impact || {};

  return (
    <div className="ticket-page">
      <div className="ticket-card ticket-hero">
        <p className="ticket-kicker">Live Ward Mission</p>
        <h1>{ticket.ticketId}</h1>
        <p>{ticket.ward} · {ticket.signalType} · {ticket.severity}</p>
        <div className="ticket-status-row">
          <span className={`ticket-status ${ticket.status}`}>{ticket.status}</span>
          <small>Synced {formatTimestamp(ticket.lastScannedAt || ticket.updatedAt)}</small>
        </div>
        <div className="impact-pill">Estimated AQI Reduction: {impact.estimatedAqiReduction ?? 0} points</div>
      </div>

      <div className="ticket-card mission-grid">
        <article className="mission-step step-1">
          <h2>Before</h2>
          <p>Current AQI: <strong>{wardStatus.currentAqi ?? '-'}</strong> ({wardStatus.band || '-'})</p>
          <p>Citizen report: {ticket.note || 'No additional note.'}</p>
        </article>
        <article className="mission-step step-2">
          <h2>Forecast</h2>
          <p>24h: <strong>{wardStatus.forecast24 ?? '-'}</strong> ({(wardStatus.delta24 ?? 0) >= 0 ? '+' : ''}{wardStatus.delta24 ?? 0})</p>
          <p>72h: <strong>{wardStatus.forecast72 ?? '-'}</strong> ({(wardStatus.delta72 ?? 0) >= 0 ? '+' : ''}{wardStatus.delta72 ?? 0})</p>
          <p>Model quality: {wardStatus.modelQuality || 'unavailable'}</p>
        </article>
        <article className="mission-step step-3">
          <h2>Model Action Plan</h2>
          <p>{modelSolution.playbook || 'Mixed Local Mitigation'}</p>
          <p>Urgency {modelSolution.urgency || 'watch'} · Priority {modelSolution.priorityScore ?? 0}</p>
          <ul>
            {(modelSolution.recommendedActions || []).slice(0, 3).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="ticket-card">
        <h2>Proof of Action Timeline</h2>
        <ul className="ticket-timeline">
          {timeline.map((event, index) => (
            <li key={`${event.timestamp}-${index}`}>
              <strong>{event.status}</strong>
              <p>{event.note || 'Status updated'}</p>
              <small>{event.actor} · {formatTimestamp(event.timestamp)}</small>
            </li>
          ))}
        </ul>
        <button className="ticket-btn" onClick={() => navigate('/consumer')}>Back to Consumer Dashboard</button>
      </div>
    </div>
  );
};

export default TicketStatus;
