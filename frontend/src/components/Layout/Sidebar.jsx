// src/components/Layout/Sidebar.jsx
import Logo from '../Logo';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, History, BarChart2,
  Settings, LogOut, Wifi, WifiOff, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history',   icon: History,         label: 'History' },
  { to: '/reports',   icon: BarChart2,        label: 'Reports' },
  { to: '/settings',  icon: Settings,         label: 'Settings' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const { deviceStatus } = useDevice();  // always reflects true live state
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const statusConfig = {
    online:    { dot: 'online',    label: 'Device Online',    Icon: Wifi },
    offline:   { dot: 'offline',   label: 'Device Offline',   Icon: WifiOff },
    power_cut: { dot: 'power-cut', label: 'Power Cut!',       Icon: AlertTriangle },
  };
  const status = statusConfig[deviceStatus] || statusConfig.offline;

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Logo size={36} />
        <div>
          <div className="sidebar-logo-text" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0099FF, #84CC16)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PowerMeter</div>
          <div className="sidebar-logo-sub" style={{ fontSize: 10, letterSpacing: '0.05em' }}>IoT Dashboard</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="nav-section-label">Main Menu</span>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        <span className="nav-section-label" style={{ marginTop: 8 }}>Account</span>
        <button
          className="nav-item"
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'rgba(239,68,68,0.7)' }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </nav>

      {/* Footer: Device Status + User Info */}
      <div className="sidebar-footer">
        <div className="device-status-badge">
          <span className={`status-dot ${status.dot}`} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
              {status.label}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>ESP32 PZEM-004T</div>
          </div>
        </div>

        {user && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
