const mongoose = require('mongoose');
const Battle = require('../models/Battle');

// Function to store battle result in MongoDB
async function storeBattleResult(uniqueLink, round, choice1, choice2, winner) {
  try {
    await Battle.updateOne({ uniqueLink }, {
      $push: {
        results: {
          round,
          choice1,
          choice2,
          winner
        }
      }
    });
    console.log(`Round ${round} result stored successfully for battle ${uniqueLink}`);
  } catch (error) {
    console.error(`Error storing round result for battle ${uniqueLink}: ${error.message}`);
    console.error(error.stack);
    throw new Error('Error storing round result');
  }
}

// Function to complete the battle and store the final winner in MongoDB
async function completeBattle(uniqueLink, finalWinner) {
  try {
    await Battle.updateOne({ uniqueLink }, {
      $set: { finalWinner, status: 'completed' }
    });
    console.log(`Battle ${uniqueLink} completed with final winner: ${finalWinner}`);
  } catch (error) {
    console.error(`Error completing battle ${uniqueLink}: ${error.message}`);
    console.error(error.stack);
    throw new Error('Error completing battle');
  }
}

module.exports = {
  storeBattleResult,
  completeBattle
};