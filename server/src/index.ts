import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import { connectedUsers, userRooms, roomConnectedUsers, socketToUserId } from './utils/dataStore.js';
import { setupRoomHandlers } from './handlers/roomHandlers.js';
import { setupStoryHandlers } from './handlers/storyHandlers.js';
import { setupVotingHandlers } from './handlers/votingHandlers.js';
import { setupRetrospectiveHandlers } from './handlers/retrospectiveHandlers.js';
import type { ServerToClientEvents, ClientToServerEvents } from './types/index.js';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Log environment for debugging
console.log('🔧 Environment check:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  - GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Loaded' : '❌ Missing');

// Connect to MongoDB
connectDB();

const app = express();
const server = createServer(app);

// Configure CORS
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "planning-poker-pt.netlify.app",
    /\.netlify\.app$/,
    /\.onrender\.com$/
  ],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000", 
      "planning-poker-pt.netlify.app",
      /\.netlify\.app$/,
      /\.onrender\.com$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6,
  allowUpgrades: true,
  perMessageDeflate: false
});

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'Planning Poker Backend is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    url: 'https://planning-poker-backend-dxkk.onrender.com',
    connections: io.engine.clientsCount || 0,
    transport: 'Socket.IO Server Ready',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    typescript: true
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: io.engine.clientsCount || 0,
    url: 'https://planning-poker-backend-dxkk.onrender.com',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    typescript: true
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} via ${socket.conn.transport.name}. Total: ${io.engine.clientsCount}`);

  // Store current room for this socket (using an object so it can be mutated)
  const currentRoom = { value: null as string | null };

  // Log transport upgrades
  socket.conn.on('upgrade', () => {
    console.log(`Socket ${socket.id} upgraded to ${socket.conn.transport.name}`);
  });

  // Enhanced error handling
  socket.on('error', (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });

  socket.on('disconnect', async (reason) => {
    const user = connectedUsers[socket.id];
    const userId = socketToUserId[socket.id];
    
    if (user) {
      console.log(`${user.displayName} disconnected (${reason}). Total: ${io.engine.clientsCount - 1}`);
      delete connectedUsers[socket.id];
      
      // Clean up socket to userId mapping
      if (userId) {
        delete socketToUserId[socket.id];
      }
      
      // Leave room and notify room users
      if (currentRoom.value) {
        socket.leave(currentRoom.value);
        socket.to(currentRoom.value).emit('users_updated', Object.values(roomConnectedUsers[currentRoom.value] || {}));
        
        // Update room in database using the actual userId
        try {
          const { RoomService } = await import('./services/RoomService');
          await RoomService.leaveRoom(currentRoom.value, userId || socket.id);
        } catch (error) {
          console.error('Failed to update room on disconnect:', error);
        }
      }
    }
  });

  // Setup all socket handlers
  setupRoomHandlers(socket, io, currentRoom);
  setupStoryHandlers(socket, io, currentRoom);
  setupVotingHandlers(socket, io);
  setupRetrospectiveHandlers(socket, io);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'No URI configured'}`);
});

export { io };
