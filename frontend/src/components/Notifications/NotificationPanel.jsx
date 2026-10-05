// src/components/Notifications/NotificationPanel.jsx
import { useState, useEffect } from 'react';
import { X, CheckCheck, Zap, AlertTriangle, Wifi, WifiOff, DollarSign } from 'lucide-react';
import api from '../../api';

const typeConfig = {
  high_power:      { icon: Zap,           color: 'var(--warning)', bg: 'var(--warning-bg)' },
  bill_exceeded:   { icon: DollarSign,    color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
  power_cut:       { icon: AlertTriangle, color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
  wifi_disconnected:{ icon: WifiOff,      color: 'var(--info)',    bg: 'var(--info-bg)'    },
  device_offline:  { icon: WifiOff,       color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
};

const timeAgo = (ts) => {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function NotificationPanel({ onClose, onRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/settings/notifications-list');
        if (data.success) setNotifications(data.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/settings/notifications-read');
      setNotifications(n => n.map(x => ({ ...x, is_read: 1 })));
      onRead?.();
    } catch { /* silent */ }
  };

  return (
    <div className="notif-panel">
      <div className="notif-header">
        <span className="notif-title">Notifications</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn btn-sm" onClick={markAllRead} title="Mark all read" style={{ width: 30, height: 30 }}>
            <CheckCheck size={14} />
          </button>
          <button className="icon-btn btn-sm" onClick={onClose} style={{ width: 30, height: 30 }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="notif-list">
        {loading ? (
          <div className="flex-center" style={{ padding: 32 }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex-center" style={{ padding: 32, flexDirection: 'column', gap: 8 }}>
            <CheckCheck size={32} color="var(--text-muted)" />
            <span className="text-muted text-sm">No notifications</span>
          </div>
        ) : notifications.map(notif => {
          const cfg = typeConfig[notif.type] || typeConfig.high_power;
          const Icon = cfg.icon;
          return (
            <div key={notif.id} className={`notif-item ${!notif.is_read ? 'unread' : ''}`}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: cfg.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={15} color={cfg.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="notif-text">{notif.message}</div>
                <div className="notif-time">{timeAgo(notif.created_at)}</div>
              </div>
              {!notif.is_read && (
                <span style={{ width: 7, height: 7, background: 'var(--primary)', borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
