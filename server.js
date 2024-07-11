require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const authRoutes = require("./routes/authRoutes");
const battleRoutes = require('./routes/battleRoutes');
const historyRoutes = require('./routes/historyRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const http = require('http');
const https = require('https');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const util = require('util');
const Battle = require('./models/Battle');
const User = require('./models/User');
const notifier = require('node-notifier');
const i18n = require('./config/i18n');
const { v4: uuidv4 } = require('uuid');
const languageSwitcher = require('./middleware/languageSwitcher');
const cors = require('cors');


if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error("Error: config environment variables not set. Please create/edit .env configuration file.");
  process.exit(-1);
}
console.log('app launched');
// Create a write stream (in append mode)
const logFile = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });
const logStdout = process.stdout;

console.log = function (message) {
  logFile.write(util.format(message) + '\n');
  logStdout.write(util.format(message) + '\n');
};

console.error = console.log;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

console.log(`CORS origin: ${process.env.CORS_ORIGIN}`);

//SSL options
let options;
try {
  const keyPath = '/home/clients/2ee67f19845466377e2638ca09c936cd/sites/brutasses/ssl/brutasses.ch-2024-07-08.key';
  const certPath = '/home/clients/2ee67f19845466377e2638ca09c936cd/sites/brutasses/ssl/brutasses.ch-2024-07-08.crt';

  console.log("Key file path:", keyPath);
  console.log("Cert file path:", certPath);

  console.log("Attempting to read key file");
  const key = fs.readFileSync(keyPath);
  console.log("Key file read successfully, length:", key.length);

  console.log("Attempting to read cert file");
  const cert = fs.readFileSync(certPath);
  console.log("Cert file read successfully, length:", cert.length);

  options = { key, cert };
  console.log("SSL options loaded successfully");
  
  console.log("Key file start:", key.toString().substring(0, 30));
  console.log("Cert file start:", cert.toString().substring(0, 30));

} catch (error) {
  console.error("Error loading SSL options:", error.message);
  console.error("Error stack:", error.stack);
  process.exit(1);
}

// Create HTTP server and integrate Socket.IO
let server;
try {
  server = http.createServer(options, app);
  console.log("HTTPS server created successfully");
} catch (error) {
  console.error("Error creating HTTPS server:", error.message);
  process.exit(1);
}

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
    allowedHeaders: ['Access-Control-Allow-Origin'],
    transports: ['websocket', 'polling'],
    credentials: false
  },
  allowEIO3: true
});


// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

// Database connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });

// Session configuration with connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
  }),
);

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Logging session creation and destruction
app.use((req, res, next) => {
  const sess = req.session;
  // Make session available to all views
  res.locals.session = sess;
  if (!sess.views) {
    sess.views = 1;
    console.log("Session created at: ", new Date().toISOString());
  } else {
    sess.views++;
    console.log(
      `Session accessed again at: ${new Date().toISOString()}, Views: ${sess.views}, User ID: ${sess.userId || '(unauthenticated)'}`,
    );
  }
  next();
});
app.get('/test', (req, res) => {
  res.send('Hello World!');
});
// i18n middleware
app.use(i18n.init);

// Middleware to make i18n functions available in templates
app.use((req, res, next) => {
  res.locals.__ = res.__ = req.__;
  next();
});

// Language switcher middleware
app.use(languageSwitcher);

// Add this middleware to pass the locale to the templates
app.use((req, res, next) => {
  res.locals.locale = req.getLocale();
  next();
});

// Authentication Routes
app.use(authRoutes);

// Battle Routes
app.use(battleRoutes);

// History Routes
app.use(historyRoutes);

// Ranking Routes
app.use(rankingRoutes);

// Statistics Routes
app.use(statisticsRoutes);

// Root path response
if (process.env.NODE_ENV === 'production') {
  app.get("/", (req, res) => {
    res.render("index");
    console.log('index.html');
  });
} else {
  app.get("/", (req, res) => {
    res.render("index");
    console.log('/');
  });
}

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

// Define the rules for Rock-Paper-Scissors
const rules = {
  rock: { beats: 'scissors' },
  paper: { beats: 'rock' },
  scissors: { beats: 'paper' }
};

// Function to determine the winner of a round
function determineRoundWinner(choice1, choice2) {
  if (choice1 === null && choice2 === null) return 'draw';
  if (choice1 === null) return 'player2';
  if (choice2 === null) return 'player1';
  if (choice1 === choice2) return 'draw';
  if ((choice1 === 'rock' && choice2 === 'scissors') ||
      (choice1 === 'paper' && choice2 === 'rock') ||
      (choice1 === 'scissors' && choice2 === 'paper')) {
    return 'player1';
  }
  return 'player2';
}

