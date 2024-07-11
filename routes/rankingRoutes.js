const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Route to get player rankings
router.get('/rankings', async (req, res) => {
  try {
    const users = await User.find().sort({ points: -1 }).limit(10); // Top 10 players
    res.render('rankings', { users });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;