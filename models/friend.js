const mongoose = require('mongoose');

const friendsSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  friendswith: [String], // Array of usernames of friends
  sentRequests: [String], // Array of usernames who sent friend requests
  receivedRequests: [String], // Array of usernames who sent requests to this user
});


const Friends = mongoose.model('friends', friendsSchema);

module.exports = Friends;
