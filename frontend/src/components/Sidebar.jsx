import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  MdDashboard, 
  MdTimeline, 
  MdAssessment, 
  MdNotifications, 
  MdSettings, 
  MdAccountCircle, 
  MdExitToApp 
} from 'react-icons/md';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <MdDashboard /> },
    { name: 'Analytics', path: '/analytics', icon: <MdTimeline /> },
    { name: 'Reports', path: '/reports', icon: <MdAssessment /> },
    { name: 'Notifications', path: '/notifications', icon: <MdNotifications /> },
    { name: 'Settings', path: '/settings', icon: <MdSettings /> },
    { name: 'Profile', path: '/profile', icon: <MdAccountCircle /> },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      
      <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-glow">⚡</div>
          <h2>Smart Energy</h2>
        </div>

        <nav className="sidebar-menu">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `sidebar-item ${isActive ? 'active' : ''}`
              }
              onClick={() => {
                if (window.innerWidth <= 768) {
                  toggleSidebar();
                }
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-profile-card">
              <div className="profile-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <h4>{user.name}</h4>
                <p>{user.email}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <span className="sidebar-icon"><MdExitToApp /></span>
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
