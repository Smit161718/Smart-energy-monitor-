const { pool } = require('../config/db');

// Get Notifications
exports.getNotifications = async (req, res) => {
  try {
    const [notifications] = await pool.query(
      'SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50'
    );
    res.json(notifications);
  } catch (err) {
    console.error('Get Notifications Error:', err.message);
    res.status(500).send('Server error');
  }
};

// Mark Notification as Read
exports.markAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    res.json({ msg: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark Notification Read Error:', err.message);
    res.status(500).send('Server error');
  }
};

// Clear All Notifications
exports.clearAll = async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications');
    res.json({ msg: 'All notifications cleared' });
  } catch (err) {
    console.error('Clear Notifications Error:', err.message);
    res.status(500).send('Server error');
  }
};
