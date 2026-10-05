// src/controllers/authController.js
// Handles register, login, forgot-password, and profile/password updates

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const pool = require('../config/db');

// ── Helper: Generate JWT ─────────────────────────────────────────────────────
const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Hash password and create user
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashed]
    );

    // Create default settings for the new user
    await pool.query('INSERT INTO settings (user_id) VALUES (?)', [result.insertId]);

    const user = { id: result.insertId, email, name };
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { id: user.id, name, email },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email?.toLowerCase().trim()]);
    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
    }

    const user = rows[0];
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;

    // Send email if configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: 'Password Reset - Smart Energy Monitor',
        html: `<p>Hi ${user.name},</p>
               <p>Click the link below to reset your password (valid for 1 hour):</p>
               <a href="${resetUrl}">${resetUrl}</a>
               <p>If you didn't request this, ignore this email.</p>`,
      });
    }

    res.json({ success: true, message: 'If this email exists, a reset link has been sent.', resetUrl });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/auth/reset-password ───────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, rows[0].user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [rows[0].id]);

    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
