// src/components/Layout/Navbar.jsx
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import NotificationPanel from '../Notifications/NotificationPanel';
import api from '../../api';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/history':   'History',
  '/reports':   'Reports',
  '/settings':  'Settings',
};

export default function Navbar({ onMenuClick }) {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [showNotif, setShowNotif]     = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const title = pageTitles[location.pathname] || 'Dashboard';

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/settings/notifications-list');
        if (data.success) setUnreadCount(data.unread || 0);
      } catch { /* silent */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="navbar">
      <div className="flex gap-12" style={{ alignItems: 'center' }}>
        <button id="sidebar-menu-btn" className="icon-btn" onClick={onMenuClick} title="Toggle Sidebar">
          <Menu size={20} />
        </button>
        <h1 className="navbar-title">{title}</h1>
      </div>

      <div className="navbar-actions">
        {/* Theme toggle */}
        <button id="theme-toggle-btn" className="icon-btn" onClick={toggleTheme} title="Toggle Dark Mode">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            id="notifications-btn"
            className="icon-btn"
            onClick={() => setShowNotif(v => !v)}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 16, height: 16,
                background: 'var(--danger)',
                color: '#fff',
                borderRadius: '50%',
                fontSize: 9,
                fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <NotificationPanel
              onClose={() => setShowNotif(false)}
              onRead={() => setUnreadCount(0)}
            />
          )}
        </div>

        {/* Avatar */}
        <div className="avatar-btn" title={user?.name}>
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}
