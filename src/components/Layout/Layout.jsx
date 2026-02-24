import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import './Layout.css';

const Layout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Determine which portal we're in for conditional nav display
  const isConsumerPortal = location.pathname.startsWith('/consumer') || 
                           location.pathname.startsWith('/ticket');
  const isGovernmentPortal = !isConsumerPortal && location.pathname !== '/';

  // Close mobile menu when route changes
  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  // Don't show nav on portal select page
  if (location.pathname === '/') {
    return <Outlet />;
  }

  return (
    <div className="layout-wrapper">
      {isGovernmentPortal && (
        <nav className="global-nav">
          <Link to="/" className="nav-brand">
            <span className="nav-logo">DWLP</span>
            <span className="nav-subtitle">Delhi Ward Pollution Monitor</span>
          </Link>
          
          {/* Hamburger button for mobile */}
          <button 
            className="nav-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}>
              {mobileMenuOpen ? '✕' : '☰'}
            </span>
          </button>
          
          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Dashboard
            </NavLink>
            <NavLink 
              to="/citizen-review" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Ward Review
            </NavLink>
            <NavLink 
              to="/weather-correlation" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Weather
            </NavLink>
            <NavLink 
              to="/predictive-aqi" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Predictive
            </NavLink>
            <NavLink 
              to="/solutions" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Solutions
            </NavLink>
            <NavLink 
              to="/map" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Map
            </NavLink>
            <NavLink 
              to="/fire-intel" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Fire Intel
            </NavLink>
            <NavLink 
              to="/wards" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-solid nav-btn-active' : 'nav-btn nav-btn-solid'}
              onClick={handleNavClick}
            >
              All Wards
            </NavLink>
          </div>
          <div className="nav-portal-switch">
            <NavLink to="/" className="nav-btn nav-btn-ghost" onClick={handleNavClick}>Portal</NavLink>
          </div>
        </nav>
      )}
      
      {isConsumerPortal && (
        <nav className="global-nav consumer-nav">
          <Link to="/" className="nav-brand">
            <span className="nav-logo">DWLP</span>
            <span className="nav-subtitle">Consumer Portal</span>
          </Link>
          
          {/* Hamburger button for mobile */}
          <button 
            className="nav-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}>
              {mobileMenuOpen ? '✕' : '☰'}
            </span>
          </button>
          
          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <NavLink 
              to="/consumer" 
              end
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Dashboard
            </NavLink>
            <NavLink 
              to="/consumer/onboarding" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Edit Profile
            </NavLink>
            <NavLink 
              to="/map" 
              className={({ isActive }) => isActive ? 'nav-btn nav-btn-active' : 'nav-btn'}
              onClick={handleNavClick}
            >
              Map
            </NavLink>
          </div>
          <div className="nav-portal-switch">
            <NavLink to="/" className="nav-btn nav-btn-ghost" onClick={handleNavClick}>Portal</NavLink>
          </div>
        </nav>
      )}
      
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
