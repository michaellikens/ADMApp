const http = require("http");
const socketio = require("socket.io");
const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const session = require("express-session");

const connectDB = require("./db");
const User = require("./models/user");
const Message = require("./models/messages"); // Added require
const Friends = require("./models/friend");
const DMMessage = require("./models/dms");
const generatePfp = require("./utils/generatePfp");
const fs = require("fs");
const { promisify } = require("util");
const unlinkAsync = promisify(fs.unlink);

const app = express();
connectDB();

// Middleware
app.use(express.json());

// Session setup
app.use(
  session({
    secret: "superSecretSessionKey",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set to true if using HTTPS
  })
);

// Route guard (check if user is logged in or not before serving file)
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.redirect("/");
  }
}

// Routes

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login-signup", "login.html"));
});

app.get("/home/home.html", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private", "home", "home.html"));
});

app.get("/home/home.js", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private/home/home.js"));
});

app.get("/conversations/conversations.html", isAuthenticated, (req, res) => {
  res.sendFile(
    path.join(__dirname, "private/conversations/conversations.html")
  );
});

app.get("/conversations/conversations.js", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private/conversations/conversations.js"));
});

app.get("/friends/friends.html", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private/friends/friends.html"));
});

app.get("/friends/friends.js", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private/friends/friends.js"));
});

app.get("/home/home.js", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private/home/home.js"));
});

app.get("/settings/settings.js", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private/settings/settings.js"));
});

app.get("/groupchats/groupchats.js", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private/groupchats/groupchats.js"));
});

app.get("/groupchats/groupchats.html", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private/groupchats/groupchats.html"));
});

app.get("/load.html", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private", "load", "load.html"));
});

app.get("/settings/settings.html", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private", "settings", "settings.html"));
});

app.get("/globalchat/globalchat.html", isAuthenticated, (req, res) => {
  res.sendFile(
    path.join(__dirname, "private", "globalchat", "globalchat.html")
  );
});

app.get("/globalchat/globalchat.js", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "private", "globalchat", "globalchat.js"));
});
// our own api

// getting username
app.get("/api/session", async (req, res) => {
  if (req.session && req.session.user) {
    const user = await User.findOne({ username: req.session.user });
    if (user) {
      return res.json({
        username: user.username,
        profilePicture: user.profilePicture || "",
      });
    }
  }
  res.status(401).json({ error: "Unauthorized" });
});

app.get("/users/check-availability/:username", async (req, res) => {
  try {
    const usernameToCheck = req.params.username.trim().toLowerCase();

    if (!usernameToCheck) {
      return res
        .status(400)
        .json({ message: "Username parameter is required." });
    }

    const existingUser = await User.findOne({ username: usernameToCheck });

    if (existingUser) {
      res.json({ available: false, message: "Username is already taken" });
    } else {
      res.json({ available: true, message: "Username is available" });
    }
  } catch (error) {
    console.error("Username check error:", error);
    res.status(500).json({ message: "Error checking username availability." });
  }
});

app.post("/users", async (req, res) => {
  try {
    const username = req.body.name.trim();
    const plainPassword = req.body.password;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).send("Username already taken");
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const newUser = new User({
      username: username,
      password: hashedPassword,
    });

    await newUser.save();

    // ✅ Add new user to Friends collection
    await Friends.create({
      username: username,
      friendswith: [],
      sentRequests: [],
      receivedRequests: [],
    });

    // Generate profile picture
    const filePath = await generatePfp(username); // This should return the file path
    newUser.profilePicture = filePath;
    await newUser.save(); // Save the path to the database

    res.status(201).send("User created successfully");
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).send("Server error during signup");
  }
});

app.post("/users/login", async (req, res) => {
  try {
    const username = req.body.name.trim();
    const plainPassword = req.body.password;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).send("Invalid username or password");
    }

    const isMatch = await bcrypt.compare(plainPassword, user.password);

    if (isMatch) {
      req.session.user = user.username;
      console.log("[LOGIN SUCCESS] session.user set to:", req.session.user);
      res.status(200).send("Success!");
    } else {
      console.log("[LOGIN FAILED] Password mismatch");
      res.status(401).send("Invalid username or password");
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).send("Server error during login");
  }
});

app.get("/logout", (req, res) => {
  console.log("[LOGOUT] Destroying session");
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Logout failed");
    }
    res.redirect("/"); // send user back to login page once log out pressed
  });
});

app.use(express.static(path.join(__dirname, "public"), { index: false }));

