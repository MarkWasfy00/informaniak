const express = require('express');
const router = express.Router();
const Battle = require('../models/Battle');
const { v4: uuidv4 } = require('uuid');
const { isAuthenticated } = require('./middleware/authMiddleware');

// Route to render the battle creation form
router.get('/battle/create', (req, res) => {
  res.render('createBattle');
});

// Route to handle the form submission
router.post('/battle/create', async (req, res) => {
  try {
    const { creatorName, invitedName, rounds } = req.body;
    const uniqueLink = uuidv4();
    const newBattle = new Battle({ 
      creatorName, 
      invitedName, 
      rounds: parseInt(rounds, 10), // Ensure rounds is stored as a number
      uniqueLink 
    });
    await newBattle.save();
    console.log(`Battle created successfully: ${JSON.stringify(newBattle)}`);
    res.redirect(`/battle/${uniqueLink}`);
  } catch (error) {
    console.error('Error creating battle:', error.message);
    console.error(error.stack);
    res.status(500).send('Error creating battle');
  }
});

// Route to handle the unique battle link
router.get('/battle/:uniqueLink', async (req, res) => {
  try {
    const battle = await Battle.findOne({ uniqueLink: req.params.uniqueLink });
    if (!battle) {
      return res.status(404).send('Battle not found');
    }
    
    // Get the current user from the session
    const currentUser = req.session.user || { id: 'guest-' + Math.random().toString(36).substr(2, 9) };

    res.render('battle', { 
      battle,
      currentUser, // Pass the currentUser to the template
      title: 'Battle'
    });
  } catch (error) {
    console.error('Error fetching battle:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;