import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './ConsumerOnboarding.css';

const API_BASE = import.meta.env.DEV ? 'https://delhi-pollution-2.onrender.com' : '';
const PROFILE_STORAGE_KEY = 'dwlp_consumer_profile';

const defaultForm = {
  ward: '',
  family_members: 3,
  elderly: false,
  children: false,
  respiratory_issues: false,
  daily_travel_minutes: 60,
  premium: false,
};

const ConsumerOnboarding = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [wardNames, setWardNames] = useState([]);
  const [loadingWards, setLoadingWards] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    anime({
      targets: '.onboard-reveal',
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 720,
      easing: 'easeOutExpo',
      delay: anime.stagger(95, { start: 120 }),
    });

    try {
      const existing = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore malformed cache and keep defaults.
    }

    const loadWards = async () => {
      try {
        setLoadingWards(true);
        const response = await fetch(`${API_BASE}/api/wards`);
        if (!response.ok) throw new Error(`Ward list request failed (${response.status})`);
        const payload = await response.json();
        const names = Array.from(
          new Set(
            (payload?.wards || [])
              .map((row) => String(row?.name || '').trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        setWardNames(names);
      } catch (err) {
        setError(err.message || 'Failed to load ward options.');
      } finally {
        setLoadingWards(false);
      }
    };

    loadWards();

    return () => anime.remove('.onboard-reveal');
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ward: String(form.ward || '').trim(),
      family_members: Math.max(1, Number(form.family_members || 1)),
      elderly: Boolean(form.elderly),
      children: Boolean(form.children),
      respiratory_issues: Boolean(form.respiratory_issues),
      daily_travel_minutes: Math.max(0, Number(form.daily_travel_minutes || 0)),
      premium: Boolean(form.premium),
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(payload));
    navigate('/consumer');
  };

  return (
    <div className="consumer-onboarding-page">
      <div className="onboard-glow a"></div>
      <div className="onboard-glow b"></div>

      <main className="consumer-onboarding-main">
        <header className="onboard-header onboard-reveal">
          <p className="onboard-kicker">Consumer App Setup</p>
          <h1>Build Your Family Exposure Profile</h1>
          <p>
            This profile powers personalized AQI risk scoring, health alerts, and cleaner route suggestions.
          </p>
          <div className="onboard-nav">
            <button className="onboard-btn-ghost" onClick={() => navigate('/')}>Portal</button>
            <button className="onboard-btn-ghost" onClick={() => navigate('/government')}>Government</button>
            <button className="onboard-btn-ghost" onClick={() => navigate('/consumer')}>Consumer Dashboard</button>
          </div>
        </header>

        <form className="onboard-form onboard-reveal" onSubmit={handleSubmit}>
          <label className="field">
            <span>Ward / Locality</span>
            <input
              list="consumer-ward-options"
              value={form.ward}
              onChange={(event) => updateField('ward', event.target.value)}
              placeholder={loadingWards ? 'Loading wards...' : 'Start typing your ward'}
              required
            />
            <datalist id="consumer-ward-options">
              {wardNames.map((ward) => (
                <option value={ward} key={ward} />
              ))}
            </datalist>
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Family Members</span>
              <input
                type="number"
                min="1"
                max="20"
                value={form.family_members}
                onChange={(event) => updateField('family_members', event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Daily Travel (minutes)</span>
              <input
                type="number"
                min="0"
                max="600"
                value={form.daily_travel_minutes}
                onChange={(event) => updateField('daily_travel_minutes', event.target.value)}
                required
              />
            </label>
          </div>

          <div className="toggle-grid">
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.children}
                onChange={(event) => updateField('children', event.target.checked)}
              />
              <span>Children in household</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.elderly}
                onChange={(event) => updateField('elderly', event.target.checked)}
              />
              <span>Elderly in household</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.respiratory_issues}
                onChange={(event) => updateField('respiratory_issues', event.target.checked)}
              />
              <span>Respiratory vulnerability</span>
            </label>
            <label className="toggle premium">
              <input
                type="checkbox"
                checked={form.premium}
                onChange={(event) => updateField('premium', event.target.checked)}
              />
              <span>Enable premium mode (SMS + route guidance)</span>
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="form-actions">
            <button type="submit" className="onboard-btn-primary">Save Profile and Continue</button>
            <button type="button" className="onboard-btn-ghost" onClick={() => navigate('/consumer')}>
              Skip for Now
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ConsumerOnboarding;
