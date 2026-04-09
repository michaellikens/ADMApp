let currentUsername = null;
const socket = io();

function escapeHTML(str) {
  const p = document.createElement('p');
  p.appendChild(document.createTextNode(str));
  return p.innerHTML;
}

function displayMessage(msg) {
  const chatWindow = document.getElementById("chat-window");
  if (!chatWindow) return;

  const sender = msg.sender || msg.name || 'Unknown';
  const content = msg.content || msg.message || '';
  const pfpUrl = `/uploads/pfps/${sender}.png`;

  const messageBox = document.createElement("div");
  messageBox.className = "message-bubble is-flex";

  if (currentUsername) {
    messageBox.classList.add(sender === currentUsername ? "from-me" : "from-others");
  } else {
    messageBox.classList.add("from-others");
  }

  let localTimeString = '';
  if (msg.timestamp) {
    try {
      const dateObject = new Date(msg.timestamp);
      if (!isNaN(dateObject.getTime())) {
        const timePart = dateObject.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const month = String(dateObject.getMonth() + 1).padStart(2, '0');
        const day = String(dateObject.getDate()).padStart(2, '0');
        const year = String(dateObject.getFullYear()).slice(-2);
        const datePart = `${month}/${day}/${year}`;
        localTimeString = ` <small class="message-timestamp">${datePart} ${timePart}</small>`;
      }
    } catch (e) {}
  }

  messageBox.innerHTML = `
    <img src="${pfpUrl}" alt="${sender}" class="message-pfp">
    <div>
      <div class="message-sender">${sender}${localTimeString}</div>
      <div class="message-text">${content}</div>
    </div>
  `;

  chatWindow.appendChild(messageBox);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function fetchUsername() {
  const messageInputElement = document.getElementById('message-input');
  const sendButtonElement = document.getElementById('send-btn');

  if (messageInputElement) messageInputElement.disabled = true;
  if (sendButtonElement) sendButtonElement.disabled = true;

  try {
    const response = await fetch('/api/session');
    if (response.ok) {
      const data = await response.json();
      currentUsername = data.username;
      console.log('CLIENT: Username set:', currentUsername);

      if (messageInputElement) messageInputElement.disabled = false;
      if (sendButtonElement) sendButtonElement.disabled = false;

      return true;
    } else {
      alert('Could not verify user session. Please log in again.');
      return false;
    }
  } catch (error) {
    alert('Error connecting to server. Please check your connection.');
    return false;
  }
}

function sendMessage() {
  const messageInput = document.getElementById('message-input');
  if (!messageInput) return;

  const messageInputValue = messageInput.value.trim();
  if (!currentUsername || !messageInputValue) return;

  const escapedMessage = escapeHTML(messageInputValue);

  const messageData = {
    name: currentUsername,
    message: escapedMessage,
  };

  console.log('CLIENT: Emitting "chat message":', messageData);
  socket.emit('chat message', messageData);

  messageInput.value = '';
  messageInput.focus();
}

document.addEventListener('DOMContentLoaded', async () => {
  const usernameFetched = await fetchUsername();

  if (usernameFetched) {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-btn');

    if (sendButton) {
      sendButton.addEventListener('click', () => sendMessage());
    }

    if (messageInput) {
      messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') sendMessage();
      });

      messageInput.addEventListener('input', () => {
        socket.emit('typing global', currentUsername);
        // Update character count
        const charCountDisplay = document.getElementById('char-count');
        const currentLength = messageInput.value.length;
        const maxLength = messageInput.getAttribute('maxlength') || 100;
        charCountDisplay.textContent = `${currentLength}/${maxLength}`;
      });
    }

    socket.on('load history', (messages) => {
      const chatWindow = document.getElementById("chat-window");
      if (!chatWindow) return;

      chatWindow.innerHTML = '';
      console.log(`CLIENT: Received ${messages.length} historical messages.`);
      messages.forEach(msg => displayMessage(msg));
      chatWindow.scrollTop = chatWindow.scrollHeight;
    });

    socket.emit('request history');
  }
});


// Typing indicator handler
socket.on("update typing", (usernamesTyping) => {
  const indicator = document.getElementById("typing-indicator");
  if (!indicator) return;

  if (usernamesTyping.length === 0) {
    indicator.classList.add("is-hidden");
    return;
  }

  indicator.classList.remove("is-hidden");

  const current = usernamesTyping.filter(u => u !== currentUsername);
  if (current.length === 0) {
    indicator.classList.add("is-hidden");
    return;
  }

  const formatted = current.map((name, index) => {
    const image = `<img src="/uploads/pfps/${name}.png" class="typing-pfp" alt="${name}">`;
    return `${image} ${name}`;
  });

  let message = "";

  if (formatted.length === 1) {
    message = `${formatted[0]} is typing...`;
  } else if (formatted.length === 2) {
    message = `${formatted[0]} and ${formatted[1]} are typing...`;
  } else if (formatted.length <= 4) {
    message = `${formatted.join(", ")} are typing...`;
  } else {
    const visible = formatted.slice(0, 4).join(", ");
    const others = formatted.length - 4;
    message = `${visible}, and ${others} others are typing...`;
  }

  indicator.innerHTML = message;
});


// Incoming new message
socket.on('chat message', (msg) => {
  const chatWindow = document.getElementById("chat-window");
  if (!chatWindow) return;

  console.log("CLIENT: Received 'chat message':", msg);
  displayMessage(msg);
});

// Error handling
socket.on('connect_error', (err) => {
  console.error('CLIENT: Socket connection error:', err.message);
});

socket.on('load history error', (error) => {
  console.error('CLIENT: Error loading message history:', error.message);
  displayMessage({ sender: 'System', content: 'Error loading previous messages.' });
});
