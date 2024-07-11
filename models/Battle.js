const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema({
  creatorName: { type: String, default: 'Guest' },
  invitedName: { type: String, default: 'Guest' },
  rounds: { type: Number, enum: [1, 3], required: true },
  uniqueLink: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  results: [
    {
      round: Number,
      choice1: String,
      choice2: String,
      winner: String
    }
  ],
  chatMessages: [
    {
      sender: String,
      message: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  finalWinner: String
});

const Battle = mongoose.model('Battle', battleSchema);

module.exports = Battle;
