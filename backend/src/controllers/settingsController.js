// src/controllers/settingsController.js
// User settings: tariff, profile, password, notifications

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// ── GET /api/settings ────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM settings WHERE user_id = ?',
      [req.user.id]
    );
    if (!rows.length) {
      // Create default settings if missing
      await pool.query('INSERT INTO settings (user_id) VALUES (?)', [req.user.id]);
      return res.json({ success: true, data: { tariff: 8.0, notify_high_power: 1, notify_bill_exceeded: 1, notify_power_cut: 1, notify_offline: 1, monthly_bill_limit: 1000, high_power_threshold: 2000 } });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /api/settings/tariff ─────────────────────────────────────────────────
exports.updateTariff = async (req, res) => {
  try {
    const { tariff } = req.body;
    if (!tariff || isNaN(tariff) || tariff <= 0) {
      return res.status(400).json({ success: false, message: 'Valid tariff required (Rs/kWh)' });
    }
    await pool.query(
      'UPDATE settings SET tariff = ? WHERE user_id = ?',
      [parseFloat(tariff), req.user.id]
    );
    res.json({ success: true, message: 'Tariff updated', tariff: parseFloat(tariff) });
  } catch (err) {
    console.error('Update tariff error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /api/settings/notifications ─────────────────────────────────────────
exports.updateNotifications = async (req, res) => {
  try {
    const { notify_high_power, notify_bill_exceeded, notify_power_cut, notify_offline, monthly_bill_limit, high_power_threshold } = req.body;
    await pool.query(
      `UPDATE settings SET
        notify_high_power = ?,
        notify_bill_exceeded = ?,
        notify_power_cut = ?,
        notify_offline = ?,
        monthly_bill_limit = ?,
        high_power_threshold = ?
       WHERE user_id = ?`,
      [
        notify_high_power ? 1 : 0,
        notify_bill_exceeded ? 1 : 0,
        notify_power_cut ? 1 : 0,
        notify_offline ? 1 : 0,
        parseFloat(monthly_bill_limit) || 1000,
        parseFloat(high_power_threshold) || 2000,
        req.user.id,
      ]
    );
    res.json({ success: true, message: 'Notification settings updated' });
  } catch (err) {
    console.error('Update notifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /api/settings/profile ────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    // Check email uniqueness
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name.trim(), email.trim(), req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /api/settings/password ───────────────────────────────────────────────
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Valid current and new password required (min 6 chars)' });
    }

    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/notifications ───────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const [[{ unread }]] = await pool.query(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ success: true, data: rows, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /api/notifications/read ──────────────────────────────────────────────
exports.markAllRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
