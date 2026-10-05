const { pool } = require('../config/db');

// Helper to get date boundaries
const getDateBoundaries = () => {
  const today = new Date();
  
  // Today's midnight
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Start of this month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return { startOfToday, startOfMonth };
};

// GET /api/report/today
exports.getTodayReport = async (req, res) => {
  try {
    const { startOfToday } = getDateBoundaries();

    // Query aggregates for today
    const [stats] = await pool.query(
      `SELECT 
        MIN(energy) as min_energy, 
        MAX(energy) as max_energy,
        MIN(bill) as min_bill,
        MAX(bill) as max_bill,
        AVG(power) as avg_power,
        MAX(power) as max_power,
        AVG(voltage) as avg_voltage,
        AVG(current) as avg_current,
        COUNT(*) as reading_count
       FROM meter_readings 
       WHERE created_at >= ?`,
      [startOfToday]
    );

    const data = stats[0] || {};
    const totalEnergy = data.max_energy !== null && data.min_energy !== null ? (data.max_energy - data.min_energy) : 0;
    const totalBill = data.max_bill !== null && data.min_bill !== null ? (data.max_bill - data.min_bill) : 0;

    // Fetch hourly breakdown for today's trend
    const [hourlyTrend] = await pool.query(
      `SELECT 
        HOUR(created_at) as hour,
        AVG(power) as avg_power,
        MAX(energy) - MIN(energy) as energy_consumed
       FROM meter_readings
       WHERE created_at >= ?
       GROUP BY hour
       ORDER BY hour ASC`,
      [startOfToday]
    );

    res.json({
      summary: {
        totalEnergy: parseFloat(totalEnergy.toFixed(3)),
        totalBill: parseFloat(totalBill.toFixed(2)),
        avgPower: parseFloat((data.avg_power || 0).toFixed(1)),
        peakPower: parseFloat((data.max_power || 0).toFixed(1)),
        avgVoltage: parseFloat((data.avg_voltage || 0).toFixed(1)),
        avgCurrent: parseFloat((data.avg_current || 0).toFixed(2)),
        readingCount: data.reading_count || 0
      },
      trend: hourlyTrend
    });
  } catch (err) {
    console.error('Get Today Report Error:', err.message);
    res.status(500).send('Server error');
  }
};

// GET /api/report/monthly
exports.getMonthlyReport = async (req, res) => {
  try {
    const { startOfMonth } = getDateBoundaries();

    // Query aggregates for this month
    const [stats] = await pool.query(
      `SELECT 
        MIN(energy) as min_energy, 
        MAX(energy) as max_energy,
        MIN(bill) as min_bill,
        MAX(bill) as max_bill,
        AVG(power) as avg_power,
        MAX(power) as max_power,
        AVG(voltage) as avg_voltage,
        AVG(current) as avg_current,
        COUNT(*) as reading_count
       FROM meter_readings 
       WHERE created_at >= ?`,
      [startOfMonth]
    );

    const data = stats[0] || {};
    const totalEnergy = data.max_energy !== null && data.min_energy !== null ? (data.max_energy - data.min_energy) : 0;
    const totalBill = data.max_bill !== null && data.min_bill !== null ? (data.max_bill - data.min_bill) : 0;

    // Fetch daily breakdown for this month's trend
    const [dailyTrend] = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        AVG(power) as avg_power,
        MAX(energy) - MIN(energy) as energy_consumed,
        MAX(bill) - MIN(bill) as bill_incurred
       FROM meter_readings
       WHERE created_at >= ?
       GROUP BY date
       ORDER BY date ASC`,
      [startOfMonth]
    );

    // Fetch user settings to show budget comparison
    const [settings] = await pool.query('SELECT monthly_budget FROM settings WHERE user_id = ?', [req.user.id]);
    const budget = settings.length > 0 ? settings[0].monthly_budget : 150.0;

    res.json({
      summary: {
        totalEnergy: parseFloat(totalEnergy.toFixed(3)),
        totalBill: parseFloat(totalBill.toFixed(2)),
        avgPower: parseFloat((data.avg_power || 0).toFixed(1)),
        peakPower: parseFloat((data.max_power || 0).toFixed(1)),
        avgVoltage: parseFloat((data.avg_voltage || 0).toFixed(1)),
        avgCurrent: parseFloat((data.avg_current || 0).toFixed(2)),
        readingCount: data.reading_count || 0,
        monthlyBudget: budget,
        budgetProgress: budget > 0 ? parseFloat(((totalBill / budget) * 100).toFixed(1)) : 0
      },
      trend: dailyTrend
    });
  } catch (err) {
    console.error('Get Monthly Report Error:', err.message);
    res.status(500).send('Server error');
  }
};