// Function to update user rankings
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

// Socket.IO event handling
const activeBattles = {};
const playerConnections = new Map();
const ROUND_TIMEOUT = 15000; // 15 seconds for each round

function startRound(uniqueLink) {
  console.log(`Starting round for battle ${uniqueLink}`);
  if (!activeBattles[uniqueLink]) {
    console.log(`Battle ${uniqueLink} no longer exists`);
    return;
  }

  activeBattles[uniqueLink].choices = {};
  io.to(uniqueLink).emit('startRound', {
    currentRound: activeBattles[uniqueLink].rounds + 1,
    totalRounds: activeBattles[uniqueLink].totalRounds
  });

  // Set a timeout for the round
  activeBattles[uniqueLink].roundTimeout = setTimeout(() => {
    endRound(uniqueLink);
  }, ROUND_TIMEOUT);
}

function endRound(uniqueLink) {
  console.log(`Ending round for battle ${uniqueLink}`);
  if (!activeBattles[uniqueLink]) {
    console.log(`Battle ${uniqueLink} no longer exists`);
    return;
  }

  clearTimeout(activeBattles[uniqueLink].roundTimeout);

  const [player1Id, player2Id] = Array.from(activeBattles[uniqueLink].players);
  const choice1 = activeBattles[uniqueLink].choices[player1Id] || null;
  const choice2 = activeBattles[uniqueLink].choices[player2Id] || null;

  const roundWinner = determineRoundWinner(choice1, choice2);

  if (roundWinner === 'player1') {
    activeBattles[uniqueLink].scores.player1++;
  } else if (roundWinner === 'player2') {
    activeBattles[uniqueLink].scores.player2++;
  }

  activeBattles[uniqueLink].rounds++;

  // Save round result and emit to clients
  saveRoundResult(uniqueLink, choice1, choice2, roundWinner);

  // Check if the battle is over
  if (activeBattles[uniqueLink].rounds >= activeBattles[uniqueLink].totalRounds) {
    endBattle(uniqueLink);
  } else {
    // Start next round
    setTimeout(() => startRound(uniqueLink), 3000);
  }
}

