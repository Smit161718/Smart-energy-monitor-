const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Register User
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // 2. Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    const userId = result.insertId;

    // 5. Create default settings for this user
    await pool.query(
      'INSERT INTO settings (user_id, electricity_tariff, daily_energy_limit, monthly_budget, alert_on_limit, alert_on_budget, theme) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, 0.15, 15.0, 150.0, true, true, 'dark']
    );

    // 6. Generate JWT
    const payload = {
      user: {
        id: userId,
        name,
        email
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'supersecretenergyjwtkey',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          token,
          user: { id: userId, name, email }
        });
      }
    );
  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).send('Server error');
  }
};

// Login User
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // 2. Check user exists
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const user = users[0];

    // 3. Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // 4. Log login history
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const device = req.headers['user-agent'] || 'unknown';
    await pool.query(
      'INSERT INTO login_history (user_id, ip_address, device) VALUES (?, ?, ?)',
      [user.id, ip, device]
    );

    // 5. Generate JWT
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'supersecretenergyjwtkey',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: { id: user.id, name: user.name, email: user.email }
        });
      }
    );
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).send('Server error');
  }
};

// Get Profile Info
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user details
    const [users] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Fetch login history
    const [history] = await pool.query(
      'SELECT login_time, ip_address, device FROM login_history WHERE user_id = ? ORDER BY login_time DESC LIMIT 10',
      [userId]
    );

    res.json({
      user: users[0],
      loginHistory: history
    });
  } catch (err) {
    console.error('Get Profile Error:', err.message);
    res.status(500).send('Server error');
  }
};

// Update Profile Info
exports.updateProfile = async (req, res) => {
  const { name, email, password } = req.body;
  const userId = req.user.id;

  try {
    // Check if new email is taken
    if (email) {
      const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ msg: 'Email is already in use' });
      }
    }

    let queryStr = 'UPDATE users SET ';
    const queryParams = [];

    if (name) {
      queryStr += 'name = ?, ';
      queryParams.push(name);
    }
    if (email) {
      queryStr += 'email = ?, ';
      queryParams.push(email);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      queryStr += 'password = ?, ';
      queryParams.push(hashedPassword);
    }

    // Remove trailing comma and space
    queryStr = queryStr.slice(0, -2);
    queryStr += ' WHERE id = ?';
    queryParams.push(userId);

    await pool.query(queryStr, queryParams);

    // Fetch updated user info
    const [updatedUsers] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    res.json({
      msg: 'Profile updated successfully',
      user: updatedUsers[0]
    });
  } catch (err) {
    console.error('Update Profile Error:', err.message);
    res.status(500).send('Server error');
  }
};
