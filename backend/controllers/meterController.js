const { pool } = require('../config/db');

// Keep track of the last time we received data to determine ESP32 status
let lastReadingTime = null;

// Get last reading time for status checks
exports.getLastReadingTime = () => lastReadingTime;

// Ingest ESP32 PZEM-004T Meter Readings
exports.ingestReading = async (req, res) => {
  const { voltage, current, power, energy, bill } = req.body;

  try {
    // 1. Validation
    if (voltage === undefined || current === undefined || power === undefined || energy === undefined) {
      return res.status(400).json({ msg: 'Invalid payload. voltage, current, power, and energy are required.' });
    }

    // Default bill calculation if not provided
    let calculatedBill = bill !== undefined ? bill : 0;

    // 2. Insert reading into DB
    const [result] = await pool.query(
      'INSERT INTO meter_readings (voltage, current, power, energy, bill) VALUES (?, ?, ?, ?, ?)',
      [voltage, current, power, energy, calculatedBill]
    );

    // Update global created_at of last reading
    lastReadingTime = new Date();

    // 3. Smart Alerts Checks
    // Fetch all user settings to check limits
    const [usersSettings] = await pool.query('SELECT user_id, daily_energy_limit, monthly_budget, electricity_tariff, alert_on_limit, alert_on_budget FROM settings');

    // Calculate today's energy consumption (Max energy - Min energy since midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayStats] = await pool.query(
      'SELECT MIN(energy) as min_energy, MAX(energy) as max_energy FROM meter_readings WHERE created_at >= ?',
      [today]
    );

    let todayEnergyConsumed = 0;
    if (todayStats.length > 0 && todayStats[0].min_energy !== null && todayStats[0].max_energy !== null) {
      todayEnergyConsumed = todayStats[0].max_energy - todayStats[0].min_energy;
    }

    // Check high power threshold (e.g. 2500 Watts is a generic high load)
    if (power > 2500) {
      // Prevent notifications spam (check if 'High Power' sent in last 10 minutes)
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      const [recentAlerts] = await pool.query(
        "SELECT id FROM notifications WHERE type = 'WARNING' AND message LIKE '%High Power%' AND created_at >= ?",
        [tenMinsAgo]
      );

      if (recentAlerts.length === 0) {
        await pool.query(
          "INSERT INTO notifications (type, message) VALUES ('WARNING', ?)",
          [`High Power Consumption detected: ${power}W. Please turn off high-draw appliances if not in use.`]
        );
      }
    }

    // Check user limits
    for (const setting of usersSettings) {
      // A. Check daily energy limit
      if (setting.alert_on_limit && todayEnergyConsumed > setting.daily_energy_limit) {
        // Check if limit warning sent today
        const [recentLimitAlerts] = await pool.query(
          "SELECT id FROM notifications WHERE type = 'CRITICAL' AND message LIKE '%Daily Limit Exceeded%' AND created_at >= ?",
          [today]
        );

        if (recentLimitAlerts.length === 0) {
          await pool.query(
            "INSERT INTO notifications (type, message) VALUES ('CRITICAL', ?)",
            [`Daily Limit Exceeded! Current usage is ${todayEnergyConsumed.toFixed(2)} kWh. Limit set: ${setting.daily_energy_limit} kWh.`]
          );
        }
      }

      // B. Check monthly budget (Calculate monthly energy usage first)
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const [monthStats] = await pool.query(
        'SELECT MIN(energy) as min_energy, MAX(energy) as max_energy FROM meter_readings WHERE created_at >= ?',
        [firstDayOfMonth]
      );

      let monthEnergyConsumed = 0;
      if (monthStats.length > 0 && monthStats[0].min_energy !== null && monthStats[0].max_energy !== null) {
        monthEnergyConsumed = monthStats[0].max_energy - monthStats[0].min_energy;
      }

      const estimatedMonthBill = monthEnergyConsumed * setting.electricity_tariff;

      if (setting.alert_on_budget && estimatedMonthBill > setting.monthly_budget) {
        // Check if budget alert sent this month
        const [recentBudgetAlerts] = await pool.query(
          "SELECT id FROM notifications WHERE type = 'CRITICAL' AND message LIKE '%Monthly Budget Exceeded%' AND created_at >= ?",
          [firstDayOfMonth]
        );

        if (recentBudgetAlerts.length === 0) {
          await pool.query(
            "INSERT INTO notifications (type, message) VALUES ('CRITICAL', ?)",
            [`Monthly Budget Exceeded! Estimated bill is $${estimatedMonthBill.toFixed(2)}. Budget set: $${setting.monthly_budget.toFixed(2)}.`]
          );
        }
      }
    }

    res.status(201).json({
      msg: 'Reading stored successfully',
      id: result.insertId
    });
  } catch (err) {
    console.error('Ingest Reading Error:', err.message);
    res.status(500).send('Server error');
  }
};