async function endBattle(uniqueLink) {
  console.log(`Ending battle ${uniqueLink}`);
  if (!activeBattles[uniqueLink]) {
    console.log(`Battle ${uniqueLink} no longer exists`);
    return;
  }

  const finalWinner = activeBattles[uniqueLink].scores.player1 > activeBattles[uniqueLink].scores.player2 ? 'player1' : 'player2';

  // Save the final winner in MongoDB
  try {
    await Battle.updateOne({ uniqueLink }, {
      $set: { finalWinner, status: 'completed' }
    });
    console.log(`Battle ${uniqueLink} completed with final winner: ${finalWinner}`);
    const battle = await Battle.findOne({ uniqueLink });
    await updateUserRankings(battle.finalWinner, battle.creatorName, battle.invitedName);
  } catch (error) {
    console.error(`Error saving final winner: ${error.message}`);
    console.error(error.stack);
  }

  io.to(uniqueLink).emit('battleResult', {
    finalWinner,
    scores: activeBattles[uniqueLink].scores
  });

  // Mark the battle as completed but don't delete it immediately
  activeBattles[uniqueLink].status = 'completed';
  
  // Set a timeout to delete the battle after some time (e.g., 5 minutes)
  setTimeout(() => {
    if (activeBattles[uniqueLink] && activeBattles[uniqueLink].status === 'completed') {
      delete activeBattles[uniqueLink];
      console.log(`Battle ${uniqueLink} removed from activeBattles after timeout`);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log(`Socket ID ${socket.id} disconnected`);
    for (const [playerId, socketId] of playerConnections.entries()) {
      if (socketId === socket.id) {
        playerConnections.delete(playerId);
        console.log(`Player ${playerId} disconnected`);
        // Handle player disconnection in the battle
        for (const battleId in activeBattles) {
          if (activeBattles[battleId].players.has(playerId)) {
            activeBattles[battleId].players.delete(playerId);
            console.log(`Player ${playerId} removed from battle ${battleId}`);
            io.to(battleId).emit('playerDisconnected', playerId);
          }
        }
        break;
      }
    }
  });

  socket.on('sendMessage', async ({ uniqueLink, message, sender }) => {
    console.log(`Message received: ${message} from ${sender} in battle ${uniqueLink}`);
    const timestamp = new Date();
    try {
        await Battle.updateOne({ uniqueLink }, {
            $push: {
                chatMessages: { sender, message, timestamp }
            }
        });
        io.to(uniqueLink).emit('receiveMessage', { message, sender, timestamp });
    } catch (error) {
        console.error(`Error saving chat message: ${error.message}`);
    }
});


  socket.on('joinBattle', async (data) => {
    console.log('Received joinBattle event with data:', data);
    const { uniqueLink, playerId } = data;
  
    if (!uniqueLink || !playerId) {
      console.error('Invalid joinBattle data:', data);
      socket.emit('error', 'Invalid battle data');
      return;
    }
  
    if (activeBattles[uniqueLink] && activeBattles[uniqueLink].players.has(playerId)) {
      console.log(`Player ${playerId} is already connected to battle ${uniqueLink}`);
      return;
    }
  
    try {
      let battle = await Battle.findOne({ uniqueLink });
      if (!battle) {
        console.log(`Battle ${uniqueLink} not found in database`);
        socket.emit('error', 'Battle not found');
        return;
      }
  
      if (!activeBattles[uniqueLink]) {
        console.log(`Recreating battle in memory for link: ${uniqueLink}`);
        activeBattles[uniqueLink] = {
          players: new Set(),
          choices: {},
          scores: { player1: 0, player2: 0 },
          rounds: battle.results.length,
          totalRounds: battle.rounds,
          creatorName: battle.creatorName || 'Guest',
          invitedName: battle.invitedName || 'Guest',
          status: battle.status
        };
      }
  
      socket.join(uniqueLink);
      playerConnections.set(playerId, socket.id);
  
      if (activeBattles[uniqueLink].players.size < 2) {
        activeBattles[uniqueLink].players.add(playerId);
        console.log(`Players in battle ${uniqueLink}: ${activeBattles[uniqueLink].players.size}`);
      } else {
        console.log(`Battle ${uniqueLink} is full. Rejecting player ${playerId}`);
        socket.emit('error', 'Battle is full. Only two players are allowed.');
        return;
      }
  
      io.to(uniqueLink).emit('playerJoined', activeBattles[uniqueLink].players.size);
  
      if (activeBattles[uniqueLink].players.size === 2 && activeBattles[uniqueLink].status !== 'completed') {
        console.log(`Battle ${uniqueLink} is ready to start or continue`);
        io.to(uniqueLink).emit('startGame');
        if (activeBattles[uniqueLink].rounds < activeBattles[uniqueLink].totalRounds) {
          startRound(uniqueLink);
        }
      }
      const previousMessages = battle.chatMessages || [];
      socket.emit('previousMessages', previousMessages);
  
    } catch (error) {
      console.error(`Error fetching battle: ${error.message}`);
      socket.emit('error', 'Error joining battle');
    }
  });
  
  
  

  socket.on('playerChoice', ({ uniqueLink, choice, playerId }) => {
    console.log(`Player choice received: ${choice} for battle: ${uniqueLink}`);
    if (!activeBattles[uniqueLink]) {
      console.log(`Battle ${uniqueLink} not found`);
      return;
    }

    if (!activeBattles[uniqueLink].players.has(playerId)) {
      console.log(`Invalid player ${playerId} for battle ${uniqueLink}`);
      return;
    }

    activeBattles[uniqueLink].choices[playerId] = choice;
    console.log(`Choices so far:`, activeBattles[uniqueLink].choices);

    // If both players have made their choices, end the round immediately
    if (Object.keys(activeBattles[uniqueLink].choices).length === 2) {
      clearTimeout(activeBattles[uniqueLink].roundTimeout);
      endRound(uniqueLink)}
  });

  socket.on('requestNewGame', ({ uniqueLink, playerId }) => {
    if (!activeBattles[uniqueLink]) {
      console.log(`Battle ${uniqueLink} not found for new game request`);
      socket.emit('error', 'Battle not found');
      return;
    }
    const otherPlayerId = Array.from(activeBattles[uniqueLink].players).find(id => id !== playerId);
    io.to(uniqueLink).emit('newGameRequest', { requestingPlayer: playerId });
  });
  
  socket.on('acceptNewGame', async ({ uniqueLink, playerId }) => {
    console.log(`New game accepted for battle ${uniqueLink}`);
    console.log(`Checking if battle ${uniqueLink} is still active`);

    if (activeBattles[uniqueLink]) {
        activeBattles[uniqueLink].status = 'completed';
        console.log(`Marking the old battle ${uniqueLink} as completed`);
        await Battle.updateOne({ uniqueLink }, { $set: { status: 'completed' } });
    }

    const newUniqueLink = uuidv4();
    console.log(`Creating new game with uniqueLink: ${newUniqueLink}`);
    const oldBattle = activeBattles[uniqueLink];

    try {
        console.log(`Fetching original battle with uniqueLink: ${uniqueLink}`);
        const originalBattle = await Battle.findOne({ uniqueLink });
        if (!originalBattle) {
            throw new Error('Original battle not found in database');
        }

        console.log('Original battle data:', originalBattle);

        const newBattle = new Battle({
            creatorName: originalBattle.creatorName,
            invitedName: originalBattle.invitedName,
            rounds: originalBattle.rounds,
            uniqueLink: newUniqueLink,
            status: 'pending',
            chatMessages: originalBattle.chatMessages // Copy chat messages to new battle
        });

        await newBattle.save();
        console.log('New battle saved with uniqueLink:', newUniqueLink);

        const savedBattle = await Battle.findOne({ uniqueLink: newUniqueLink });
        if (!savedBattle) {
            throw new Error('New battle was not saved successfully');
        }

        activeBattles[newUniqueLink] = {
            players: new Set(oldBattle.players),
            choices: {},
            scores: { player1: 0, player2: 0 },
            rounds: 0,
            totalRounds: savedBattle.rounds,
            status: 'in_progress',
            creatorName: savedBattle.creatorName,
            invitedName: savedBattle.invitedName
        };

        const playersToMove = Array.from(oldBattle.players);
        playersToMove.forEach(pid => {
            const playerSocketId = playerConnections.get(pid);
            const playerSocket = io.sockets.sockets.get(playerSocketId);
            if (playerSocket) {
                playerSocket.leave(uniqueLink);
                playerSocket.join(newUniqueLink);
                console.log(`Player ${pid} moved to new room ${newUniqueLink}`);
                playerSocket.emit('startNewGame', { newUniqueLink });
            } else {
                console.log(`Socket not found for player ${pid}, will be moved when they reconnect`);
            }
        });

        setTimeout(() => {
            console.log(`Starting round for new battle ${newUniqueLink}`);
            startRound(newUniqueLink);
        }, 1000);

        console.log(`Old battle ${uniqueLink} marked as completed, new battle ${newUniqueLink} started`);
    } catch (error) {
        console.error('Error creating new game:', error);
        console.error(error.stack);
        io.to(uniqueLink).emit('error', 'Failed to create new game');
    }
});



  socket.on('rejectNewGame', ({ uniqueLink, playerId }) => {
    if (!activeBattles[uniqueLink]) {
      console.log(`Battle ${uniqueLink} not found for rejecting new game`);
      socket.emit('error', 'Battle not found');
      return;
    }
    io.to(uniqueLink).emit('newGameRejected');
  });

  // Handle chat messages
  socket.on('joinChat', ({ uniqueLink, playerId }) => {
    console.log(`Player ${playerId} joined chat for battle ${uniqueLink}`);
    socket.join(uniqueLink);
  });


  socket.on('error', (error) => {
    console.error(`Socket error: ${error.message}`);
    console.error(error.stack);
  });
});



