const chatPartnerHeader = document.getElementById('chat-partner-header');
const chatPartnerNameDisplay = document.getElementById('chat-partner-name');
const chatPartnerPfpContainer = document.getElementById('chat-partner-pfp-container');
const chatWindow = document.getElementById("chat-window");

const socket = io();

let selectedFriend = null;
let currentUsername = null;

async function loadFriends() {
  const username = document.getElementById("username-display").textContent.trim();
  const res = await fetch(`/api/friends/${username}`);
  const data = await res.json();
  const friendList = document.getElementById("friend-list");

  friendList.innerHTML = "";

  if (res.ok && data.friends && data.friends.length > 0) {
    data.friends.forEach((friend) => {
      const friendItem = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      a.classList.add("friend-link");
      if (friend === selectedFriend) a.classList.add("is-active");

      // Add profile picture and name
      a.innerHTML = `
        <img src="/Uploads/pfps/${friend}.png" alt="${friend}" 
             onerror="this.src='/logos/defaultPfp.png'" 
             style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px; vertical-align: middle;">
        <span>${friend}</span>
      `;

      a.onclick = async (e) => {
        e.preventDefault();

        document.querySelectorAll("#friend-list .friend-link").forEach(link => {
          link.classList.remove("is-active");
        });
        a.classList.add("is-active");

        selectedFriend = friend;

        // Update chat partner header
        if (chatPartnerHeader && chatPartnerNameDisplay) {
          chatPartnerNameDisplay.textContent = selectedFriend;
          chatPartnerHeader.style.display = "flex";

          if (chatPartnerPfpContainer) {
            chatPartnerPfpContainer.innerHTML = `
              <img src="/Uploads/pfps/${friend}.png" 
                   alt="${friend}" 
                   onerror="this.src='/logos/defaultPfp.png'" 
                   style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
            `;
          }
        }

        document.querySelector(".message-box").style.display = "block";

        await loadMessages(friend);
      };

      friendItem.appendChild(a);
      friendList.appendChild(friendItem);
    });
  } else {
    friendList.innerHTML = "<p>No friends yet!</p>";
  }
}

function escapeHTML(str) {
  const p = document.createElement('p');
  p.appendChild(document.createTextNode(str));
  return p.innerHTML;
}

