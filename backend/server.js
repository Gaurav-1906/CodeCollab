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
const { setupWSConnection } = require('y-websocket/bin/utils');

// Import routes
const authRoutes = require('./src/routes/authRoutes');

dotenv.config();
connectDB();
const redisClient = connectRedis();

const app = express();
// Enable trust proxy for Render
app.set('trust proxy', 1);

// ===== CORS Configuration =====
// Get static allowed origins from environment variable
const staticAllowedOrigins = process.env.CLIENT_ORIGIN 
  ? process.env.CLIENT_ORIGIN.split(',').map(origin => origin.trim()) 
  : ['http://localhost:5173'];

// Function to check if origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  
  // Check static allowed origins
  if (staticAllowedOrigins.includes(origin)) {
    console.log(`✅ Static origin allowed: ${origin}`);
    return true;
  }
  
  // Allow all Vercel preview deployments (any subdomain of vercel.app)
  if (origin.match(/^https:\/\/.*\.vercel\.app$/)) {
    console.log(`✅ Vercel preview allowed: ${origin}`);
    return true;
  }
  
  // Allow v0.dev preview URLs
  if (origin.match(/^https:\/\/.*v0\.dev$/) || origin.match(/^https:\/\/.*v0\.app$/)) {
    console.log(`✅ v0 preview allowed: ${origin}`);
    return true;
  }
  
  // Allow vusercontent blob URLs (v0 preview)
  if (origin.match(/^https:\/\/.*vusercontent\.net$/)) {
    console.log(`✅ vusercontent allowed: ${origin}`);
    return true;
  }
  
  // Allow localhost for development
  if (origin.match(/^http:\/\/localhost:\d+$/)) {
    console.log(`✅ Localhost allowed: ${origin}`);
    return true;
  }
  
  // In development mode, allow all origins
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Development mode - allowing: ${origin}`);
    return true;
  }
  
  console.log(`❌ Origin blocked: ${origin}`);
  return false;
};

console.log('=================================');
console.log('🔧 CORS Configuration:');
console.log(`📋 Static allowed origins:`, staticAllowedOrigins);
console.log(`🌐 Vercel preview URLs: All *.vercel.app allowed`);
console.log(`💻 Localhost: Allowed for development`);
console.log('=================================');

// Security middleware (with CORS-friendly settings)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Express CORS with dynamic origin
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CodeCollab API is running',
    version: '1.0.0',
    status: 'healthy',
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
      },
      code: {
        execute: 'POST /api/execute'
      }
    }
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Friend search endpoint
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

// Get friends list endpoint
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

// Code execution endpoint
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
// Socket.io setup with dynamic CORS
// -------------------------------------------------------------------
const server = http.createServer(app);

// Yjs WebSocket server for collaborative editing
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  if (pathname && pathname.startsWith('/code-')) {
    const wss = new WebSocket.Server({ noServer: true });
    wss.handleUpgrade(request, socket, head, (ws) => {
      setupWSConnection(ws, request);
    });
  }
  // Other upgrades (like Socket.IO) will be handled by their respective libraries
});

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.log(`❌ Socket.IO CORS blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true
});

// Store io and redis in app for access in routes
app.set('io', io);
app.set('redis', redisClient);

// Socket.io data stores
const userSockets = new Map(); // userId -> Set of socketIds
const socketToUserId = new Map(); // socketId -> userId
const roomParticipants = new Map(); // roomId -> Map<userId, Set<socketIds>>

const emitToUser = (userId, event, payload) => {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.forEach(sockId => io.to(sockId).emit(event, payload));
};

