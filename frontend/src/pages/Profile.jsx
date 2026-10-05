import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MdAccountCircle, MdSave, MdHistory, MdDevices } from 'react-icons/md';
import './Profile.css';

const Profile = () => {
  const { user, updateProfileState } = useAuth();
  
  // Form fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Login history list state
  const [loginHistory, setLoginHistory] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfileDetails = async () => {
    try {
      const data = await authAPI.getProfile();
      setName(data.user.name);
      setEmail(data.user.email);
      setLoginHistory(data.loginHistory);
    } catch (e) {
      console.error('Failed to load profile details:', e.message);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password && password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setSaving(true);
    try {
      const payload = { name, email };
      if (password) {
        payload.password = password;
      }
      const data = await authAPI.updateProfile(payload);
      updateProfileState(data.user);
      setSuccess('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
      // Reload history list
      fetchProfileDetails();
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header glass-panel">
        <div className="header-title">
          <MdAccountCircle className="header-icon" />
          <div>
            <h2>User Profile</h2>
            <p>Update credentials and audit security access</p>
          </div>
        </div>
      </div>

      <div className="profile-layout-grid">
        {/* Form Panel */}
        <form onSubmit={handleUpdate} className="profile-form-panel glass-panel">
          <h3>Credentials Configuration</h3>

          {error && <div className="profile-alert error">{error}</div>}
          {success && <div className="profile-alert success">{success}</div>}

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              className="glass-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="glass-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Change Password (Leave blank to keep current)</label>
            <input
              type="password"
              id="password"
              className="glass-input"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {password && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                className="glass-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" className="btn-glowing profile-save-btn" disabled={saving}>
            <MdSave className="btn-icon-label" /> {saving ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </form>

        {/* Login History audit panel */}
        <div className="profile-history-panel glass-panel">
          <div className="history-header">
            <MdHistory className="history-icon" />
            <h3>Recent Login History</h3>
          </div>

          <div className="history-list">
            {loginHistory.map((item, index) => (
              <div className="history-item" key={index}>
                <div className="history-item-header">
                  <MdDevices className="device-icon" />
                  <span className="history-ip">{item.ip_address}</span>
                </div>
                <div className="history-device-details" title={item.device}>
                  {item.device}
                </div>
                <span className="history-time">
                  {new Date(item.login_time).toLocaleString()}
                </span>
              </div>
            ))}
            {loginHistory.length === 0 && (
              <p className="no-history">No login history records found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
