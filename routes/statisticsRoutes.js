const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const { getPlayerStatistics } = require('../utils/statisticsUtils');

// Route to get player statistics
router.get('/statistics', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.username;
    const stats = await getPlayerStatistics(username);
    res.render('statistics', { stats });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;