const PORT = process.env.PORT || 3003;
const server = http.createServer(app);
const io = socketio(server);
const typingUsers = new Map(); // socket.id => username
const activeUsers = new Map(); // username => Set of socket IDs

io.on("connection", async (socket) => {
  console.log("[SOCKET.IO] Connected:", socket.id);

  // DM Join
  socket.on("joinDM", ({ username }) => {
    if (!username) return;
    socket.join(username);
    if (!activeUsers.has(username)) activeUsers.set(username, new Set());
    activeUsers.get(username).add(socket.id);
    console.log(`[JOIN DM] ${username} joined room with socket ${socket.id}`);
  });

  // DM Typing
  socket.on("typing DM", ({ sender, target }) => {
    console.log(`[TYPING DM] ${sender} -> ${target}`);
    if (!sender || !target) return;
    const targetSockets = activeUsers.get(target);
    if (!targetSockets) return;

    for (const id of targetSockets) {
      io.to(id).emit("update typing", [sender]);
    }

    clearTimeout(socket.typingTimeout);
    socket.typingTimeout = setTimeout(() => {
      for (const id of targetSockets) {
        io.to(id).emit("update typing", []);
      }
    }, 3000);
  });

  // Global Typing
  socket.on("typing global", (username) => {
    typingUsers.set(socket.id, username);
    console.log(`[TYPING GLOBAL] ${username} on socket ${socket.id}`);
    io.emit("update typing", Array.from(typingUsers.values()));

    clearTimeout(socket.typingTimeout);
    socket.typingTimeout = setTimeout(() => {
      typingUsers.delete(socket.id);
      io.emit("update typing", Array.from(typingUsers.values()));
    }, 3000);
  });

  // Global Chat
  socket.on("chat message", async (msg) => {
    console.log("[CHAT MESSAGE] Received:", msg);
    if (!msg || !msg.name || !msg.message) return;
    try {
      const newMessage = new Message({ sender: msg.name, content: msg.message });
      const saved = await newMessage.save();
      io.emit("chat message", saved);
      console.log("[CHAT MESSAGE] Saved and broadcasted:", saved);
    } catch (err) {
      console.error("[CHAT MESSAGE] Error saving:", err);
    }
  });

  // DM Chat
  socket.on("private message", async (msg) => {
    const { senderId, receiverId, messageText } = msg;
    console.log(`[DM MESSAGE] ${senderId} -> ${receiverId}: ${messageText}`);
    if (!senderId || !receiverId || !messageText) return;
    try {
      const newMsg = new DMMessage({ senderId, receiverId, messageText });
      const saved = await newMsg.save();
      io.to(receiverId).to(senderId).emit("private message", saved);
    } catch (err) {
      console.error("[DM MESSAGE] Error saving:", err);
    }
  });

  // Load Global History
  try {
    const history = await Message.find().sort({ timestamp: 1 }).limit(100);
    socket.emit("load history", history);
    console.log("[LOAD HISTORY] Sent initial global history");
  } catch (err) {
    console.error("[LOAD HISTORY] Error:", err);
  }

  // Client Request History
  socket.on("request history", async () => {
    try {
      const history = await Message.find().sort({ timestamp: 1 }).limit(100);
      socket.emit("load history", history);
      console.log("[REQUEST HISTORY] Served global history");
    } catch (err) {
      console.error("[REQUEST HISTORY] Error:", err);
      socket.emit("load history error", { message: "Failed to load history." });
    }
  });

  // Disconnect cleanup
  socket.on("disconnect", () => {
    for (const [username, sockets] of activeUsers.entries()) {
      sockets.delete(socket.id);
      if (sockets.size === 0) activeUsers.delete(username);
    }
    typingUsers.delete(socket.id);
    io.emit("update typing", Array.from(typingUsers.values()));
    console.log("[SOCKET.IO] Disconnected:", socket.id);
  });
});


app.post("/api/friends/add", async (req, res) => {
  const { fromUsername, toUsername } = req.body;

  if (!fromUsername || !toUsername || fromUsername === toUsername)
    return res.status(400).json({ message: "Invalid usernames" });

  try {
    const fromUser = await Friends.findOne({ username: fromUsername });
    const toUser = await Friends.findOne({ username: toUsername });

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: "User(s) not found" });
    }

    if (fromUser.friendswith.includes(toUsername)) {
      return res.status(400).json({ message: "Already friends" });
    }

    if (toUser.sentRequests.includes(fromUsername)) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    toUser.receivedRequests.push(fromUsername);
    fromUser.sentRequests.push(toUsername);

    await toUser.save();
    await fromUser.save();

    return res.json({ message: "Friend request sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send friend request" });
  }
});

