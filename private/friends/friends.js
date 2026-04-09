// Update profile info (username and profile image)
function updateProfileInfo(username) {
  document.getElementById("username-display").textContent = username;

  const imgEl = document.getElementById("profile-image");
  imgEl.src = `/uploads/pfps/${username}.png`;
  imgEl.alt = username;
  imgEl.onerror = () => {
    imgEl.src = "/logos/defaultPfp.png"; // fallback image
  };
}

// Load friends and display them
async function loadFriends(username) {
  const res = await fetch(`/api/friends/${username}`);
  const data = await res.json();
  const friendList = document.getElementById("friend-list");

  friendList.innerHTML = "";
  if (res.ok && data.friends?.length > 0) {
    data.friends.forEach((friend) => {
      const friendItem = document.createElement("div");
      friendItem.classList.add("friend-item", "box", "is-flex", "is-align-items-center", "is-justify-content-space-between");

      friendItem.innerHTML = `
      <div class="is-flex is-align-items-center">
        <img src="/uploads/pfps/${friend}.png" onerror="this.src='/logos/defaultPfp.png'" class="friend-pfp mr-3" alt="${friend}">
        <span class="username">${friend}</span>
      </div>
      <div class="buttons">
        <button class="button is-danger is-small is-rounded remove-friend" data-username="${friend}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;    
      friendList.appendChild(friendItem);
    });
  } else {
    friendList.innerHTML = "<p>No friends yet!</p>";
  }

  document.querySelectorAll(".remove-friend").forEach((button) => {
    button.addEventListener("click", async () => {
      const usernameToRemove = button.dataset.username;
      const currentUser = document.getElementById("username-display").textContent.trim();

      const res = await fetch(`/api/friends/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUsername: currentUser, toUsername: usernameToRemove }),
      });

      const data = await res.json();
      if (res.ok) {
        button.closest(".friend-item").remove();
      } else {
        alert(`Failed to remove friend: ${data.message}`);
      }
    });
  });
}

// Fetch session and initialize
fetch("/api/session")
  .then((res) => res.json())
  .then((data) => {
    const username = data.username || "Guest";
    updateProfileInfo(username);
    loadFriends(username);
    loadPendingRequests(username);
  })
  .catch(() => {
    updateProfileInfo("Guest");
    loadFriends("Guest");
    loadPendingRequests("Guest");
  });

