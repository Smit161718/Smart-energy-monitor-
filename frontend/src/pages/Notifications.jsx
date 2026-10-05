import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';
import { 
  MdNotifications, 
  MdDeleteSweep, 
  MdCheck, 
  MdInfo, 
  MdWarning, 
  MdError 
} from 'react-icons/md';
import './Notifications.css';

const Notifications = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await notificationsAPI.getAll();
      setAlerts(data);
    } catch (e) {
      console.error('Failed to load notifications:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      // Update local state to show it is read
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a));
    } catch (e) {
      console.error('Failed to mark read:', e.message);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all alert notifications? This cannot be undone.')) {
      try {
        await notificationsAPI.clearAll();
        setAlerts([]);
      } catch (e) {
        console.error('Failed to clear alerts:', e.message);
      }
    }
  };

  const getAlertIcon = (type) => {
    if (type === 'CRITICAL') return <MdError className="alert-type-icon critical" />;
    if (type === 'WARNING') return <MdWarning className="alert-type-icon warning" />;
    return <MdInfo className="alert-type-icon info" />;
  };

  return (
    <div className="notifications-container">
      {/* Header */}
      <div className="notifications-header glass-panel">
        <div className="header-title">
          <MdNotifications className="header-icon" />
          <div>
            <h2>System Notifications</h2>
            <p>Monitor real-time system logs and telemetry alerts</p>
          </div>
        </div>
        {alerts.length > 0 && (
          <button onClick={handleClearAll} className="btn-clear-all" title="Delete All Alerts">
            <MdDeleteSweep className="btn-clear-icon" /> Clear Logs
          </button>
        )}
      </div>

      {loading ? (
        <div className="notifications-loading">
          <div className="loader"></div>
          <p>Analyzing telemetry logs...</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert) => (
            <div 
              className={`alert-item glass-panel ${alert.is_read ? 'read' : 'unread'} ${alert.type.toLowerCase()}`}
              key={alert.id}
            >
              <div className="alert-body">
                {getAlertIcon(alert.type)}
                <div className="alert-msg-wrapper">
                  <p className="alert-message">{alert.message}</p>
                  <span className="alert-timestamp">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {!alert.is_read && (
                <button 
                  onClick={() => handleMarkAsRead(alert.id)} 
                  className="btn-mark-read" 
                  title="Mark as Read"
                >
                  <MdCheck />
                </button>
              )}
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="no-alerts-panel glass-panel">
              <MdNotifications className="empty-bell" />
              <h3>All clear!</h3>
              <p>No new system alerts or threshold warnings reported.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
