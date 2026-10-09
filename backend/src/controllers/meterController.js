// src/controllers/meterController.js
// Handles all meter readings: receive from ESP32, serve to frontend

const pool = require('../config/db');

// ── Helper: Get current user's tariff ────────────────────────────────────────
const getTariff = async (userId = 1) => {
  const [rows] = await pool.query('SELECT tariff FROM settings WHERE user_id = ?', [userId]);
  return rows.length > 0 ? parseFloat(rows[0].tariff) : 8.0;
};

// ── Helper: Check and generate notifications ─────────────────────────────────
const checkAndNotify = async (reading, userId = 1) => {
  const [settingsRows] = await pool.query('SELECT * FROM settings WHERE user_id = ?', [userId]);
  if (!settingsRows.length) return;
  const settings = settingsRows[0];

  // High power alert
  if (settings.notify_high_power && reading.power > settings.high_power_threshold) {
    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
      [userId, 'high_power', `⚡ High power detected: ${reading.power.toFixed(0)}W (limit: ${settings.high_power_threshold}W)`]
    );
  }

  // Power cut alert
  if (settings.notify_power_cut && reading.power === 0 && reading.voltage === 0) {
    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
      [userId, 'power_cut', '🔴 Power cut detected! Voltage and Power are both zero.']
    );
  }
};

let lastDevicePingTime = 0;

