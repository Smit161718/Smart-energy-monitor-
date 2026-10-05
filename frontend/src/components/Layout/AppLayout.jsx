// src/components/Layout/AppLayout.jsx
// Persistent layout with sidebar + navbar wrapped around page content

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onMenuClick={() => setSidebarOpen(o => !o)} />
        <div className="page-container">
          <Outlet />
        </div>
      </div>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: window.innerWidth <= 768 ? 'block' : 'none' }}
        />
      )}
    </div>
  );
}
