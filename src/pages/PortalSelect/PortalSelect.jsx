import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './PortalSelect.css';

const PortalSelect = () => {
  const navigate = useNavigate();
  const [activePortal, setActivePortal] = useState('government');

  useEffect(() => {
    anime({
      targets: '.portal-reveal',
      opacity: [0, 1],
      translateY: [28, 0],
      duration: 820,
      easing: 'easeOutExpo',
      delay: anime.stagger(110, { start: 140 }),
    });

    anime({
      targets: '.portal-glow.a',
      translateY: [0, -16],
      translateX: [0, 10],
      direction: 'alternate',
      duration: 4600,
      loop: true,
      easing: 'easeInOutSine',
    });

    anime({
      targets: '.portal-glow.b',
      translateY: [0, 18],
      translateX: [0, -12],
      direction: 'alternate',
      duration: 5200,
      loop: true,
      easing: 'easeInOutSine',
    });

    return () => {
      anime.remove('.portal-reveal, .portal-glow');
    };
  }, []);

  return (
    <div className="portal-page">
      <div className="portal-glow a"></div>
      <div className="portal-glow b"></div>
      <div className="portal-grid"></div>

      <main className="portal-main">
        <header className="portal-head portal-reveal">
          <span className="portal-badge">Delhi Ward Pollution Monitor</span>
          <h1>Start Here</h1>
          <p>
            Pick one path. Government path is for city operations. Consumer path is for personal risk and health guidance.
          </p>
          <div className="portal-mode-switch" role="tablist" aria-label="Portal mode">
            <button className={`portal-mode-btn ${activePortal === 'government' ? 'active' : ''}`} onClick={() => setActivePortal('government')}>Government</button>
            <button className={`portal-mode-btn ${activePortal === 'consumer' ? 'active' : ''}`} onClick={() => setActivePortal('consumer')}>Consumer</button>
          </div>
        </header>

        <section className="portal-products">
          <article className={`portal-card portal-reveal gov ${activePortal === 'government' ? 'active' : ''}`} onMouseEnter={() => setActivePortal('government')}>
            <p className="card-kicker">Government Dashboard</p>
            <h2>City Operations View</h2>
            <ul>
              <li>See city AQI status and top risk wards first</li>
              <li>Open any alert and get ward-level action hints</li>
              <li>Use Weather, Predictive, Solutions for deeper analysis</li>
            </ul>
            <div className="card-price">Annual SaaS / MoU model</div>
            <button className="portal-btn-primary" onClick={() => navigate('/government')}>
              Enter Government Portal
            </button>
            <button className="portal-btn-ghost" onClick={() => navigate('/dashboard')}>
              Skip to Command Dashboard
            </button>
          </article>

          <article className={`portal-card portal-reveal consumer ${activePortal === 'consumer' ? 'active' : ''}`} onMouseEnter={() => setActivePortal('consumer')}>
            <p className="card-kicker">Consumer Freemium App</p>
            <h2>Personal Safety View</h2>
            <ul>
              <li>See your city/ward AQI and public alerts first</li>
              <li>Add your profile for personalized risk score</li>
              <li>Get cleaner travel routes and health actions</li>
            </ul>
            <div className="card-price">Premium: Rs 99-199 / month</div>
            <button className="portal-btn-primary" onClick={() => navigate('/consumer')}>
              Open Consumer Dashboard
            </button>
            <button className="portal-btn-ghost" onClick={() => navigate('/consumer/onboarding')}>
              Set Up Consumer Profile
            </button>
          </article>
        </section>

        <section className="portal-summary portal-reveal">
          <p>
            One platform with two focused experiences: government operations intelligence and consumer personal protection insights.
          </p>
          <div className="portal-demo-section">
            <p className="demo-label">Crisis Intervention</p>
            <button 
              className="portal-btn-showcase" 
              onClick={() => navigate('/omniqr')}
            >
              Open Crisis Command Portal
            </button>
            <p className="demo-hint">Generate QR code for mobile ward intervention sessions</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PortalSelect;
