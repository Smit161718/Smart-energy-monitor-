// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DeviceProvider } from './context/DeviceContext';

import Login          from './pages/Login';
import Register       from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import Dashboard      from './pages/Dashboard';
import History        from './pages/History';
import Reports        from './pages/Reports';
import Settings       from './pages/Settings';
import AppLayout      from './components/Layout/AppLayout';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="flex-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"          element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"       element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password"  element={<PublicRoute><ResetPassword /></PublicRoute>} />

      {/* Protected routes inside layout */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index            element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="history"   element={<History />} />
        <Route path="reports"   element={<Reports />} />
        <Route path="settings"  element={<Settings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DeviceProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DeviceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
