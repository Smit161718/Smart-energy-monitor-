import Logo from '../components/Logo';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Register() {
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name, email: form.email, password: form.password,
      });
      if (data.success) {
        login(data.token, data.user);
        navigate('/dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-hero">
          <div style={{ marginBottom: 16 }}>
            <Logo size={64} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #0099FF, #84CC16)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PowerMeter</h1>
          <p>Create your account to start monitoring your electricity consumption and save on your energy bills.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-title">Create Account</div>
            <div className="auth-card-sub">Start monitoring your energy usage today</div>
          </div>

          {error && <div className="alert alert-danger mb-16">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input id="reg-name" name="name" type="text" className="form-input"
                  placeholder="Your full name" value={form.name} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input id="reg-email" name="email" type="email" className="form-input"
                  placeholder="you@example.com" value={form.email} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div className="input-wrapper has-right">
                <Lock size={16} className="input-icon" />
                <input id="reg-password" name="password" type={showPass ? 'text' : 'password'}
                  className="form-input" placeholder="Min 6 characters"
                  value={form.password} onChange={handleChange} required />
                <button type="button" className="input-icon-right" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input id="reg-confirm" name="confirm" type={showPass ? 'text' : 'password'}
                  className="form-input" placeholder="Repeat your password"
                  value={form.confirm} onChange={handleChange} required />
              </div>
            </div>

            <button id="register-submit-btn" type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