// Get Latest Reading (for real-time dashboard display)
exports.getLatestReading = async (req, res) => {
  try {
    const [readings] = await pool.query(
      'SELECT * FROM meter_readings ORDER BY created_at DESC LIMIT 1'
    );

    if (readings.length === 0) {
      return res.status(404).json({ msg: 'No readings found' });
    }

    res.json(readings[0]);
  } catch (err) {
    console.error('Get Latest Reading Error:', err.message);
    res.status(500).send('Server error');
  }
};

// Get Meter Readings History (with search, filtering, and pagination)
exports.getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const minPower = req.query.minPower;
    const maxPower = req.query.maxPower;

    let queryStr = 'SELECT * FROM meter_readings';
    let countStr = 'SELECT COUNT(*) as count FROM meter_readings';
    const queryParams = [];
    const countParams = [];
    let whereClauses = [];

    if (startDate) {
      whereClauses.push('created_at >= ?');
      queryParams.push(startDate);
      countParams.push(startDate);
    }
    if (endDate) {
      whereClauses.push('created_at <= ?');
      queryParams.push(endDate);
      countParams.push(endDate);
    }
    if (minPower) {
      whereClauses.push('power >= ?');
      queryParams.push(parseFloat(minPower));
      countParams.push(parseFloat(minPower));
    }
    if (maxPower) {
      whereClauses.push('power <= ?');
      queryParams.push(parseFloat(maxPower));
      countParams.push(parseFloat(maxPower));
    }

    if (whereClauses.length > 0) {
      const clause = ' WHERE ' + whereClauses.join(' AND ');
      queryStr += clause;
      countStr += clause;
    }

    queryStr += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [readings] = await pool.query(queryStr, queryParams);
    const [counts] = await pool.query(countStr, countParams);

    const totalRecords = counts[0].count;
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      readings,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages
      }
    });
  } catch (err) {
    console.error('Get History Error:', err.message);
    res.status(500).send('Server error');
  }
};

// Get Chart Data (Aggregated readings)
exports.getChartsData = async (req, res) => {
  try {
    const range = req.query.range || 'day'; // 'day', 'week', 'month'
    let queryStr = '';
    let params = [];

    if (range === 'day') {
      // Last 24 hours grouped by hour
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      queryStr = `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as time_label,
          AVG(voltage) as avg_voltage,
          AVG(current) as avg_current,
          AVG(power) as avg_power,
          MAX(energy) - MIN(energy) as energy_consumed,
          MAX(bill) - MIN(bill) as bill_incurred
        FROM meter_readings 
        WHERE created_at >= ?
        GROUP BY time_label
        ORDER BY time_label ASC
      `;
      params = [oneDayAgo];
    } else if (range === 'week') {
      // Last 7 days grouped by day
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      queryStr = `
        SELECT 
          DATE(created_at) as time_label,
          AVG(voltage) as avg_voltage,
          AVG(current) as avg_current,
          AVG(power) as avg_power,
          MAX(energy) - MIN(energy) as energy_consumed,
          MAX(bill) - MIN(bill) as bill_incurred
        FROM meter_readings 
        WHERE created_at >= ?
        GROUP BY time_label
        ORDER BY time_label ASC
      `;
      params = [oneWeekAgo];
    } else {
      // Raw latest 50 readings for real-time visualization
      queryStr = `
        SELECT * FROM (
          SELECT * FROM meter_readings ORDER BY created_at DESC LIMIT 50
        ) sub ORDER BY created_at ASC
      `;
    }

    const [chartData] = await pool.query(queryStr, params);
    res.json(chartData);
  } catch (err) {
    console.error('Get Charts Data Error:', err.message);
    res.status(500).send('Server error');
  }
};
