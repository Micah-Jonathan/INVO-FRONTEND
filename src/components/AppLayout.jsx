// src/components/AppLayout.jsx
//
// This is the shared shell for every page AFTER login:
// sidebar on the left, page content on the right.
// Each real page (Dashboard, Clients, etc.) renders INSIDE this,
// via React Router's <Outlet />.

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { useTheme } from '../context/ThemeContext';
import './AppLayout.css';

export default function AppLayout() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { businesses, currentBusiness, switchBusiness, loading } = useBusiness();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleSwitch(businessId) {
    switchBusiness(businessId);
    setSwitcherOpen(false);
    setMobileMenuOpen(false);
    navigate('/dashboard');
  }

  // Closes the mobile drawer whenever a nav link is tapped,
  // so the user actually sees the page they navigated to.
  function handleNavClick() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button
          className="hamburger-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="logo">
          Invo<span>.</span>
        </div>
        <div style={{ width: 30 }} /> {/* spacer so the logo stays visually centered */}
      </div>

      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo-row">
          <div className="logo">
            Invo<span>.</span>
          </div>
          <div className="logo-row-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              className="close-menu-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="business-switcher">
          <button
            className="business-switcher-btn"
            onClick={() => setSwitcherOpen(!switcherOpen)}
            disabled={loading}
          >
            <span className="business-switcher-name">
              {loading ? 'Loading...' : currentBusiness?.business_name || 'No business'}
            </span>
            <span className="business-switcher-arrow">▾</span>
          </button>

          {switcherOpen && (
            <div className="business-switcher-menu">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  className={`business-switcher-item ${b.id === currentBusiness?.id ? 'active' : ''}`}
                  onClick={() => handleSwitch(b.id)}
                >
                  {b.business_name || 'Untitled business'}
                </button>
              ))}
              <div className="business-switcher-divider" />
              <button
                className="business-switcher-add"
                onClick={() => {
                  setSwitcherOpen(false);
                  navigate('/businesses/new');
                }}
              >
                + Add a business
              </button>
            </div>
          )}
        </div>

        <p className="nav-label">Main</p>
        <NavLink to="/dashboard" className="nav-item" onClick={handleNavClick}>
          Dashboard
        </NavLink>
        <NavLink to="/invoices" className="nav-item" onClick={handleNavClick}>
          Invoices
        </NavLink>
        <NavLink to="/clients" className="nav-item" onClick={handleNavClick}>
          Clients
        </NavLink>

        <div className="nav-divider" />

        <p className="nav-label">Account</p>
        <NavLink to="/settings" className="nav-item" onClick={handleNavClick}>
          Settings
        </NavLink>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {/* This is where each individual page actually renders */}
        <Outlet />
      </main>
    </div>
  );
}