# ADM App

A modern real-time messaging web application built with Node.js, Express, Socket.io, and MongoDB.

![ADM App Preview](https://i.imgur.com/AmxpR15.png)  

## ✨ Features

- **User Authentication** – Secure signup and login with bcrypt hashing
- **Real-time Messaging** – Global chat and private direct messages (DMs) using Socket.io
- **Friend System** – Send, accept, reject, and cancel friend requests
- **Profile Customization** – Auto-generated profile pictures + custom PNG uploads
- **Typing Indicators** – Live "user is typing..." feedback
- **Message History** – Persistent chat history + more stored in MongoDB
- **Modern UI** – Responsive design with Bulma CSS and Light/Dark mode toggle
- **Session Management** – Secure user sessions with express-session

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB + Mongoose
- **Authentication**: bcrypt
- **File Uploads**: Multer
- **Frontend**: HTML, CSS (Bulma), JavaScript
- **Profile Pictures**: Canvas (auto-generation)

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (free tier works for low data usage)

### 1. Clone the Repository
```bash
git clone https://github.com/Alek800008114/ADMApp.git
cd ADMApp
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Set Up Environment Variables
Create a .env file in the root directory:
```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.yourcluster.mongodb.net/ADMApp?retryWrites=true&w=majority
```
Replace user and password with your actual credentials as well as cluster name.

### 4. Run the Application
Development (recommended):

```bash
npx nodemon server.js
```
Production:
```bash
node server.js
The server will start on http://localhost:3003
```
## 📁 Project Structure
```text
ADMApp/
├── server.js                 # Main server file
├── db.js                     # MongoDB connection
├── models/                   # Mongoose schemas (User, Message, DM, Friends)
├── public/                   # Static files (CSS, images, logos)
├── private/                  # Protected pages (Home, Chat, Settings, etc.)
├── utils/                    # Utilities (profile picture generator)
└── .env                      # Environment variables (not committed)
```
## 🎯 Key Pages
```text
Login / Signup
Home Dashboard
Global Chat
Private Conversations (DMs)
Friends Management
Settings (Username, Password, Profile Picture)
```

## 📸 Screenshots
![image1](https://i.imgur.com/98VD0nI.png)
![image2](https://i.imgur.com/RYuDiNe.png)
![image3](https://i.imgur.com/PJMnA2j.png)
![image4](https://i.imgur.com/9XALPL5.png)
![image5](https://i.imgur.com/o8XjNQe.png)

## 👥 Credits
**Team Members:** Michael L., Alek J., Dean D.


**Project Date:** May 2025


**School:** Mission Vista High School, CA – Web Programming Class, Mr Yee.

## 📝 What would we add in the future?

Group chats


Message reactions


Online status indicators


File/image sharing in chats


Notifications

##

**Made with ❤️ 2025**
