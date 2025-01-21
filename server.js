const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Updated CORS configuration for production
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://temporary-chat-application.onrender.com', 'https://temporary-chat-application-api.onrender.com']
      : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://temporary-chat-application.onrender.com', 'https://temporary-chat-application-api.onrender.com']
    : 'http://localhost:3000',
  credentials: true
}));

// Message expiration time in milliseconds (10 minutes)
const MESSAGE_EXPIRY = 600000;

// Store active rooms and their messages
const activeRooms = new Map();

// Helper function to clean up expired messages
const cleanExpiredMessages = (roomId) => {
  const room = activeRooms.get(roomId);
  if (room) {
    const currentTime = Date.now();
    const cycleStartTime = Math.floor((currentTime - room.createdAt) / MESSAGE_EXPIRY) * MESSAGE_EXPIRY + room.createdAt;
    room.messages = room.messages.filter(msg => 
      msg.timestamp >= cycleStartTime
    );
    return cycleStartTime;
  }
  return null;
};

app.use(express.json());

// Create a new chat room
app.post('/api/rooms', (req, res) => {
  const roomId = uuidv4();
  const createdAt = Date.now();
  activeRooms.set(roomId, {
    createdAt,
    users: new Set(),
    messages: []
  });
  res.json({ roomId });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Add check username availability event
  socket.on('check_username', ({ roomId, username }) => {
    const room = activeRooms.get(roomId);
    if (!room) {
      socket.emit('username_checked', { 
        isAvailable: false, 
        error: 'Room not found' 
      });
      return;
    }
    
    const isAvailable = !room.users.has(username);
    socket.emit('username_checked', { 
      isAvailable,
      error: isAvailable ? null : 'Username already taken'
    });
  });

  socket.on('join_room', async ({ roomId, username }) => {
    if (!activeRooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const room = activeRooms.get(roomId);
    
    // Check if username is already taken
    if (room.users.has(username)) {
      socket.emit('error', { message: 'Username already taken' });
      return;
    }

    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;
    room.users.add(username);

    // Clean up expired messages and get cycle start time
    const cycleStartTime = cleanExpiredMessages(roomId);
    
    // Send room info including creation time and messages
    socket.emit('room_joined', {
      messages: room.messages,
      createdAt: room.createdAt,
      cycleStartTime
    });
    
    io.to(roomId).emit('user_joined', { username, users: Array.from(room.users) });
  });

  socket.on('typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user_typing', { username });
  });

  socket.on('stop_typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user_stopped_typing', { username });
  });

  socket.on('send_message', async (data) => {
    const { roomId, message } = data;
    const room = activeRooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const messageData = {
      id: uuidv4(),
      username: socket.username,
      message,
      timestamp: Date.now()
    };

    // Clean up expired messages before adding new one
    cleanExpiredMessages(roomId);
    
    // Add message to room's message array
    room.messages.push(messageData);

    io.to(roomId).emit('receive_message', messageData);
  });

  socket.on('disconnect', () => {
    if (socket.roomId && socket.username) {
      const room = activeRooms.get(socket.roomId);
      if (room) {
        room.users.delete(socket.username);
        io.to(socket.roomId).emit('user_left', {
          username: socket.username,
          users: Array.from(room.users)
        });

        // If no users left, schedule room cleanup
        if (room.users.size === 0) {
          setTimeout(() => {
            if (activeRooms.has(socket.roomId) && 
                activeRooms.get(socket.roomId).users.size === 0) {
              activeRooms.delete(socket.roomId);
            }
          }, MESSAGE_EXPIRY);
        }
      }
    }
  });
});

// Periodic cleanup of expired messages (every 5 minutes)
setInterval(() => {
  for (const [roomId] of activeRooms) {
    const cycleStartTime = cleanExpiredMessages(roomId);
    if (cycleStartTime) {
      io.to(roomId).emit('messages_cleared', { cycleStartTime });
    }
  }
}, 300000);

// Add a basic route for health check
app.get('/', (req, res) => {
  res.send('Server is running');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 