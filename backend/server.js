const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const connectRedis = require('./src/config/redis');
const User = require('./src/models/User');
const WebSocket = require('ws');
const Y = require('yjs');
const { setupWSConnection } = require('y-websocket/bin/utils');

// Import routes
const authRoutes = require('./src/routes/authRoutes');

dotenv.config();
connectDB();
const redisClient = connectRedis();

const app = express();

app.use(helmet());
const allowedOrigins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : ['http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

app.get('/', (req, res) => {
  res.json({
    message: 'CodeCollab API is running',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      users: {
        search: 'GET /api/users/search?q=username',
        friends: 'GET /api/users/friends'
      }
    }
  });
});

app.use('/api/auth', authRoutes);

// -------------------------------------------------------------------
// Friend routes – fully implemented
// -------------------------------------------------------------------
app.get('/api/users/search', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Please enter a username' });
    }
    const user = await User.findOne({
      username: { $regex: `^${q}$`, $options: 'i' },
      _id: { $ne: decoded.id }
    }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error searching user' });
  }
});

app.get('/api/users/friends', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('friends', '-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    res.json(user.friends || []);
  } catch (error) {
    console.error('Friends error:', error);
    res.status(500).json({ message: 'Error loading friends' });
  }
});

// -------------------------------------------------------------------
// CODE EXECUTION ENDPOINT (JDoodle API)
// -------------------------------------------------------------------
app.post('/api/execute', async (req, res) => {
  const { code, language, input = '' } = req.body;
  console.log(`📝 Executing ${language} code with input: ${input.substring(0, 50)}...`);

  if (language === 'javascript' || language === 'typescript') {
    return res.json({ output: '✅ JavaScript runs in the browser. Use the editor\'s Run button.' });
  }
  if (language === 'python') {
    return res.json({ output: '✅ Python runs in the browser using Pyodide.' });
  }

  const jdoodleMap = {
    java: { language: 'java', version: '4' },
    cpp: { language: 'cpp', version: '5' }
  };
  const jd = jdoodleMap[language];
  if (!jd) {
    return res.json({ output: `📝 ${language.toUpperCase()} code:\n\n${code}\n\n💡 Run using appropriate compiler.` });
  }

  try {
    const response = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.JDOODLE_CLIENT_ID || 'ebb5e744a5bde19d4f98c509441ff6db',
        clientSecret: process.env.JDOODLE_CLIENT_SECRET || '5eebfe76c01502d8fd90a261905cf997d32450023d527d34988994204f20d937',
        script: code,
        language: jd.language,
        versionIndex: jd.version,
        stdin: input
      })
    });
    const data = await response.json();
    if (data.output) {
      let output = data.output;
      if (data.memory) output += `\n\n💾 Memory: ${data.memory} KB`;
      if (data.cpuTime) output += `\n⏱️ CPU Time: ${data.cpuTime} seconds`;
      return res.json({ output });
    }
    if (data.error) return res.json({ output: `❌ Compilation Error:\n${data.error}` });
    return res.json({ output: '⚠️ No output from code' });
  } catch (error) {
    console.error('JDoodle error:', error.message);
    return res.json({ output: `⚠️ Execution service error: ${error.message}\n\n📝 Your code:\n${code}` });
  }
});

// -------------------------------------------------------------------
// Socket.io setup
// -------------------------------------------------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);
app.set('redis', redisClient);

