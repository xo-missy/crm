import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaChartPie, FaUsers, FaHandshake, FaTicketAlt, FaCog, FaAngleLeft, FaAngleRight, FaBuilding } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FaBuilding className="sidebar-item-icon" style={{ color: '#60a5fa' }} />
          <span className="sidebar-logo-text">TenantCRM</span>
        </div>
        <button 
          onClick={toggleSidebar} 
          className="sidebar-toggle-btn"
          id="sidebar-collapse-toggle"
          aria-label="Toggle Sidebar"
        >
          {isOpen ? <FaAngleLeft /> : <FaAngleRight />}
        </button>
      </div>

      <nav style={{ flex: 1 }}>
        <ul className="sidebar-menu">
          <li>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              id="sidebar-nav-dashboard"
            >
              <FaChartPie className="sidebar-item-icon" />
              <span className="sidebar-item-text">Dashboard</span>
            </NavLink>
          </li>

          <li>
            <NavLink 
              to="/contacts" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              id="sidebar-nav-contacts"
            >
              <FaUsers className="sidebar-item-icon" />
              <span className="sidebar-item-text">Contacts</span>
            </NavLink>
          </li>

          {/* Role restricted: Admin or Sales Rep */}
          {(user.role === 'Admin' || user.role === 'Sales Rep') && (
            <li>
              <NavLink 
                to="/pipeline" 
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                id="sidebar-nav-pipeline"
              >
                <FaHandshake className="sidebar-item-icon" />
                <span className="sidebar-item-text">Sales Pipeline</span>
              </NavLink>
            </li>
          )}

          {/* Role restricted: Admin or Support Agent */}
          {(user.role === 'Admin' || user.role === 'Support Agent') && (
            <li>
              <NavLink 
                to="/tickets" 
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                id="sidebar-nav-tickets"
              >
                <FaTicketAlt className="sidebar-item-icon" />
                <span className="sidebar-item-text">Support Tickets</span>
              </NavLink>
            </li>
          )}

          {/* Role restricted: Admin Only */}
          {user.role === 'Admin' && (
            <li>
              <NavLink 
                to="/settings" 
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                id="sidebar-nav-settings"
              >
                <FaCog className="sidebar-item-icon" />
                <span className="sidebar-item-text">Settings & Team</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0 1rem' }}>
          Role: <span style={{ color: '#fff', fontWeight: 600 }}>{user.role}</span>
        </div>
      </div>
    </aside>
  );
}
