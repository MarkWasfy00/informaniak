const User = require('../models/User');

async function updateUserRankings(finalWinner, creatorName, invitedName) {
  try {
    const winner = await User.findOne({ username: finalWinner });
    const loser = await User.findOne({ username: finalWinner === creatorName ? invitedName : creatorName });

    if (winner) {
      winner.wins += 1;
      winner.points += 10; // Assuming 10 points for a win
      await winner.save();
    }

    if (loser) {
      loser.losses += 1;
      loser.points -= 5; // Assuming 5 points deducted for a loss
      await loser.save();
    }
  } catch (error) {
    console.error(`Error updating user rankings: ${error.message}`);
    console.error(error.stack);
  }
}

module.exports = {
  updateUserRankings
};