const userSockets = new Map();
const roomParticipants = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('register-user', ({ userId }) => {
    socket.data.userId = userId;
    userSockets.set(userId, socket.id);
    console.log(`✅ User ${userId} registered with socket ${socket.id}`);
    console.log(`📱 Total connected users: ${userSockets.size}`);
  });

  socket.on('user-online', async ({ userId }) => {
    await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: Date.now() });
    const user = await User.findById(userId).populate('friends');
    const currentRoom = socket.data.currentRoom || null;
    user.friends.forEach(friend => {
      const friendSocketId = userSockets.get(friend._id.toString());
      if (friendSocketId) {
        io.to(friendSocketId).emit('friend-status-changed', {
          userId,
          status: 'online',
          username: user.username,
          currentRoom
        });
      }
    });
  });

  // Friend request events
  socket.on('send-friend-request', ({ to, from, fromUsername }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('friend-request-received', { from, fromUsername });
    } else {
      console.log(`❌ User ${to} is not connected`);
    }
  });

  socket.on('accept-friend-request', async ({ to, from, fromUsername }) => {
    try {
      await User.findByIdAndUpdate(from, { $addToSet: { friends: to } });
      await User.findByIdAndUpdate(to, { $addToSet: { friends: from } });
      const friend = await User.findById(to).select('-password');
      const senderSocketId = userSockets.get(from);
      if (senderSocketId) io.to(senderSocketId).emit('friend-request-accepted', { friend });
      const sender = await User.findById(from).select('-password');
      const targetSocketId = userSockets.get(to);
      if (targetSocketId) io.to(targetSocketId).emit('friend-request-accepted', { friend: sender });
    } catch (err) {
      console.error('Accept friend error:', err);
    }
  });

  socket.on('reject-friend-request', ({ to, from }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) io.to(targetSocketId).emit('friend-request-rejected', { from });
  });

  // Room events
  socket.on('join-room', async ({ roomId, userId, username }) => {
    const previousRoom = socket.data.currentRoom;
    if (previousRoom && previousRoom !== roomId) {
      socket.leave(previousRoom);
      if (roomParticipants.has(previousRoom)) {
        roomParticipants.get(previousRoom).delete(userId);
        const count = roomParticipants.get(previousRoom).size;
        io.to(previousRoom).emit('room-participants-count', { roomId: previousRoom, count });
        io.to(`chat-${previousRoom}`).emit('user-left-notification', { username });
      }
    }

    userSockets.set(userId, socket.id);
    socket.data.userId = userId;
    socket.join(roomId);
    socket.data.currentRoom = roomId;
    socket.data.username = username;

    console.log(`${username} joined room: ${roomId}`);

    if (!roomParticipants.has(roomId)) roomParticipants.set(roomId, new Set());
    roomParticipants.get(roomId).add(userId);
    const count = roomParticipants.get(roomId).size;
    io.to(roomId).emit('room-participants-count', { roomId, count });

    socket.to(roomId).emit('user-joined', { userId, username });
    socket.to(roomId).emit('user-joined-notification', { username, roomId });
    io.to(`chat-${roomId}`).emit('user-joined-notification', { username, roomId });

    const user = await User.findById(userId).populate('friends');
    user.friends.forEach(friend => {
      const friendSocketId = userSockets.get(friend._id.toString());
      if (friendSocketId) {
        io.to(friendSocketId).emit('friend-status-changed', {
          userId,
          status: 'online',
          username: user.username,
          currentRoom: roomId
        });
      }
    });
  });

  // NEW: Request participants count
  socket.on('request-participants-count', ({ roomId }) => {
    if (roomParticipants.has(roomId)) {
      const count = roomParticipants.get(roomId).size;
      io.to(socket.id).emit('room-participants-count', { roomId, count });
    }
  });

  socket.on('leave-room', async ({ userId, username }) => {
    const currentRoom = socket.data.currentRoom;
    if (currentRoom) {
      socket.leave(currentRoom);
      socket.data.currentRoom = null;

      if (roomParticipants.has(currentRoom)) {
        roomParticipants.get(currentRoom).delete(userId);
        const count = roomParticipants.get(currentRoom).size;
        io.to(currentRoom).emit('room-participants-count', { roomId: currentRoom, count });
      }

      socket.to(currentRoom).emit('user-left-notification', { username });
      io.to(`chat-${currentRoom}`).emit('user-left-notification', { username });
      console.log(`${username} left room: ${currentRoom}`);

      const user = await User.findById(userId).populate('friends');
      user.friends.forEach(friend => {
        const friendSocketId = userSockets.get(friend._id.toString());
        if (friendSocketId) {
          io.to(friendSocketId).emit('friend-status-changed', {
            userId,
            status: 'online',
            username: user.username,
            currentRoom: null
          });
        }
      });
    }
  });

  // WebRTC signaling
  socket.on('send-signal', ({ signal, to, from, username }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) io.to(targetSocketId).emit('receive-call', { signal, from, username });
  });

  socket.on('return-signal', ({ signal, to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) io.to(targetSocketId).emit('signal-returned', { signal, from: socket.id });
  });

  // Chat events
  socket.on('join-chat', ({ roomId, userId, username }) => {
    const chatRoom = `chat-${roomId}`;
    socket.join(chatRoom);
    console.log(`${username} joined chat room: ${roomId}`);
  });

  socket.on('chat-message', ({ roomId, message }) => {
    const chatRoom = `chat-${roomId}`;
    io.to(chatRoom).emit('chat-message', message);
  });

  socket.on('typing', ({ roomId, isTyping, username }) => {
    const chatRoom = `chat-${roomId}`;
    socket.to(chatRoom).emit('user-typing', { username, isTyping });
  });

  // Invite events
  socket.on('send-invite', ({ to, from, fromUsername, room }) => {
    console.log(`${fromUsername} invited user ${to} to room: ${room}`);
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      console.log(`📤 Sending invite to socket: ${targetSocketId}`);
      io.to(targetSocketId).emit('invite-received', { from, room, fromUsername });
    } else {
      console.log(`❌ Target user ${to} not connected`);
    }
  });

  socket.on('accept-invite', ({ to, from, fromUsername, room }) => {
    console.log(`${fromUsername} accepted invite from ${to} to room ${room}`);
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('invite-accepted', { from, fromUsername, room });
    }
  });

  socket.on('reject-invite', ({ to, from, fromUsername, room }) => {
    console.log(`${fromUsername} rejected invite from ${to} to room ${room}`);
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('invite-rejected', { from, fromUsername, room });
    }
  });

  socket.on('disconnect', async () => {
    const userId = socket.data.userId;
    if (userId) {
      await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: Date.now() });
      const user = await User.findById(userId).populate('friends');
      user.friends.forEach(friend => {
        const friendSocketId = userSockets.get(friend._id.toString());
        if (friendSocketId) {
          io.to(friendSocketId).emit('friend-status-changed', { userId, status: 'offline', username: user.username });
        }
      });
      userSockets.delete(userId);
    }
    if (socket.data.roomId && socket.data.userId) {
      if (roomParticipants.has(socket.data.roomId)) {
        roomParticipants.get(socket.data.roomId).delete(socket.data.userId);
        const count = roomParticipants.get(socket.data.roomId).size;
        io.to(socket.data.roomId).emit('room-participants-count', { roomId: socket.data.roomId, count });
      }
      socket.to(socket.data.roomId).emit('user-left', socket.data.userId);
      io.to(`chat-${socket.data.roomId}`).emit('user-left-notification', { username: socket.data.username });
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Yjs WebSocket server on a separate port (5001)
const yjsServer = http.createServer();
const yjsWss = new WebSocket.Server({ server: yjsServer });
yjsWss.on('connection', (conn, req) => {
  console.log('Yjs WebSocket client connected');
  setupWSConnection(conn, req);
});
yjsServer.listen(5001, () => {
  console.log(`🚀 Yjs WebSocket server running on port 5001`);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 MongoDB: Connected`);
  console.log(`🔥 Redis: Connected`);
  console.log(`🔌 Socket.io: Ready`);
  console.log(`🔌 Yjs WebSocket attached`);
  console.log(`📚 API available at http://localhost:${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => process.exit(1));
});
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});