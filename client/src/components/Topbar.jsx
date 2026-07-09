import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FaBell, FaBars, FaSignOutAlt, FaCog, FaCheck } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext.jsx';

export default function Topbar({ toggleSidebar }) {
  const { user, logout, notifications, markNotificationRead, markAllNotificationsRead, currency, setCurrency } = useAuth();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const notifDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // Determine page title based on path
  function getPageTitle() {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard Analytics';
    if (path.includes('/contacts')) return 'Contact Management';
    if (path.includes('/pipeline')) return 'Sales Pipeline';
    if (path.includes('/tickets')) return 'Support Tickets';
    if (path.includes('/settings')) return 'Company Settings';
    return 'CRM Portal';
  }

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  // Toggle dropdowns
  function toggleNotifDropdown() {
    setShowNotifications(prev => !prev);
    setShowProfileMenu(false);
  }

  function toggleProfileDropdown() {
    setShowProfileMenu(prev => !prev);
    setShowNotifications(false);
  }

  // Close dropdowns on outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  // Format date helper
  function formatNotifDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={toggleSidebar} 
          className="sidebar-toggle-btn" 
          style={{ display: 'block' }}
          id="topbar-sidebar-toggle"
          aria-label="Toggle Navigation Sidebar"
        >
          <FaBars />
        </button>
        <h1 className="topbar-title">{getPageTitle()}</h1>
      </div>

      <div className="topbar-actions">
        {/* Currency Selector Switcher */}
        <div className="flex-center" style={{ gap: '0.25rem' }}>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="form-control"
            style={{
              width: '90px',
              padding: '0.375rem 0.5rem',
              fontSize: '0.775rem',
              height: 'auto',
              border: '1px solid #cbd5e1',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              backgroundColor: '#fff',
              color: '#334155',
              fontWeight: 600,
            }}
            id="currency-selector"
            aria-label="Select currency mode"
          >
            <option value="NGN">₦ NGN</option>
            <option value="USD">$ USD</option>
          </select>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="notification-bell-container" ref={notifDropdownRef}>
          <button 
            onClick={toggleNotifDropdown} 
            className="notification-bell"
            id="topbar-notification-bell"
            aria-label="Open Notifications"
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllNotificationsRead}
                    id="btn-mark-all-read"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <ul className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">No notifications yet.</div>
                ) : (
                  notifications.map(notif => (
                    <li 
                      key={notif._id} 
                      className={`notification-item ${!notif.read ? 'unread' : ''}`}
                      onClick={() => !notif.read && markNotificationRead(notif._id)}
                    >
                      <div className="notification-item-title">{notif.title}</div>
                      <div className="notification-item-desc">{notif.message}</div>
                      <div className="notification-item-time">{formatNotifDate(notif.createdAt)}</div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Profile Menu Dropdown */}
        <div className="profile-menu-container" ref={profileDropdownRef}>
          <button 
            onClick={toggleProfileDropdown} 
            className="profile-trigger"
            id="topbar-profile-trigger"
          >
            <div className="profile-avatar">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="profile-info">
              <div className="profile-name">{user.name}</div>
              <div className="profile-role">{user.role}</div>
            </div>
          </button>
          
          {showProfileMenu && (
            <div className="profile-dropdown">
              {user.role === 'Admin' && (
                <Link 
                  to="/settings" 
                  className="profile-dropdown-item" 
                  onClick={() => setShowProfileMenu(false)}
                  id="profile-menu-settings"
                >
                  <FaCog />
                  <span>Settings</span>
                </Link>
              )}
              <div 
                className="profile-dropdown-item" 
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                id="profile-menu-logout"
              >
                <FaSignOutAlt />
                <span>Log Out</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