// ── POST /api/meter  (called by ESP32) ──────────────────────────────────────
exports.postReading = async (req, res) => {
  try {
    lastDevicePingTime = Date.now();
    const { voltage, current, power, energy, frequency, powerFactor } = req.body;

    // Validate required fields
    if (voltage === undefined || current === undefined || power === undefined || energy === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required sensor fields (voltage, current, power, energy)' });
    }

    // Default frequency and powerFactor if not provided by ESP32
    const finalFreq = frequency !== undefined ? parseFloat(frequency) : 50.0;
    const finalPf   = powerFactor !== undefined ? parseFloat(powerFactor) : 1.0;

    // Get current tariff (use user_id = 1 for single-device setup)
    const tariff = await getTariff(1);
    const bill = parseFloat((energy * tariff).toFixed(4));

    const [result] = await pool.query(
      `INSERT INTO meter_readings
        (voltage, current_amp, power, energy, frequency, power_factor, bill)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        parseFloat(voltage).toFixed(2),
        parseFloat(current).toFixed(4),
        parseFloat(power).toFixed(2),
        parseFloat(energy).toFixed(4),
        finalFreq.toFixed(2),
        finalPf.toFixed(4),
        bill,
      ]
    );

    // Async notification check (don't block response)
    checkAndNotify({ voltage: parseFloat(voltage), power: parseFloat(power) }, 1).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Reading stored',
      id: result.insertId,
      bill,
    });
  } catch (err) {
    console.error('Post reading error:', err);
    res.status(500).json({ success: false, message: 'Server error storing reading' });
  }
};

// ── GET /api/meter/latest ────────────────────────────────────────────────────
exports.getLatest = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT *, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds FROM meter_readings ORDER BY created_at DESC LIMIT 1`
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No readings yet' });
    }

    // Determine device status robustly across timezones
    const reading = rows[0];
    const memoryAgeMs = lastDevicePingTime > 0 ? (Date.now() - lastDevicePingTime) : Infinity;
    const dbAgeSec    = (reading.age_seconds !== null && reading.age_seconds !== undefined) 
      ? Math.abs(reading.age_seconds) 
      : Infinity;
    const rawAgeMs    = Math.abs(Date.now() - new Date(reading.created_at).getTime());

    const isOnline   = (memoryAgeMs < 45000) || (dbAgeSec < 45) || (rawAgeMs < 45000);
    const isPowerCut = parseFloat(reading.voltage) === 0 && parseFloat(reading.power) === 0;

    res.json({
      success: true,
      data: {
        ...reading,
        deviceStatus: isPowerCut ? 'power_cut' : isOnline ? 'online' : 'offline',
        lastUpdated: reading.created_at,
      },
    });
  } catch (err) {
    console.error('Get latest error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/meter/history ───────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const sort   = req.query.sort   || 'created_at';
    const order  = req.query.order  === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    // Allowed sort columns
    const allowedSort = ['created_at', 'voltage', 'current_amp', 'power', 'energy', 'frequency', 'power_factor', 'bill'];
    const sortCol = allowedSort.includes(sort) ? sort : 'created_at';

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = `WHERE DATE(created_at) = ? OR DATE_FORMAT(created_at, '%d-%m-%Y') LIKE ?`;
      params = [search, `%${search}%`];
    }

    const [rows] = await pool.query(
      `SELECT * FROM meter_readings ${whereClause}
       ORDER BY ${sortCol} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM meter_readings ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/meter/daily ─────────────────────────────────────────────────────
exports.getDaily = async (req, res) => {
  try {
    // Last 24 hours, grouped by hour
    const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(created_at, '%H:00') AS hour,
        AVG(voltage)      AS avg_voltage,
        AVG(current_amp)  AS avg_current,
        AVG(power)        AS avg_power,
        MAX(energy)       AS max_energy,
        AVG(power_factor) AS avg_pf,
        COUNT(*)          AS readings
      FROM meter_readings
      WHERE created_at >= NOW() - INTERVAL 24 HOUR
      GROUP BY HOUR(created_at)
      ORDER BY HOUR(created_at)
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get daily error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/meter/weekly ────────────────────────────────────────────────────
exports.getWeekly = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        DATE(created_at) AS date,
        DAYNAME(created_at) AS day_name,
        AVG(voltage)      AS avg_voltage,
        AVG(current_amp)  AS avg_current,
        AVG(power)        AS avg_power,
        MAX(energy) - MIN(energy) AS energy_consumed,
        AVG(power_factor) AS avg_pf,
        COUNT(*)          AS readings
      FROM meter_readings
      WHERE created_at >= NOW() - INTERVAL 7 DAY
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get weekly error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/meter/monthly ───────────────────────────────────────────────────
exports.getMonthly = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        DATE(created_at) AS date,
        AVG(voltage)      AS avg_voltage,
        AVG(current_amp)  AS avg_current,
        AVG(power)        AS avg_power,
        MAX(energy) - MIN(energy) AS energy_consumed,
        COUNT(*)          AS readings
      FROM meter_readings
      WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get monthly error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/meter/bill ──────────────────────────────────────────────────────
exports.getBill = async (req, res) => {
  try {
    const tariff = await getTariff(req.user.id);

    // Today's energy
    const [[today]] = await pool.query(`
      SELECT
        COALESCE(NULLIF(MAX(energy) - MIN(energy), 0), MAX(energy), 0) AS energy_today,
        COALESCE(MAX(energy), 0) AS total_energy
      FROM meter_readings
      WHERE DATE(created_at) = CURDATE()
    `);

    // Yesterday's energy
    const [[yesterday]] = await pool.query(`
      SELECT COALESCE(NULLIF(MAX(energy) - MIN(energy), 0), MAX(energy), 0) AS energy_yesterday
      FROM meter_readings
      WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
    `);

    // This month's energy
    const [[month]] = await pool.query(`
      SELECT COALESCE(NULLIF(MAX(energy) - MIN(energy), 0), MAX(energy), 0) AS energy_month
      FROM meter_readings
      WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())
    `);

    // Predict end-of-month: prorate monthly usage so far
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const predictedMonthlyEnergy = parseFloat(month.energy_month) * (daysInMonth / dayOfMonth);

    res.json({
      success: true,
      data: {
        tariff,
        todayEnergy:     parseFloat(today.energy_today).toFixed(4),
        todayBill:       (parseFloat(today.energy_today) * tariff).toFixed(2),
        yesterdayEnergy: parseFloat(yesterday.energy_yesterday).toFixed(4),
        yesterdayBill:   (parseFloat(yesterday.energy_yesterday) * tariff).toFixed(2),
        monthEnergy:     parseFloat(month.energy_month).toFixed(4),
        monthBill:       (parseFloat(month.energy_month) * tariff).toFixed(2),
        predictedEnergy: predictedMonthlyEnergy.toFixed(4),
        predictedBill:   (predictedMonthlyEnergy * tariff).toFixed(2),
      },
    });
  } catch (err) {
    console.error('Get bill error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/meter/chart ─────────────────────────────────────────────────────
// Returns last N readings for live chart (default 50)
exports.getChartData = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const [rows] = await pool.query(
      `SELECT voltage, current_amp, power, energy, frequency, power_factor, created_at
       FROM meter_readings ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    res.json({ success: true, data: rows.reverse() });
  } catch (err) {
    console.error('Get chart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
