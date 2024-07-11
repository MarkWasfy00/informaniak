document.addEventListener('DOMContentLoaded', () => {
  
  function generateGuestId() {
    return 'guest-' + Math.random().toString(36).substr(2, 9);
  }

  // Check if playerId exists in localStorage
  let playerId = localStorage.getItem('playerId');
  if (!playerId) {
    // If not, generate a new one and store it in localStorage
    playerId = generateGuestId();
    localStorage.setItem('playerId', playerId);
  }
  const { uniqueLink } = window.APP_CONFIG;

  if (!uniqueLink || !playerId) {
    console.error('unique-link or player-id is empty. Check your server-side rendering.');
    return;  // Stop execution if values are empty
  }

  // const socket = io();
  const socket = io("https://brutasses.ch:4000");

  let timerInterval;
  let newGameRequested = false;

  console.log(`Joining battle with link: ${uniqueLink} and player ID: ${playerId}`);

  socket.on('previousMessages', (messages) => {
    messages.forEach(({ sender, message, timestamp }) => {
      addMessageToChatBox(sender, message, timestamp);
    });
  });

  socket.on('receiveMessage', ({ message, sender, timestamp }) => {
    addMessageToChatBox(sender, message, timestamp);
  });
  function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message !== '') {
      console.log(`Sending message: ${message}`);
      socket.emit('sendMessage', { uniqueLink, message, sender: playerId });
      messageInput.value = '';
    }
  }

  function addMessageToChatBox(sender, message, timestamp) {
    const chatBox = document.getElementById('chatBox');
    const messageElement = document.createElement('div');
    const isCurrentUser = sender === playerId;

    messageElement.classList.add('message', isCurrentUser ? 'sent' : 'received');

    const senderElement = document.createElement('div');
    senderElement.classList.add('sender');
    senderElement.innerText = sender;

    const timeElement = document.createElement('div');
    timeElement.classList.add('chat-time');
    timeElement.innerText = new Date(timestamp).toLocaleTimeString();

    const messageContent = document.createElement('div');
    messageContent.classList.add('content');
    messageContent.innerText = message;

    messageElement.appendChild(senderElement);
    messageElement.appendChild(timeElement);
    messageElement.appendChild(messageContent);

    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
  }

  const sendButton = document.getElementById('sendButton');
  if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
  } else {
    console.error('Send button not found');
  }

  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        sendMessage();
      }
    });
  } else {
    console.error('Message input not found');
  }

  socket.emit('joinBattle', { uniqueLink, playerId });

  socket.on('playerJoined', (playerCount) => {
    console.log(`Player joined. Current player count: ${playerCount}`);
    if (playerCount === 1) {
      document.getElementById('status').innerText = 'Waiting for another player to join...';
    } else if (playerCount === 2) {
      document.getElementById('status').innerText = 'Both players have joined. The game will start soon!';
      document.getElementById('shareContainer').classList.add('d-none');
      startCountdown();
    }
    document.getElementById('game').style.display = 'none';
  });

  function startCountdown() {
    const countdownElement = document.getElementById('countdown');
    countdownElement.classList.remove('d-none');
    document.getElementById('game').classList.add('d-none');
    let countdown = 3;
    countdownElement.innerText = countdown;

    const countdownInterval = setInterval(() => {
      countdown -= 1;
      countdownElement.innerText = countdown;

      if (countdown === 0) {
        clearInterval(countdownInterval);
        countdownElement.classList.add('d-none');
        document.getElementById('game').classList.remove('d-none');

        socket.emit('startGame');
      }
    }, 1000);
  }

  socket.on('startGame', () => {
    console.log('Game is starting');
    document.getElementById('status').innerText = 'Both players are connected. The game is starting now!';
    document.getElementById('chatContainer').classList.remove('d-none');

    startTimer();
  });

  socket.on('startRound', ({ currentRound, totalRounds }) => {
    document.getElementById('status').innerText = `Round ${currentRound}/${totalRounds} is starting!`;
    startTimer();
  });

  socket.on('roundResult', ({ choice1, choice2, roundWinner, scores, currentRound, totalRounds }) => {
    clearInterval(timerInterval);
    let resultMessage = `Round ${currentRound}/${totalRounds}: Player 1 chose ${choice1}, Player 2 chose ${choice2}. `;
    if (roundWinner === 'draw') {
      resultMessage += "It's a draw!";
    } else {
      resultMessage += `${roundWinner === 'player1' ? 'Player 1' : 'Player 2'} wins this round!`;
    }
    document.getElementById('status').innerText = resultMessage;
    document.getElementById('scores').innerText = `Scores - Player 1: ${scores.player1}, Player 2: ${scores.player2}`;
    document.getElementById('game').style.display = 'none';
  });

  socket.on('battleResult', ({ finalWinner, scores }) => {
    document.getElementById('status').innerText = `${finalWinner === 'player1' ? 'Player 1' : 'Player 2'} wins the battle! Final Scores - Player 1: ${scores.player1}, Player 2: ${scores.player2}`;
    document.getElementById('game').style.display = 'none';

    // Show the New Game button
    document.getElementById('newGameContainer').style.display = 'block';
  });

  // New Game button event listener
  document.getElementById('newGameButton').addEventListener('click', () => {
    if (!newGameRequested) {
      newGameRequested = true;
      socket.emit('requestNewGame', { uniqueLink, playerId });
      document.getElementById('newGameContainer').style.display = 'none';
      document.getElementById('status').innerText = 'Waiting for other player to accept...';
    }
  });

  // Listen for new game request from the other player
  socket.on('newGameRequest', () => {
    if (!newGameRequested) {
      if (confirm('The other player wants to start a new game. Do you accept?')) {
        socket.emit('acceptNewGame', { uniqueLink, playerId });
      } else {
        socket.emit('rejectNewGame', { uniqueLink, playerId });
      }
      newGameRequested = true; // Set this to true to avoid multiple alerts
    }
  });

  // Listen for new game start
  socket.on('startNewGame', (data) => {
    newGameRequested = false;
    document.getElementById('status').innerText = 'New game starting!';
    document.getElementById('scores').innerText = '';
    const newUniqueLink = data.newUniqueLink;
    console.log(`Starting new game with link: ${newUniqueLink}`);

    // Update the meta tag with the new uniqueLink
    const uniqueLinkMeta = document.querySelector('meta[name="unique-link"]');
    if (uniqueLinkMeta) {
      uniqueLinkMeta.content = newUniqueLink;
    } else {
      console.error('Meta tag for unique-link not found');
    }

    // Reconnect to the new battle
    window.location.href = `/battle/${newUniqueLink}`;
  });

  function resetGameState() {
    document.getElementById('game').style.display = 'none';
    document.getElementById('newGameContainer').style.display = 'none';
    // Reset any other game-related variables or UI elements
  }

  socket.on('connect', () => {
    console.log('Reconnected to server, rejoining battle');
    
    // Utilisez les variables définies précédemment
    const { uniqueLink } = window.APP_CONFIG;
    let playerId = localStorage.getItem('playerId');
    
    // Vérifiez si uniqueLink et playerId existent
    if (uniqueLink && playerId) {
      socket.emit('joinBattle', { uniqueLink, playerId });
    } else {
      console.error('unique-link or player-id is missing.');
    }
  });
  
  socket.on('error', (errorMessage) => {
    console.error('Received error from server:', errorMessage);
    document.getElementById('status').innerText = `Error: ${errorMessage}`;
  });

  // Listen for new game rejection
  socket.on('newGameRejected', () => {
    document.getElementById('status').innerText = 'The other player declined the new game.';
    document.getElementById('newGameContainer').style.display = 'block';
  });

  socket.on('turnNotification', ({ playerId }) => {
    if (playerId === document.querySelector('meta[name="player-id"]').content) {
      displayNotification('It\'s your turn!', 'Please make your choice.');
    }
  });

  socket.on('reminderNotification', ({ playerId }) => {
    if (playerId === document.querySelector('meta[name="player-id"]').content) {
      displayNotification('Reminder', 'You haven\'t made your choice yet. Please make your choice.');
    }
  });

  function startTimer() {
    let timeLeft = 10;
    const timerElement = document.getElementById('timeLeft');
    document.getElementById('game').style.display = 'block';
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      timerElement.innerText = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        document.getElementById('status').innerText = 'Time is up!';
        socket.emit('playerChoice', { uniqueLink, choice: null, playerId });
        document.getElementById('game').style.display = 'none';
      }
    }, 1000);
  }

  function makeChoice(choice) {
    clearInterval(timerInterval);
    document.getElementById('status').innerText = `You chose ${choice}. Waiting for other player...`;
    document.getElementById('game').style.display = 'none';
    console.log(`Sending choice: ${choice} for battle: ${uniqueLink}`);
    socket.emit('playerChoice', { uniqueLink, choice, playerId });
  }

  function displayNotification(title, message) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body: message });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body: message });
        }
      });
    }
  }

  document.getElementById('rock').addEventListener('click', () => makeChoice('rock'));
  document.getElementById('paper').addEventListener('click', () => makeChoice('paper'));
  document.getElementById('scissors').addEventListener('click', () => makeChoice('scissors'));
});