app.get("/api/friends/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const user = await Friends.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ friends: user.friendswith });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Username
app.post("/api/settings/username", async (req, res) => {
  const { currentUsername, newUsername } = req.body;

  if (!currentUsername || !newUsername) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const user = await User.findOne({ username: currentUsername });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldPath = path.join(__dirname, "public", "uploads", "pfps", `${currentUsername}.png`);
    const color = user.profileColor || "#ef4444";

    // Update User collection
    user.username = newUsername;
    if (fs.existsSync(oldPath)) await unlinkAsync(oldPath);
    const newPfpPath = await generatePfp(newUsername, color);
    user.profilePicture = newPfpPath;
    await user.save();

    // Update Friends collection - own document
    const friendRecord = await Friends.findOne({ username: currentUsername });
    if (friendRecord) {
      friendRecord.username = newUsername;
      await friendRecord.save();
    }

    // Update Friends collection - all other docs containing currentUsername
    await Friends.updateMany(
      { friendswith: currentUsername },
      { $set: { "friendswith.$[elem]": newUsername } },
      { arrayFilters: [{ "elem": currentUsername }] }
    );

    await Friends.updateMany(
      { sentRequests: currentUsername },
      { $set: { "sentRequests.$[elem]": newUsername } },
      { arrayFilters: [{ "elem": currentUsername }] }
    );

    await Friends.updateMany(
      { receivedRequests: currentUsername },
      { $set: { "receivedRequests.$[elem]": newUsername } },
      { arrayFilters: [{ "elem": currentUsername }] }
    );

    // Update DM messages (senderId and receiverId)
    await DMMessage.updateMany(
      { senderId: currentUsername },
      { $set: { senderId: newUsername } }
    );
    await DMMessage.updateMany(
      { receiverId: currentUsername },
      { $set: { receiverId: newUsername } }
    );

// Update global messages (sender field)
await Message.updateMany(
  { sender: currentUsername },
  { $set: { sender: newUsername } }
);


    // Update session
    req.session.user = newUsername;

    res.json({ message: "Username and profile picture updated!" });
  } catch (err) {
    console.error("Username update error:", err);
    res.status(500).json({ message: "Server error during username change" });
  }
});


// Update Password
app.post("/api/settings/password", isAuthenticated, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.updateOne(
      { username: req.session.user },
      { $set: { password: hashed } }
    );

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Profile Color
app.post("/api/settings/newpfp", async (req, res) => {
  const { username, color } = req.body;
  if (!username || !color) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete old pfp
    if (user.profilePicture && fs.existsSync(user.profilePicture)) {
      fs.unlinkSync(user.profilePicture);
    }

    // Generate new pfp
    const filePath = await generatePfp(username, color);
    user.profilePicture = filePath;
    await user.save();

    res.json({ message: "Profile picture updated" });
  } catch (err) {
    console.error("PFP Update Error:", err);
    res.status(500).json({ message: "Failed to update profile picture" });
  }
});

app.post("/api/friends/remove", async (req, res) => {
  const { fromUsername, toUsername } = req.body;

  if (!fromUsername || !toUsername) {
    return res.status(400).json({ message: "Missing usernames" });
  }

  if (fromUsername === toUsername) {
    return res.status(400).json({ message: "You cannot remove yourself" });
  }

  try {
    let sender = await Friends.findOne({ username: fromUsername });
    let receiver = await Friends.findOne({ username: toUsername });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "User(s) not found" });
    }

    if (
      !sender.friendswith.includes(toUsername) ||
      !receiver.friendswith.includes(fromUsername)
    ) {
      return res.status(400).json({ message: "These users are not friends" });
    }

    sender.friendswith = sender.friendswith.filter(
      (friend) => friend !== toUsername
    );
    receiver.friendswith = receiver.friendswith.filter(
      (friend) => friend !== fromUsername
    );

    await sender.save();
    await receiver.save();

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove friend" });
  }
});

app.get("/conversations/:friend", (req, res) => {
  res.sendFile(
    path.join(__dirname, "private/conversations/conversations.html")
  );
});

