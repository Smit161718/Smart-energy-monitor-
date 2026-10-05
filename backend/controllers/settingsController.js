const { pool } = require('../config/db');

// Get User Settings
exports.getSettings = async (req, res) => {
  const userId = req.user.id;

  try {
    const [settings] = await pool.query(
      'SELECT electricity_tariff, daily_energy_limit, monthly_budget, alert_on_limit, alert_on_budget, theme FROM settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // Fallback fallback settings
      return res.json({
        electricity_tariff: 0.15,
        daily_energy_limit: 15.0,
        monthly_budget: 150.0,
        alert_on_limit: true,
        alert_on_budget: true,
        theme: 'dark'
      });
    }

    res.json(settings[0]);
  } catch (err) {
    console.error('Get Settings Error:', err.message);
    res.status(500).send('Server error');
  }
};

// Update User Settings
exports.updateSettings = async (req, res) => {
  const userId = req.user.id;
  const { electricity_tariff, daily_energy_limit, monthly_budget, alert_on_limit, alert_on_budget, theme } = req.body;

  try {
    // Check if settings record exists for user
    const [existing] = await pool.query('SELECT id FROM settings WHERE user_id = ?', [userId]);

    if (existing.length === 0) {
      // Create new settings record
      await pool.query(
        `INSERT INTO settings 
          (user_id, electricity_tariff, daily_energy_limit, monthly_budget, alert_on_limit, alert_on_budget, theme) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          electricity_tariff !== undefined ? electricity_tariff : 0.15,
          daily_energy_limit !== undefined ? daily_energy_limit : 15.0,
          monthly_budget !== undefined ? monthly_budget : 150.0,
          alert_on_limit !== undefined ? alert_on_limit : true,
          alert_on_budget !== undefined ? alert_on_budget : true,
          theme !== undefined ? theme : 'dark'
        ]
      );
    } else {
      // Update settings record
      await pool.query(
        `UPDATE settings SET 
          electricity_tariff = ?, 
          daily_energy_limit = ?, 
          monthly_budget = ?, 
          alert_on_limit = ?, 
          alert_on_budget = ?, 
          theme = ? 
         WHERE user_id = ?`,
        [
          electricity_tariff,
          daily_energy_limit,
          monthly_budget,
          alert_on_limit,
          alert_on_budget,
          theme,
          userId
        ]
      );
    }

    res.json({ msg: 'Settings updated successfully' });
  } catch (err) {
    console.error('Update Settings Error:', err.message);
    res.status(500).send('Server error');
  }
};
