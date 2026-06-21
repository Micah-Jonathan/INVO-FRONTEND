// src/components/AppLayout.jsx
//
// This is the shared shell for every page AFTER login:
// sidebar on the left, page content on the right.
// Each real page (Dashboard, Clients, etc.) renders INSIDE this,
// via React Router's <Outlet />.

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AppLayout.css';

export default function AppLayout() {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          Invo<span>.</span>
        </div>

        <p className="nav-label">Main</p>
        <NavLink to="/dashboard" className="nav-item">
          Dashboard
        </NavLink>
        <NavLink to="/invoices" className="nav-item">
          Invoices
        </NavLink>
        <NavLink to="/clients" className="nav-item">
          Clients
        </NavLink>

        <div className="nav-divider" />

        <p className="nav-label">Account</p>
        <NavLink to="/settings" className="nav-item">
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