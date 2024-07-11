let socket;

document.addEventListener('DOMContentLoaded', () => {
  console.log('Chat script loaded');

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

  // Retrieve uniqueLink from meta tag
  const uniqueLinkMeta = document.querySelector('meta[name="unique-link"]');

  if (!uniqueLinkMeta) {
    console.error('Required meta tags are missing for chat initialization');
    return;
  }

  const uniqueLink = uniqueLinkMeta.content;

  console.log(`Initializing chat for battle: ${uniqueLink}`);
  console.log(`Current player ID: ${playerId}`);

  // Initialiser socket une seule fois
  if (!socket) {
    socket = io();

    socket.on('connect', () => {
      console.log('Connected to Socket.IO');
      socket.emit('joinChat', { uniqueLink, playerId });
    });

    socket.on('receiveMessage', (data) => {
      console.log('Received message:', data);
      addMessageToChat(data.message, data.sender, data.timestamp, data.sender === playerId);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message !== '') {
      console.log(`Sending message: ${message}`);
      socket.emit('sendMessage', { uniqueLink, message, sender: playerId });
      messageInput.value = '';
    }
  }

  function addMessageToChat(message, sender, timestamp, isSent) {
    const chatBox = document.getElementById('chatBox');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;

    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.textContent = sender;

    const timeElement = document.createElement('div');
    timeElement.className = 'chat-time';
    timeElement.textContent = new Date(timestamp).toLocaleTimeString();

    const contentElement = document.createElement('div');
    contentElement.className = 'content';
    contentElement.textContent = message;

    messageElement.appendChild(senderElement);
    messageElement.appendChild(timeElement);
    messageElement.appendChild(contentElement);

    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
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
});