// Friend request form with Bulma UI state
document.getElementById("friend-request-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const friendUsername = e.target.friendUsername.value.trim();
  const fromUsername = document.getElementById("username-display").textContent.trim();
  const statusBox = document.getElementById("friend-request-status");
  const submitBtn = e.target.querySelector("button[type='submit']");

  // Reset UI state
  statusBox.className = "notification is-hidden";
  submitBtn.classList.remove("is-danger", "is-success");
  submitBtn.classList.add("is-link", "is-loading");
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Sending...`;

  const res = await fetch("/api/friends/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromUsername, toUsername: friendUsername }),
  });

  const data = await res.json();
  submitBtn.classList.remove("is-loading");

  if (res.ok) {
    statusBox.textContent = data.message;
    statusBox.className = "notification is-success is-light mt-3";
    submitBtn.classList.remove("is-link");
    submitBtn.classList.add("is-success");
    submitBtn.innerHTML = `<i class="fas fa-check mr-1"></i> Sent`;

    loadFriends(fromUsername);
    e.target.reset();
  } else {
    statusBox.textContent = data.message;
    statusBox.className = "notification is-danger is-light mt-3";
    submitBtn.classList.remove("is-link");
    submitBtn.classList.add("is-danger");
    submitBtn.innerHTML = `<i class="fas fa-times mr-1"></i> Try Again`;
  }

  setTimeout(() => {
    statusBox.classList.add("is-hidden");
    submitBtn.classList.remove("is-success", "is-danger");
    submitBtn.classList.add("is-link");
    submitBtn.innerHTML = `<i class="fas fa-user-plus mr-1"></i> Add Friend`;
  }, 5000);
});

// Load pending friend requests
async function loadPendingRequests(username) {
  const pendingContainer = document.getElementById("pending-requests");

  try {
    const res = await fetch(`/api/friends/pending/${username}`);
    const data = await res.json();

    pendingContainer.innerHTML = "";

    const seenRequests = new Set();

    // Incoming requests (receivedRequests)
    if (data.received?.length > 0) {
      data.received.forEach((requester) => {
        if (!seenRequests.has(requester)) {
          seenRequests.add(requester);
          const requestItem = document.createElement("div");
          requestItem.classList.add("pending-item", "box", "is-flex", "is-justify-content-space-between", "is-align-items-center");
          requestItem.innerHTML = `
            <div class="is-flex is-align-items-center">
              <img src="/uploads/pfps/${requester}.png" onerror="this.src='/logos/defaultPfp.png'" class="friend-pfp mr-3" alt="${requester}">
              <span class="username">${requester}</span>
            </div>
            <div class="buttons">
              <button class="button is-success is-small is-rounded accept-request" data-username="${requester}">
                <i class="fas fa-check"></i>
              </button>
              <button class="button is-danger is-small is-rounded reject-request" data-username="${requester}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
          pendingContainer.appendChild(requestItem);
        }
      });
    }

    // Outgoing requests (sentRequests)
    if (data.sent?.length > 0) {
      data.sent.forEach((recipient) => {
        if (!seenRequests.has(recipient)) {
          seenRequests.add(recipient);
          const requestItem = document.createElement("div");
          requestItem.classList.add("pending-item", "box", "is-flex", "is-justify-content-space-between", "is-align-items-center");
          requestItem.innerHTML = `
            <div class="is-flex is-align-items-center">
              <img src="/uploads/pfps/${recipient}.png" onerror="this.src='/logos/defaultPfp.png'" class="friend-pfp mr-3" alt="${recipient}">
              <span class="username">${recipient} (Pending)</span>
            </div>
            <div class="buttons">
              <button class="button is-danger is-small is-rounded cancel-request" data-username="${recipient}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
          pendingContainer.appendChild(requestItem);
        }
      });
    }

    // Attach listeners for accept, reject, cancel
    document.querySelectorAll(".accept-request").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fromUsername = btn.dataset.username;
        const toUsername = username;

        btn.classList.add("is-loading");

        const res = await fetch(`/api/friends/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromUsername, toUsername }),
        });

        const result = await res.json();
        btn.classList.remove("is-loading");

        if (res.ok) {
          btn.closest(".pending-item").remove();
          loadFriends(username);
          loadPendingRequests(username);
        } else {
          alert(`Failed to accept: ${result.message}`);
        }
      });
    });

    document.querySelectorAll(".reject-request").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fromUsername = btn.dataset.username;
        const toUsername = username;

        btn.classList.add("is-loading");

        const res = await fetch(`/api/friends/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromUsername, toUsername }),
        });

        const result = await res.json();
        btn.classList.remove("is-loading");

        if (res.ok) {
          btn.closest(".pending-item").remove();
          loadPendingRequests(username);
        } else {
          alert(`Failed to reject: ${result.message}`);
        }
      });
    });

    document.querySelectorAll(".cancel-request").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const toUsername = btn.dataset.username;
        const fromUsername = username;

        btn.classList.add("is-loading");

        const res = await fetch(`/api/friends/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromUsername, toUsername }),
        });

        const result = await res.json();
        btn.classList.remove("is-loading");

        if (res.ok) {
          btn.closest(".pending-item").remove();
        } else {
          alert(`Failed to cancel: ${result.message}`);
        }
      });
    });

    if (pendingContainer.innerHTML === "") {
      pendingContainer.innerHTML = "<p>No pending requests.</p>";
    }
  } catch (err) {
    pendingContainer.innerHTML = "<p>Error loading pending requests.</p>";
  }
}