async function loadMessages(friend) {
  const sender = currentUsername;
  if (!sender) {
    console.error("Cannot load messages: current username unknown.");
    return;
  }
  const res = await fetch(`/api/messages/${friend}?sender=${sender}`);
  const data = await res.json();

  chatWindow.innerHTML = "";

  if (res.ok && Array.isArray(data) && data.length > 0) {
    data.forEach((msg) => {
      appendMessageBubble(msg);
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } else {
    // Show "No messages yet" instead of placeholder
    chatWindow.innerHTML = `
      <div class="placeholder-container" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
        <p class="has-text-centered has-text-grey">No messages yet. Start the conversation!</p>
      </div>
    `;
  }

  // Ensure message box and header remain visible
  document.querySelector(".message-box").style.display = "block";
  if (chatPartnerHeader) chatPartnerHeader.style.display = "flex";
}

function appendMessageBubble(msg) {
  const isFromMe = msg.senderId === currentUsername;

  const bubble = document.createElement("div");
  bubble.classList.add("message-bubble");
  bubble.classList.add(isFromMe ? "from-me" : "from-others");
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";

  let localTimeString = '';
  if (msg.timestamp) {
    try {
      const dateObject = new Date(msg.timestamp);
      const timePart = dateObject.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const month = String(dateObject.getMonth() + 1).padStart(2, '0');
      const day = String(dateObject.getDate()).padStart(2, '0');
      const year = String(dateObject.getFullYear()).slice(-2);
      const datePart = `${month}/${day}/${year}`;
      localTimeString = ` <small class="message-timestamp">${datePart} ${timePart}</small>`;
    } catch (e) {
      console.error("Invalid timestamp:", e);
    }
  }

  // Create PFP inside bubble
  const pfp = document.createElement("img");
  pfp.src = `/Uploads/pfps/${msg.senderId}.png`;
  pfp.onerror = () => { pfp.src = "/logos/defaultPfp.png"; };
  pfp.alt = msg.senderId;
  pfp.style.width = "32px";
  pfp.style.height = "32px";
  pfp.style.borderRadius = "50%";
  pfp.style.objectFit = "cover";
  pfp.style.marginRight = "8px";

  const textContainer = document.createElement("div");
  textContainer.innerHTML = `
    <div class="message-sender">${msg.senderId}${localTimeString}</div>
    <div class="message-text">${msg.messageText}</div>
  `;

  bubble.appendChild(pfp);
  bubble.appendChild(textContainer);

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function updatePlaceholder() {
  const theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
  const imageSrc = theme === "dark" ? "/logos/selectConvoDark.png" : "/logos/selectConvo.png";
  chatWindow.innerHTML = `
    <div class="placeholder-container" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
      <img src="${imageSrc}" alt="Select a conversation" class="placeholder-image" style="max-width: 300px; width: 100%; height: auto; opacity: 0.8;" />
    </div>
  `;
  // Hide message box and header
  document.querySelector(".message-box").style.display = "none";
  if (chatPartnerHeader) chatPartnerHeader.style.display = "none";
}

document.getElementById("message-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    document.getElementById("send-btn").click();
  }
});

// Update character count for message input
document.getElementById("message-input").addEventListener("input", () => {
  const input = document.getElementById("message-input");
  const charCountDisplay = document.getElementById("char-count");
  const currentLength = input.value.length;
  const maxLength = input.getAttribute("maxlength") || 100;
  charCountDisplay.textContent = `${currentLength}/${maxLength}`;
});

document.getElementById("send-btn").addEventListener("click", async () => {
  const input = document.getElementById("message-input");
  const rawContent = input.value.trim();
  const sender = currentUsername;

  if (!rawContent || !selectedFriend || !sender) return;

  const escapedContent = escapeHTML(rawContent);
  const timestamp = new Date();

  const messageData = {
    senderId: sender,
    receiverId: selectedFriend,
    messageText: escapedContent,
    timestamp: timestamp.toISOString(),
  };

  socket.emit("private message", messageData);
  input.value = "";
});

socket.on("private message", (msg) => {
  if (!currentUsername) return;

  const isFromSelectedFriend =
    (msg.senderId === selectedFriend && msg.receiverId === currentUsername) ||
    (msg.senderId === currentUsername && msg.receiverId === selectedFriend);

  if (!isFromSelectedFriend) return;

  appendMessageBubble(msg);
});

// Typing Indicator System
const typingUsers = new Map(); // socket.id => username

document.getElementById("message-input").addEventListener("input", () => {
  if (currentUsername && selectedFriend) {
    console.log(`[CLIENT] ${currentUsername} is typing to ${selectedFriend}`);
    socket.emit("typing DM", { sender: currentUsername, target: selectedFriend });
  }
});

socket.on("update typing", (usernamesTyping) => {
  const indicator = document.getElementById("typing-indicator");
  if (!indicator || !currentUsername) return;

  const current = usernamesTyping.filter(u => u !== currentUsername);
  if (current.length === 0) {
    indicator.classList.add("is-hidden");
    return;
  }

  indicator.classList.remove("is-hidden");

  const formatted = current.map(name => {
    const image = `<img src="/Uploads/pfps/${name}.png" class="typing-pfp" alt="${name}">`;
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

document.getElementById("toggle-sidebar").addEventListener("click", () => {
  document.getElementById("nav-sidebar").classList.toggle("is-hidden");
});

document.getElementById("toggle-theme").addEventListener("click", () => {
  const body = document.body;
  const icon = document.querySelector("#toggle-theme i");

  body.classList.toggle("dark-mode");
  icon.classList.toggle("fa-sun");
  icon.classList.toggle("fa-moon");

  const theme = body.classList.contains("dark-mode") ? "dark" : "light";
  localStorage.setItem("theme", theme);

  if (!selectedFriend) {
    updatePlaceholder();
  }
});

fetch("/api/session")
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  })
  .then((data) => {
    currentUsername = data.username;
    socket.emit("joinDM", { username: currentUsername });
    document.getElementById("username-display").textContent = currentUsername;

    const imgEl = document.getElementById("profile-image");
    imgEl.src = `/Uploads/pfps/${currentUsername}.png`;
    imgEl.alt = currentUsername;

    // Show placeholder initially
    updatePlaceholder();

    // Load friends but do not select any friend or load messages
    return loadFriends();
  })
  .catch((error) => {
    console.error("Error during initial load:", error);
    document.getElementById("username-display").textContent = "Guest";
    document.getElementById("friend-list").innerHTML = "<li><p class='p-2 has-text-danger'>Error loading session.</p></li>";
    chatWindow.innerHTML = "<p class='has-text-centered has-text-danger placeholder-message'>Could not load user session.</p>";
    if (chatPartnerHeader) {
      chatPartnerHeader.style.display = 'none';
    }
    document.querySelector(".message-box").style.display = "none";
    currentUsername = null;
  });

// Ensure placeholder is updated on page load
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    document.querySelector("#toggle-theme i").classList.replace("fa-moon", "fa-sun");
  }
  updatePlaceholder();
});