// Fonctions auxiliaires pour la sauvegarde des résultats
async function saveRoundResult(uniqueLink, choice1, choice2, roundWinner) {
  if (!activeBattles[uniqueLink]) {
    console.log(`Battle ${uniqueLink} not found for saving round result`);
    return;
  }
  try {
    await Battle.updateOne({ uniqueLink }, {
      $push: {
        results: {
          round: activeBattles[uniqueLink].rounds,
          choice1,
          choice2,
          winner: roundWinner
        }
      }
    });
    console.log(`Round ${activeBattles[uniqueLink].rounds} result stored successfully for battle ${uniqueLink}`);
  } catch (error) {
    console.error(`Error saving round result: ${error.message}`);
  }

  io.to(uniqueLink).emit('roundResult', {
    choice1,
    choice2,
    roundWinner,
    scores: activeBattles[uniqueLink].scores,
    currentRound: activeBattles[uniqueLink].rounds,
    totalRounds: activeBattles[uniqueLink].totalRounds
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});
app.use((err, req, res, next) => {
  if (err.status === 400) {
    console.error('Bad Request', err);
  }
  next(err);
});
// server.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });

// const hostname = 'brutasses.ch';
// const httpServer = http.createServer((req, res) => {
//    res.statusCode = 301;
//    res.setHeader('Location', `https://${hostname}${req.url}`);
//    res.end(); // make sure to call send() or end() to send the response
// });
// httpServer.listen(4001);

// server.listen(4000, '0.0.0.0', () => {
//   console.log(`Server running at https://brutasses.ch:4000`);
// });

// const hostname = 'brutasses.ch';
// const httpServer = http.createServer((req, res) => {
//    res.statusCode = 301;
//    res.setHeader('Location', `https://${hostname}${req.url}`);
//    res.end(); // make sure to call send() or end() to send the response
// });
// httpServer.listen(8080);

server.listen(4000, '0.0.0.0', () => {
  console.log(`Server running at https://brutasses.ch:4000`);
});