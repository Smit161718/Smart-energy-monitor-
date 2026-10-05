import Logo from '../components/Logo';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Activity, BarChart2, Wifi } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const features = [
  { icon: Activity,  text: 'Real-time power monitoring every 5 seconds' },
  { icon: BarChart2, text: 'Daily, weekly & monthly energy reports' },
  { icon: Wifi,      text: 'Live ESP32 + PZEM-004T integration' },
];

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (data.success) {
        login(data.token, data.user);
        navigate('/dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-hero">
          <div style={{ marginBottom: 16 }}>
            <Logo size={64} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #0099FF, #84CC16)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PowerMeter</h1>
          <p>IoT-powered electricity monitoring with real-time ESP32 + PZEM-004T integration and live bill estimation.</p>
          <div className="auth-features">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="auth-feature-item">
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} color="#60A5FA" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-title">Welcome back 👋</div>
            <div className="auth-card-sub">Sign in to your monitoring dashboard</div>
          </div>

          {error && (
            <div className="alert alert-danger mb-16" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-wrapper has-right">
                <Lock size={16} className="input-icon" />
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="input-icon-right" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <Link to="/forgot-password" className="auth-link" style={{ fontSize: 13 }}>
                Forgot password?
              </Link>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
            >
              {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">Create one free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
