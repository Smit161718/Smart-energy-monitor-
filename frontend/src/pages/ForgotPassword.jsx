// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../api';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      if (data.success) setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-hero">
          <div className="auth-hero-icon"><Zap size={36} color="#fff" /></div>
          <h1>Reset Password</h1>
          <p>We'll send a secure password reset link to your registered email address.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          {success ? (
            <div className="text-center" style={{ padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, background: 'var(--success-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} color="var(--success)" />
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <Link to="/login" className="btn btn-primary w-full">Back to Login</Link>
            </div>
          ) : (
            <>
              <div className="auth-card-header">
                <div className="auth-card-title">Forgot Password?</div>
                <div className="auth-card-sub">Enter your email to receive a reset link</div>
              </div>

              {error && <div className="alert alert-danger mb-16">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input id="forgot-email" type="email" className="form-input"
                      placeholder="you@example.com" value={email}
                      onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                <button id="forgot-submit-btn" type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="auth-footer">
                <Link to="/login" className="auth-link flex-center gap-4" style={{ justifyContent: 'center' }}>
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
