import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { systemAPI, notificationsAPI } from '../services/api';
import { 
  MdMenu, 
  MdNotifications, 
  MdWifi, 
  MdRouter, 
  MdStorage, 
  MdPower, 
  MdDns,
  MdBrightness4,
  MdBrightness7
} from 'react-icons/md';
import { useSettings } from '../context/SettingsContext';
import './Navbar.css';

const Navbar = ({ toggleSidebar }) => {
  const { logout } = useAuth();
  const { settings, toggleTheme } = useSettings();
  const navigate = useNavigate();
  
  // Real-time clock state
  const [time, setTime] = useState(new Date());
  
  // System status state
  const [status, setStatus] = useState({
    serverRunning: false,
    databaseConnected: false,
    deviceOnline: false,
    wifiConnected: false,
  });

  // Notification count state
  const [notificationCount, setNotificationCount] = useState(0);

  // Live Clock Updater
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // System Status & Notification Count Poller
  useEffect(() => {
    const fetchStatusAndNotifications = async () => {
      try {
        // Fetch System Health Status
        const statusData = await systemAPI.getStatus();
        setStatus({
          serverRunning: statusData.serverRunning,
          databaseConnected: statusData.databaseConnected,
          deviceOnline: statusData.deviceOnline,
          wifiConnected: statusData.wifiConnected
        });
      } catch (err) {
        setStatus({
          serverRunning: false,
          databaseConnected: false,
          deviceOnline: false,
          wifiConnected: false
        });
      }

      try {
        // Fetch Unread Alerts count
        const alerts = await notificationsAPI.getAll();
        const unreadCount = alerts.filter(n => !n.is_read).length;
        setNotificationCount(unreadCount);
      } catch (err) {
        console.error('Failed to update unread notifications count:', err.message);
      }
    };

    fetchStatusAndNotifications();
    const poller = setInterval(fetchStatusAndNotifications, 5000); // refresh every 5s

    return () => clearInterval(poller);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar glass-panel">
      <div className="navbar-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <MdMenu />
        </button>
        <span className="navbar-title">Smart Energy Monitoring</span>
      </div>

      <div className="navbar-right">
        {/* Live status indicators */}
        <div className="status-indicators">
          {/* Server status */}
          <div className="status-item" title={status.serverRunning ? "API Server Online" : "API Server Offline"}>
            <span className={`indicator-dot ${status.serverRunning ? 'online' : 'offline'}`}></span>
            <MdDns className="status-icon" />
            <span className="status-label">Server</span>
          </div>

          {/* DB status */}
          <div className="status-item" title={status.databaseConnected ? "Database Connected" : "Database Offline"}>
            <span className={`indicator-dot ${status.databaseConnected ? 'online' : 'offline'}`}></span>
            <MdStorage className="status-icon" />
            <span className="status-label">DB</span>
          </div>

          {/* Wi-Fi status */}
          <div className="status-item" title={status.wifiConnected ? "ESP32 Wi-Fi Connected" : "ESP32 Wi-Fi Disconnected"}>
            <span className={`indicator-dot ${status.wifiConnected ? 'online' : 'offline'}`}></span>
            <MdWifi className="status-icon" />
            <span className="status-label">Wi-Fi</span>
          </div>

          {/* ESP32 Online status */}
          <div className="status-item" title={status.deviceOnline ? "ESP32 Energy Meter Online" : "ESP32 Energy Meter Offline"}>
            <span className={`indicator-dot ${status.deviceOnline ? 'online' : 'offline'}`}></span>
            <MdPower className="status-icon" />
            <span className="status-label">Meter</span>
          </div>
        </div>

        {/* Live Clock */}
        <div className="live-clock">
          <span className="clock-date">{formatDate(time)}</span>
          <span className="clock-time">{formatTime(time)}</span>
        </div>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
          {settings.theme === 'dark' ? <MdBrightness7 /> : <MdBrightness4 />}
        </button>

        {/* Notifications Icon with Badge */}
        <div className="nav-notification" onClick={() => navigate('/notifications')} title="Notifications">
          <MdNotifications className="notif-bell" />
          {notificationCount > 0 && (
            <span className="notif-badge">{notificationCount}</span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
