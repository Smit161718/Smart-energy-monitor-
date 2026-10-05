// src/pages/Settings.jsx
// User settings: tariff, profile, password, notifications

import { useState, useEffect } from 'react';
import { User, Mail, Lock, Zap, Bell, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card" style={{ padding: 28, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color="var(--primary)" />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`alert alert-${type}`} style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, minWidth: 280, boxShadow: 'var(--shadow-lg)', animation: 'slideDown 0.3s ease' }}>
      <CheckCircle size={16} />
      {msg}
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();

  // Settings state
  const [settings,   setSettings]   = useState(null);
  const [loading,    setLoading]     = useState(true);
  const [toast,      setToast]       = useState({ msg: '', type: 'success' });

  // Profile
  const [profile,    setProfile]     = useState({ name: '', email: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password
  const [passwd, setPasswd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPasswd, setShowPasswd] = useState(false);
  const [passwdSaving, setPasswdSaving] = useState(false);

  // Tariff
  const [tariff,     setTariff]      = useState('8.00');
  const [tariffSaving, setTariffSaving] = useState(false);

  // Notifications
  const [notifSaving, setNotifSaving] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data.success) {
          setSettings(data.data);
          setTariff(parseFloat(data.data.tariff).toFixed(2));
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
    if (user) setProfile({ name: user.name || '', email: user.email || '' });
  }, [user]);

  // ── Save profile ──────────────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const { data } = await api.put('/settings/profile', profile);
      if (data.success) { updateUser(profile); showToast('Profile updated successfully'); }
      else showToast(data.message, 'danger');
    } catch (err) { showToast(err.response?.data?.message || 'Error updating profile', 'danger'); }
    finally { setProfileSaving(false); }
  };

  // ── Save password ─────────────────────────────────────────────
  const savePassword = async (e) => {
    e.preventDefault();
    if (passwd.newPassword !== passwd.confirm) return showToast('Passwords do not match', 'danger');
    if (passwd.newPassword.length < 6) return showToast('Password must be at least 6 characters', 'danger');
    setPasswdSaving(true);
    try {
      const { data } = await api.put('/settings/password', { currentPassword: passwd.currentPassword, newPassword: passwd.newPassword });
      if (data.success) { setPasswd({ currentPassword: '', newPassword: '', confirm: '' }); showToast('Password changed successfully'); }
      else showToast(data.message, 'danger');
    } catch (err) { showToast(err.response?.data?.message || 'Error changing password', 'danger'); }
    finally { setPasswdSaving(false); }
  };

  // ── Save tariff ───────────────────────────────────────────────
  const saveTariff = async (e) => {
    e.preventDefault();
    if (!tariff || isNaN(tariff) || parseFloat(tariff) <= 0) return showToast('Enter a valid tariff', 'danger');
    setTariffSaving(true);
    try {
      const { data } = await api.put('/settings/tariff', { tariff: parseFloat(tariff) });
      if (data.success) showToast(`Tariff updated to ₹${parseFloat(tariff).toFixed(2)}/kWh`);
      else showToast(data.message, 'danger');
    } catch { showToast('Error saving tariff', 'danger'); }
    finally { setTariffSaving(false); }
  };

  // ── Save notifications ────────────────────────────────────────
  const saveNotifications = async () => {
    if (!settings) return;
    setNotifSaving(true);
    try {
      const { data } = await api.put('/settings/notifications', {
        notify_high_power:    settings.notify_high_power,
        notify_bill_exceeded: settings.notify_bill_exceeded,
        notify_power_cut:     settings.notify_power_cut,
        notify_offline:       settings.notify_offline,
        monthly_bill_limit:   settings.monthly_bill_limit,
        high_power_threshold: settings.high_power_threshold,
      });
      if (data.success) showToast('Notification settings saved');
      else showToast(data.message, 'danger');
    } catch { showToast('Error saving notifications', 'danger'); }
    finally { setNotifSaving(false); }
  };

  const toggleNotif = (key) => setSettings(s => ({ ...s, [key]: s[key] ? 0 : 1 }));

  if (loading) return <div className="flex-center" style={{ padding: 80 }}><div className="spinner" /></div>;

  return (
    <div>
      <Toast msg={toast.msg} type={toast.type} />

      <div className="page-header">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-subtitle">Configure your energy monitor preferences</p>
        </div>
      </div>

      <div style={{ maxWidth: 720 }}>
        {/* Tariff */}
        <Section title="Electricity Tariff" icon={Zap}>
          <form onSubmit={saveTariff}>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-tariff">Rate (₹ per kWh)</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input id="settings-tariff" type="number" step="0.01" min="0.01" className="form-input"
                  value={tariff} onChange={e => setTariff(e.target.value)} style={{ maxWidth: 200 }} />
                <button id="save-tariff-btn" type="submit" className="btn btn-primary" disabled={tariffSaving}>
                  <Save size={14} /> {tariffSaving ? 'Saving...' : 'Save Tariff'}
                </button>
              </div>
              <span className="form-hint">Current tariff: ₹{settings?.tariff}/kWh · Bill = Energy (kWh) × Tariff</span>
            </div>
          </form>
        </Section>

        {/* Notifications */}
        <Section title="Notification Preferences" icon={Bell}>
          {[
            { key: 'notify_high_power',    label: 'High Power Alert',          desc: `Alert when power exceeds threshold` },
            { key: 'notify_bill_exceeded', label: 'Monthly Bill Limit Alert',  desc: 'Alert when monthly bill exceeds limit' },
            { key: 'notify_power_cut',     label: 'Power Cut Detection',       desc: 'Alert when voltage/power drop to zero' },
            { key: 'notify_offline',       label: 'Device Offline Alert',      desc: 'Alert when ESP32 stops sending data' },
          ].map(({ key, label, desc }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id={`notif-${key}`} checked={!!settings?.[key]} onChange={() => toggleNotif(key)} />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}

          <div className="two-col" style={{ marginTop: 16, gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-power-threshold">High Power Threshold (W)</label>
              <input id="settings-power-threshold" type="number" className="form-input" min="0"
                value={settings?.high_power_threshold || 2000}
                onChange={e => setSettings(s => ({ ...s, high_power_threshold: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-bill-limit">Monthly Bill Limit (₹)</label>
              <input id="settings-bill-limit" type="number" className="form-input" min="0"
                value={settings?.monthly_bill_limit || 1000}
                onChange={e => setSettings(s => ({ ...s, monthly_bill_limit: e.target.value }))} />
            </div>
          </div>

          <button id="save-notif-btn" className="btn btn-primary" onClick={saveNotifications} disabled={notifSaving}>
            <Save size={14} /> {notifSaving ? 'Saving...' : 'Save Notification Settings'}
          </button>
        </Section>

        {/* Profile */}
        <Section title="Update Profile" icon={User}>
          <form onSubmit={saveProfile}>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-name">Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input id="settings-name" type="text" className="form-input" value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input id="settings-email" type="email" className="form-input" value={profile.email}
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} required />
              </div>
            </div>
            <button id="save-profile-btn" type="submit" className="btn btn-primary" disabled={profileSaving}>
              <Save size={14} /> {profileSaving ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </Section>

        {/* Password */}
        <Section title="Change Password" icon={Lock}>
          <form onSubmit={savePassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-curr-pass">Current Password</label>
              <div className="input-wrapper has-right">
                <Lock size={16} className="input-icon" />
                <input id="settings-curr-pass" name="currentPassword" type={showPasswd ? 'text' : 'password'} className="form-input"
                  placeholder="Your current password" value={passwd.currentPassword}
                  onChange={e => setPasswd(p => ({ ...p, currentPassword: e.target.value }))} required />
                <button type="button" className="input-icon-right" onClick={() => setShowPasswd(v => !v)} tabIndex={-1}>
                  {showPasswd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-new-pass">New Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input id="settings-new-pass" name="newPassword" type={showPasswd ? 'text' : 'password'} className="form-input"
                  placeholder="Min 6 characters" value={passwd.newPassword}
                  onChange={e => setPasswd(p => ({ ...p, newPassword: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-confirm-pass">Confirm New Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input id="settings-confirm-pass" name="confirm" type={showPasswd ? 'text' : 'password'} className="form-input"
                  placeholder="Repeat new password" value={passwd.confirm}
                  onChange={e => setPasswd(p => ({ ...p, confirm: e.target.value }))} required />
              </div>
            </div>
            <button id="save-password-btn" type="submit" className="btn btn-primary" disabled={passwdSaving}>
              <Save size={14} /> {passwdSaving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </Section>
      </div>
    </div>
  );
}