app.get("/api/messages/:friend", async (req, res) => {
  const friendUsername = req.params.friend;
  const currentUsername = req.session.user;

  if (!currentUsername) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const messages = await DMMessage.find({
      $or: [
        { senderId: currentUsername, receiverId: friendUsername },
        { senderId: friendUsername, receiverId: currentUsername },
      ],
    }).sort({ timestamp: 1 }); // Sort by time

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/friends/pending/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const user = await Friends.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      received: user.receivedRequests || [],
      sent: user.sentRequests || [],
    });
  } catch (err) {
    console.error("Pending request error:", err);
    res.status(500).json({ message: "Error fetching pending requests" });
  }
});

// Cancel outgoing friend request

app.post("/api/friends/cancel", async (req, res) => {
  const { fromUsername, toUsername } = req.body;

  if (!fromUsername || !toUsername) {
    return res.status(400).json({ message: "Invalid usernames" });
  }

  try {
    const fromUser = await Friends.findOne({ username: fromUsername });
    const toUser = await Friends.findOne({ username: toUsername });

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: "User(s) not found" });
    }

    fromUser.sentRequests = fromUser.sentRequests.filter(
      (user) => user !== toUsername
    );
    toUser.receivedRequests = toUser.receivedRequests.filter(
      (user) => user !== fromUsername
    );

    await fromUser.save();
    await toUser.save();

    res.json({ message: "Friend request canceled" });
  } catch (err) {
    console.error("Error canceling friend request:", err);
    res.status(500).json({ message: "Failed to cancel friend request" });
  }
});


// POST accept a friend request
app.post("/api/friends/accept", async (req, res) => {
  const { fromUsername, toUsername } = req.body;

  if (!fromUsername || !toUsername) {
    return res.status(400).json({ message: "Missing usernames" });
  }

  try {
    const [fromUser, toUser] = await Promise.all([
      Friends.findOne({ username: fromUsername }),
      Friends.findOne({ username: toUsername }),
    ]);

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: "User(s) not found" });
    }

    // Check if there's a pending request from 'fromUsername' to 'toUsername'
    if (!toUser.receivedRequests.includes(fromUsername)) {
      return res
        .status(400)
        .json({ message: "No pending request from this user" });
    }

    // Update friendship
    fromUser.friendswith.push(toUsername);
    toUser.friendswith.push(fromUsername);

    // Remove the request from 'receivedRequests' and 'sentRequests'
    toUser.receivedRequests = toUser.receivedRequests.filter(
      (user) => user !== fromUsername
    );
    fromUser.sentRequests = fromUser.sentRequests.filter(
      (user) => user !== toUsername
    );

    await fromUser.save();
    await toUser.save();

    return res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error accepting friend request" });
  }
});

app.post("/api/friends/reject", async (req, res) => {
  const { fromUsername, toUsername } = req.body;

  if (!fromUsername || !toUsername) {
    return res.status(400).json({ message: "Invalid usernames" });
  }

  try {
    const fromUser = await Friends.findOne({ username: fromUsername });
    const toUser = await Friends.findOne({ username: toUsername });

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: "User(s) not found" });
    }

    // Remove the request from the pending list
    fromUser.sentRequests = fromUser.sentRequests.filter(
      (user) => user !== toUsername
    );
    toUser.receivedRequests = toUser.receivedRequests.filter(
      (user) => user !== fromUsername
    );

    await fromUser.save();
    await toUser.save();

    res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.error("Error rejecting friend request:", err);
    res.status(500).json({ message: "Failed to reject friend request" });
  }
});

console.log(`
  _______________________________________________________________________________________

  █████╗ ██████╗ ███╗   ███╗ █████╗ ██████╗ ██████╗     
  ██╔══██╗██╔══██╗████╗ ████║██╔══██╗██╔══██╗██╔══██╗    
  ███████║██║  ██║██╔████╔██║███████║██████╔╝██████╔╝    
  ██╔══██║██║  ██║██║╚██╔╝██║██╔══██║██╔═══╝ ██╔═══╝     
  ██║  ██║██████╔╝██║ ╚═╝ ██║██║  ██║██║     ██║         
  ╚═╝  ╚═╝╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝                                                                
        ADMApp Version a1.0s - Web Programming Project 05/09/2025 
  Credits: Alek, Dean, Michael | Mission Vista HS


  𝐀𝐩𝐩𝐥𝐢𝐜𝐚𝐭𝐢𝐨𝐧 𝐋𝐨𝐠𝐬 𝐁𝐞𝐥𝐥𝐨𝐰:
  _______________________________________________________________________________________
`);

server.listen(PORT, () => {
  console.log(`Server + Socket.IO listening on port ${PORT}`);
});