const getUniqueParticipantCount = (roomId) => {
  const room = roomParticipants.get(roomId);
  return room ? room.size : 0;
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  // Register user
  socket.on('register-user', ({ userId }) => {
    socket.data.userId = userId;
    socketToUserId.set(socket.id, userId);

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    console.log(`✅ User ${userId} registered with socket ${socket.id}`);
    console.log(`📱 Total connected users: ${userSockets.size}`);
  });

  // User online status
  socket.on('user-online', async ({ userId }) => {
    try {
      await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: Date.now() });
      const user = await User.findById(userId).populate('friends');
      const currentRoom = socket.data.currentRoom || null;
      
      user.friends.forEach(friend => {
        emitToUser(friend._id.toString(), 'friend-status-changed', {
          userId,
          status: 'online',
          username: user.username,
          currentRoom
        });
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  });

  // Send friend request
  socket.on('send-friend-request', ({ to, from, fromUsername }) => {
    emitToUser(to, 'friend-request-received', { from, fromUsername });
  });

  // Accept friend request
  socket.on('accept-friend-request', async ({ to, from, fromUsername }) => {
    try {
      await User.findByIdAndUpdate(from, { $addToSet: { friends: to } });
      await User.findByIdAndUpdate(to, { $addToSet: { friends: from } });
      
      const friend = await User.findById(to).select('-password');
      emitToUser(from, 'friend-request-accepted', { friend });
      
      const sender = await User.findById(from).select('-password');
      emitToUser(to, 'friend-request-accepted', { friend: sender });
    } catch (err) {
      console.error('Accept friend error:', err);
    }
  });

  // Reject friend request
  socket.on('reject-friend-request', ({ to, from }) => {
    emitToUser(to, 'friend-request-rejected', { from });
  });

  // Join room
  socket.on('join-room', async ({ roomId, userId, username }) => {
    const previousRoom = socket.data.currentRoom;

    if (previousRoom && previousRoom !== roomId) {
      socket.leave(previousRoom);
      if (roomParticipants.has(previousRoom)) {
        const room = roomParticipants.get(previousRoom);
        const userRoomSet = room.get(userId);
        if (userRoomSet) {
          userRoomSet.delete(socket.id);
          if (userRoomSet.size === 0) {
            room.delete(userId);
            socket.to(previousRoom).emit('user-left', userId);
            io.to(`chat-${previousRoom}`).emit('user-left-notification', { username });
          }
        }

        const count = getUniqueParticipantCount(previousRoom);
        io.to(previousRoom).emit('room-participants-count', { roomId: previousRoom, count });
      }
    }

    socket.data.userId = userId;
    socket.data.username = username;
    socketToUserId.set(socket.id, userId);

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    socket.join(roomId);
    socket.data.currentRoom = roomId;

    if (!roomParticipants.has(roomId)) {
      roomParticipants.set(roomId, new Map());
    }
    const room = roomParticipants.get(roomId);
    if (!room.has(userId)) {
      room.set(userId, new Set());
    }
    const userRoomSet = room.get(userId);
    const wasAlreadyInRoom = userRoomSet.size > 0;
    userRoomSet.add(socket.id);

    const count = getUniqueParticipantCount(roomId);
    io.to(roomId).emit('room-participants-count', { roomId, count });

    if (!wasAlreadyInRoom) {
      // Notify existing room members about newcomer
      socket.to(roomId).emit('user-joined', { userId, username });
      socket.to(roomId).emit('user-joined-notification', { username, roomId });
      io.to(`chat-${roomId}`).emit('user-joined-notification', { username, roomId });
    }

    // Send list of currently in-room users to the newly joined client
    const socketIdsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const existingUsers = [];
    socketIdsInRoom.forEach(sid => {
      if (sid === socket.id) return;
      const s = io.sockets.sockets.get(sid);
      if (s && s.data && s.data.userId && s.data.username) {
        existingUsers.push({ userId: s.data.userId, username: s.data.username });
      }
    });
    socket.emit('all-users', { users: existingUsers });

    try {
      const user = await User.findById(userId).populate('friends');
      user.friends.forEach(friend => {
        emitToUser(friend._id.toString(), 'friend-status-changed', {
          userId,
          status: 'online',
          username: user.username,
          currentRoom: roomId
        });
      });
    } catch (error) {
      console.error('Error updating friend status:', error);
    }
  });

  // Request participants count
  socket.on('request-participants-count', ({ roomId }) => {
    if (roomParticipants.has(roomId)) {
      const count = getUniqueParticipantCount(roomId);
      io.to(socket.id).emit('room-participants-count', { roomId, count });
    }
  });

  // Leave room
  socket.on('leave-room', async ({ userId, username }) => {
    const currentRoom = socket.data.currentRoom;
    if (currentRoom) {
      socket.leave(currentRoom);
      socket.data.currentRoom = null;

      if (roomParticipants.has(currentRoom)) {
        const room = roomParticipants.get(currentRoom);
        const userRoomSet = room.get(userId);

        if (userRoomSet) {
          userRoomSet.delete(socket.id);
          if (userRoomSet.size === 0) {
            room.delete(userId);
            socket.to(currentRoom).emit('user-left', userId);
            io.to(`chat-${currentRoom}`).emit('user-left-notification', { username });
          }
        }

        const count = getUniqueParticipantCount(currentRoom);
        io.to(currentRoom).emit('room-participants-count', { roomId: currentRoom, count });
      }

      console.log(`${username} left room: ${currentRoom}`);

      try {
        const user = await User.findById(userId).populate('friends');
        user.friends.forEach(friend => {
          emitToUser(friend._id.toString(), 'friend-status-changed', {
            userId,
            status: 'online',
            username: user.username,
            currentRoom: null
          });
        });
      } catch (error) {
        console.error('Error updating friend status on leave:', error);
      }
    }
  });

  // WebRTC signaling
  socket.on('send-signal', ({ signal, to, from, username }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive-call', { signal, from, username });
    }
  });

  socket.on('return-signal', ({ signal, to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('signal-returned', { signal, from: socket.id });
    }
  });

  // Chat functionality
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

  // Invite functionality
  socket.on('send-invite', ({ to, from, fromUsername, room }) => {
    console.log(`${fromUsername} invited user ${to} to room: ${room}`);
    emitToUser(to, 'invite-received', { from, room, fromUsername });
  });

  socket.on('accept-invite', ({ to, from, fromUsername, room }) => {
    console.log(`${fromUsername} accepted invite from ${to} to room ${room}`);
    emitToUser(to, 'invite-accepted', { from, fromUsername, room });
  });

  socket.on('reject-invite', ({ to, from, fromUsername, room }) => {
    console.log(`${fromUsername} rejected invite from ${to} to room ${room}`);
    emitToUser(to, 'invite-rejected', { from, fromUsername, room });
  });

  // Disconnect handler
  socket.on('disconnect', async () => {
    const userId = socket.data.userId;
    if (userId) {
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);

          try {
            await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: Date.now() });
            const user = await User.findById(userId).populate('friends');
            
            user.friends.forEach(friend => {
              emitToUser(friend._id.toString(), 'friend-status-changed', {
                userId,
                status: 'offline',
                username: user.username
              });
            });
          } catch (error) {
            console.error('Error updating offline status:', error);
          }
        }
      }

      socketToUserId.delete(socket.id);
    }
    
    if (socket.data.currentRoom && socket.data.userId) {
      const roomId = socket.data.currentRoom;
      if (roomParticipants.has(roomId)) {
        const room = roomParticipants.get(roomId);
        const userRoomSet = room.get(socket.data.userId);

        if (userRoomSet) {
          userRoomSet.delete(socket.id);
          if (userRoomSet.size === 0) {
            room.delete(socket.data.userId);
            socket.to(roomId).emit('user-left', socket.data.userId);
            io.to(`chat-${roomId}`).emit('user-left-notification', { username: socket.data.username });
          }
        }

        const count = getUniqueParticipantCount(roomId);
        io.to(roomId).emit('room-participants-count', { roomId, count });
      }
    }

    console.log('❌ Client disconnected:', socket.id);
    console.log(`📱 Remaining connected users: ${userSockets.size}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  🚀 CodeCollab Server Started Successfully!             ║
║                                                          ║
║  📡 Server: http://localhost:${PORT}                      ║
║  🔌 Socket.IO: Ready                                     ║
║  📦 MongoDB: Connected                                   ║
║  🔥 Redis: Connected                                     ║
║  🌐 Allowed Origins: ${staticAllowedOrigins.length} origin(s)   ║
║  🌐 Vercel Previews: All *.vercel.app allowed            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
