const Battle = require('../models/Battle');

async function getPlayerStatistics(username) {
  try {
    const battles = await Battle.find({
      $or: [
        { creatorName: username },
        { invitedName: username }
      ],
      status: 'completed'
    });

    const stats = {
      totalBattles: battles.length,
      totalWins: 0,
      totalLosses: 0,
      choiceCounts: {
        rock: 0,
        paper: 0,
        scissors: 0
      }
    };

    battles.forEach(battle => {
      if (battle.finalWinner === username) {
        stats.totalWins++;
      } else {
        stats.totalLosses++;
      }

      battle.results.forEach(result => {
        if (result.choice1 === 'rock' || result.choice2 === 'rock') stats.choiceCounts.rock++;
        if (result.choice1 === 'paper' || result.choice2 === 'paper') stats.choiceCounts.paper++;
        if (result.choice1 === 'scissors' || result.choice2 === 'scissors') stats.choiceCounts.scissors++;
      });
    });

    return stats;
  } catch (error) {
    console.error(`Error fetching statistics for user ${username}: ${error.message}`);
    console.error(error.stack);
    throw new Error('Error fetching statistics');
  }
}

module.exports = {
  getPlayerStatistics
};