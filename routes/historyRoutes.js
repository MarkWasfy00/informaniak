const express = require('express');
const router = express.Router();
const Battle = require('../models/Battle');
const { isAuthenticated } = require('./middleware/authMiddleware');

router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.username;
    const battles = await Battle.find({
      $or: [
        { creatorName: username },
        { invitedName: username }
      ],
      status: 'completed'
    }).sort({ createdAt: -1 });

    res.render('history', { battles });
  } catch (error) {
    console.error('Error fetching battle history:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;