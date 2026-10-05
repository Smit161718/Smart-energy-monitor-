// src/pages/ResetPassword.jsx
import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Zap, CheckCircle } from 'lucide-react';
import api from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing token.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-hero">
          <div className="auth-hero-icon"><Zap size={36} color="#fff" /></div>
          <h1>Create New Password</h1>
          <p>Please enter your new password below. Make sure it is secure and unique.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          {success ? (
            <div className="text-center" style={{ padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, background: 'var(--success-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} color="var(--success)" />
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Password Reset</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <Link to="/login" className="btn btn-primary w-full">Go to Login</Link>
            </div>
          ) : (
            <>
              <div className="auth-card-header">
                <div className="auth-card-title">Reset Password</div>
                <div className="auth-card-sub">Enter your new password below</div>
              </div>

              {error && <div className="alert alert-danger mb-16">{error}</div>}
              {!token && <div className="alert alert-danger mb-16">No reset token found in URL. Please check your link.</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-pass">New Password</label>
                  <div className="input-wrapper has-right">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="reset-pass"
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={!token}
                    />
                    <button type="button" className="input-icon-right" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reset-confirm">Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="reset-confirm"
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      disabled={!token}
                    />
                  </div>
                </div>

                <button id="reset-submit-btn" type="submit" className="btn btn-primary w-full btn-lg" disabled={loading || !token}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>

              <div className="auth-footer">
                <Link to="/login" className="auth-link">Back to Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
