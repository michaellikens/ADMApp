const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true 
  },
  password: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String, 
    default: ''   
  },
  profileColor: {
    type: String, 
    default: '#4f46e5' 
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
