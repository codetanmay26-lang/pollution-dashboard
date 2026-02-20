import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs/lib/anime.es.js';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const introTl = anime.timeline({ easing: 'easeOutExpo' });

    introTl
      .add({
        targets: '.hero-badge, .hero-title-line, .hero-sub, .hero-actions',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 900,
        delay: anime.stagger(130, { start: 180 })
      })
      .add(
        {
          targets: '.hero-panel',
          opacity: [0, 1],
          translateY: [40, 0],
          rotateX: [8, 0],
          duration: 1200
        },
        '-=700'
      )
      .add(
        {
          targets: '.hero-orb',
          scale: [0.6, 1],
          opacity: [0, 0.7],
          duration: 1000,
          delay: anime.stagger(180)
        },
        '-=900'
      );

    anime({
      targets: '.hero-orb.a',
      translateY: [0, -18],
      translateX: [0, 12],
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
      duration: 4500
    });

    anime({
      targets: '.hero-orb.b',
      translateY: [0, 22],
      translateX: [0, -10],
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
      duration: 5200
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          anime({
            targets: entry.target,
            opacity: [0, 1],
            translateY: [50, 0],
            duration: 950,
            easing: 'easeOutExpo'
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const el = entry.target;
        const target = Number(el.getAttribute('data-target') || 0);
        const suffix = el.getAttribute('data-suffix') || '';

        anime({
          targets: { value: 0 },
          value: target,
          round: 1,
          duration: 1400,
          easing: 'easeOutCubic',
          update: (anim) => {
            el.textContent = `${anim.animations[0].currentValue}${suffix}`;
          }
        });

        statObserver.unobserve(el);
      });
    }, { threshold: 0.4 });

    document.querySelectorAll('.stat-value[data-target]').forEach((el) => statObserver.observe(el));

    return () => {
      observer.disconnect();
      statObserver.disconnect();
      anime.remove('.hero-orb');
    };
  }, []);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-orb a"></div>
        <div className="hero-orb b"></div>
        <div className="hero-grid"></div>

        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Ward-level air intelligence for Delhi
            </div>

            <h1 className="hero-title">
              <span className="hero-title-line">Find the why behind</span>
              <span className="hero-title-line accent">every pollution spike.</span>
            </h1>

            <p className="hero-sub">
              DWLP maps AQI, hotspots, and source patterns across all 272 wards so policy teams can move from city-wide averages to localized action.
            </p>

            <div className="hero-actions">
              <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                Open Live Dashboard
              </button>
              <button
                className="btn-secondary"
                onClick={() => document.querySelector('.content')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Approach
              </button>
            </div>
          </div>

          <aside className="hero-panel">
            <p className="panel-kicker">Today at a glance</p>
            <div className="panel-card">
              <p>Wards above AQI 200</p>
              <h3>34</h3>
              <span>+5 since morning</span>
            </div>
            <div className="panel-card">
              <p>Most affected zone</p>
              <h3>Anand Vihar Cluster</h3>
              <span>Traffic + construction dominant</span>
            </div>
            <div className="panel-footnote">Updated continuously from station feeds and model inference.</div>
          </aside>
        </div>
      </section>

      <section className="stats reveal">
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-value" data-target="272">0</div>
            <div className="stat-label">Wards tracked</div>
          </div>
          <div className="stat">
            <div className="stat-value" data-target="38">0</div>
            <div className="stat-label">Live stations</div>
          </div>
          <div className="stat">
            <div className="stat-value" data-target="24" data-suffix="/7">0</div>
            <div className="stat-label">Monitoring cycle</div>
          </div>
          <div className="stat">
            <div className="stat-value" data-target="34">0</div>
            <div className="stat-label">Active alerts</div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="grid-2">
          <div className="card reveal">
            <div className="card-num">01</div>
            <h3>The Challenge</h3>
            <p>Delhi faces severe air pollution but city-wide averages hide critical ward-level hotspots. Without granular data, interventions remain reactive.</p>
            <ul>
              <li>Pollution varies drastically across neighborhoods</li>
              <li>Sources differ by administrative zone</li>
              <li>Delayed responses worsen health outcomes</li>
            </ul>
          </div>
          <div className="card reveal">
            <div className="card-num">02</div>
            <h3>Our Solution</h3>
            <p>AI-powered ward-level analysis identifies pollution sources, predicts trends, and generates targeted action plans for each zone.</p>
            <ul>
              <li>Real-time hyperlocal pollution mapping</li>
              <li>ML-driven source attribution</li>
              <li>Predictive early warning system</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="features">
        <h2 className="section-h2 reveal">Platform Capabilities</h2>
        <div className="grid-3">
          {[
            { title: 'Interactive Map', desc: 'Color-coded ward-level visualization' },
            { title: 'Trend Analysis', desc: '7-day predictive forecasting' },
            { title: 'Source Attribution', desc: 'Identify pollution contributors' },
            { title: 'Early Warnings', desc: 'Automated threshold alerts' },
            { title: 'Action Plans', desc: 'Evidence-based interventions' },
            { title: 'Public Access', desc: 'Transparent citizen dashboard' }
          ].map((f, i) => (
            <div key={i} className="feature reveal">
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta reveal">
        <h2 className="cta-h2">Ready to Transform Air Quality Management?</h2>
        <p className="cta-p">Access hyperlocal pollution intelligence for evidence-based policy decisions</p>
        <button className="btn-primary cta-btn" onClick={() => navigate('/dashboard')}>
          Access Dashboard
        </button>
      </section>
    </div>
  );
};

export default Home;
