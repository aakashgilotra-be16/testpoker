import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import Room from './models/Room';
import Story from './models/Story';
import VotingSession from './models/VotingSession';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents,
  SocketUser,
  Story as StoryType,
  VotingSession as VotingSessionType,
  Vote,
  RetrospectiveItem,
  RetrospectiveVote,
  RetrospectiveSession
} from './types/index';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = createServer(app);

// Configure CORS for production
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
  // Enhanced configuration for Render compatibility
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6,
  allowUpgrades: true,
  perMessageDeflate: false
});

// Health check endpoint
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

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'TypeScript Backend is working!',
    timestamp: new Date().toISOString(),
    headers: req.headers,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer'),
    typescript: true
  });
});

// Wake up endpoint
app.get('/wake', (req, res) => {
  res.json({
    message: 'TypeScript Service is awake!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: io.engine.clientsCount || 0,
    typescript: true
  });
});

// Database test endpoint
app.get('/test-db', async (req, res) => {
  try {
    const { testDatabaseCreation, cleanupTestData } = await import('./utils/testDatabase');
    
    // Run the test
    const testResult = await testDatabaseCreation();
    
    if (testResult.success) {
      // Clean up test data after successful test
      await cleanupTestData(testResult.testId);
      
      res.json({
        success: true,
        message: '✅ Database test completed successfully!',
        results: {
          roomCreated: !!testResult.roomId,
          storyCreated: !!testResult.storyId,
          retrospectiveCreated: !!testResult.retrospectiveId,
          collections: testResult.collections,
          database: testResult.dbStats?.db || 'agileteam-hub'
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ Database test failed',
        error: testResult.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ Database test endpoint error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// ===== IN-MEMORY STORAGE (will be replaced with DB) =====
// Room-based storage instead of global
let roomStories: Record<string, StoryType[]> = {};
let roomVotingSessions: Record<string, Record<string, VotingSessionType>> = {};
let roomVotes: Record<string, Record<string, Vote>> = {};
let roomConnectedUsers: Record<string, Record<string, SocketUser>> = {};

// User to room mapping
let userRooms: Record<string, string> = {};

// Legacy global storage for non-room users (backward compatibility)
let stories: StoryType[] = [
  {
    id: '1',
    title: 'User Login Feature',
    description: 'Implement user authentication with email and password',
    final_points: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Dashboard UI',
    description: 'Create responsive dashboard with user statistics',
    final_points: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Real-time Voting',
    description: 'Add real-time voting functionality with WebSocket support',
    final_points: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let votingSessions: Record<string, VotingSessionType> = {};
let votes: Record<string, Vote> = {};
let connectedUsers: Record<string, SocketUser> = {};

// Helper functions for room-based data management
function getOrCreateRoomData(roomId: string) {
  if (!roomStories[roomId]) {
    roomStories[roomId] = [];
  }
  if (!roomVotingSessions[roomId]) {
    roomVotingSessions[roomId] = {};
  }
  if (!roomVotes[roomId]) {
    roomVotes[roomId] = {};
  }
  if (!roomConnectedUsers[roomId]) {
    roomConnectedUsers[roomId] = {};
  }
  
  return {
    stories: roomStories[roomId],
    votingSessions: roomVotingSessions[roomId],
    votes: roomVotes[roomId],
    connectedUsers: roomConnectedUsers[roomId]
  };
}

function getRoomData(roomId: string) {
  return {
    stories: roomStories[roomId] || [],
    votingSessions: roomVotingSessions[roomId] || {},
    votes: roomVotes[roomId] || {},
    connectedUsers: roomConnectedUsers[roomId] || {}
  };
}

// ===== RETROSPECTIVE STORAGE =====
let retrospectiveItems: RetrospectiveItem[] = [];
let retrospectiveVotes: Record<string, RetrospectiveVote[]> = {};
let retrospectiveConnectedUsers: Record<string, SocketUser> = {};
let retrospectiveSession: RetrospectiveSession = {
  id: 'retrospective-1',
  phase: 'gather',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// ===== UTILITY FUNCTIONS =====
const isStoryCreator = (name: string): boolean => {
  const trimmedName = name.trim().toLowerCase();
  return trimmedName === 'aakash' || trimmedName === 'mohith';
};

// ===== SOCKET HANDLERS =====
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} via ${socket.conn.transport.name}. Total: ${io.engine.clientsCount}`);

  // Store current room for this socket
  let currentRoom: string | null = null;

  // Log transport upgrades
  socket.conn.on('upgrade', () => {
    console.log(`Socket ${socket.id} upgraded to ${socket.conn.transport.name}`);
  });

  // Enhanced error handling
  socket.on('error', (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });

  socket.on('disconnect', (reason) => {
    const user = connectedUsers[socket.id];
    if (user) {
      console.log(`${user.displayName} disconnected (${reason}). Total: ${io.engine.clientsCount - 1}`);
      delete connectedUsers[socket.id];
      
      // Leave room and notify room users
      if (currentRoom) {
        socket.leave(currentRoom);
        socket.to(currentRoom).emit('user_left_room', { userId: socket.id, displayName: user.displayName });
        
        // Clean up room-based data
        const roomData = getRoomData(currentRoom);
        if (roomData) {
          delete roomData.connectedUsers[socket.id];
        }
        
        // Update room in database
        (async () => {
          try {
            const { RoomService } = await import('./services/RoomService');
            await RoomService.leaveRoom(currentRoom!, socket.id);
          } catch (error) {
            console.error('Failed to update room on disconnect:', error);
          }
        })();
      }
      
      // Clean up user room mapping
      delete userRooms[socket.id];
      
      io.emit('users_updated', Object.values(connectedUsers));
    }

    // Remove from retrospective users if they were in retrospective
    if (retrospectiveConnectedUsers[socket.id]) {
      delete retrospectiveConnectedUsers[socket.id];
      const allUsers = Object.values(retrospectiveConnectedUsers);
      io.emit('retrospective_users_updated', allUsers);
      console.log('👋 Retrospective user disconnected:', socket.id, 'Remaining users:', allUsers.length);
    }
  });

  // ===== ROOM MANAGEMENT =====
  socket.on('create_room', async (data) => {
    try {
      const { hostId, name, description, settings } = data;
      const { RoomService } = await import('./services/RoomService');
      
      const room = await RoomService.createRoom(hostId, { name, description, settings });
      
      // Join the room immediately
      currentRoom = room._id;
      socket.join(room._id);
      
      socket.emit('room_created', {
        room: {
          id: room._id,
          name: room.name,
          description: room.description,
          hostId: room.hostId,
          participants: room.participants,
          settings: room.settings,
          shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/room/${room._id}`
        }
      });
      
      console.log(`Room created: ${room._id} by ${hostId}`);
    } catch (error) {
      socket.emit('room_error', { 
        message: error instanceof Error ? error.message : 'Failed to create room' 
      });
    }
  });

  socket.on('join_room', async (data) => {
    try {
      const { roomId, userId, name, displayName, role } = data;
      const { RoomService } = await import('./services/RoomService');
      
      // Validate room code
      if (!RoomService.isValidRoomCode(roomId)) {
        socket.emit('room_error', { message: 'Invalid room code format' });
        return;
      }
      
      const room = await RoomService.joinRoom(roomId, { userId, name, displayName, role });
      
      if (!room) {
        socket.emit('room_error', { message: 'Room not found' });
        return;
      }
      
      // Leave previous room if any
      if (currentRoom && currentRoom !== roomId) {
        socket.leave(currentRoom);
        socket.to(currentRoom).emit('user_left_room', { userId: socket.id, displayName });
      }
      
      // Join new room
      currentRoom = roomId.toUpperCase();
      socket.join(currentRoom);
      
      // Track user's room
      userRooms[socket.id] = currentRoom;
      
      // Update user in connected users and room data
      const user: SocketUser = {
        id: socket.id,
        socketId: socket.id,
        displayName,
        isStoryCreator: isStoryCreator(displayName),
        joinedAt: new Date().toISOString()
      };
      connectedUsers[socket.id] = user;
      
      // Get or create room-specific data
      const roomData = getOrCreateRoomData(currentRoom);
      roomData.connectedUsers[socket.id] = user;
      
      // Notify room participants
      socket.to(currentRoom).emit('user_joined_room', { 
        user: { userId, name, displayName, role },
        roomId: currentRoom
      });
      
      // Send room data to the joining user
      socket.emit('room_joined', {
        room: {
          id: room._id,
          name: room.name,
          description: room.description,
          hostId: room.hostId,
          participants: room.participants,
          settings: room.settings
        },
        user
      });

      // Send room-specific planning poker data
      socket.emit('user_joined', {
        user,
        stories: roomData.stories,
        votingSessions: roomData.votingSessions,
        votes: roomData.votes
      });
      
      // Send current room users
      const roomUsers = Object.values(roomData.connectedUsers).filter(u => 
        io.sockets.adapter.rooms.get(currentRoom)?.has(u.socketId)
      );
      socket.emit('room_users_updated', roomUsers);
      io.to(currentRoom).emit('users_updated', roomUsers);
      
      console.log(`${displayName} joined room: ${currentRoom}`);
    } catch (error) {
      socket.emit('room_error', { 
        message: error instanceof Error ? error.message : 'Failed to join room' 
      });
    }
  });

  socket.on('leave_room', async () => {
    if (!currentRoom) return;
    
    try {
      const user = connectedUsers[socket.id];
      if (user) {
        const { RoomService } = await import('./services/RoomService');
        await RoomService.leaveRoom(currentRoom, socket.id);
        
        socket.leave(currentRoom);
        socket.to(currentRoom).emit('user_left_room', { 
          userId: socket.id, 
          displayName: user.displayName 
        });
        
        console.log(`${user.displayName} left room: ${currentRoom}`);
      }
      
      currentRoom = null;
      socket.emit('room_left');
    } catch (error) {
      socket.emit('room_error', { 
        message: error instanceof Error ? error.message : 'Failed to leave room' 
      });
    }
  });

  socket.on('get_room_info', async (data) => {
    try {
      const { roomId } = data;
      const { RoomService } = await import('./services/RoomService');
      
      const room = await RoomService.getRoomById(roomId);
      if (!room) {
        socket.emit('room_error', { message: 'Room not found' });
        return;
      }
      
      socket.emit('room_info', {
        room: {
          id: room._id,
          name: room.name,
          description: room.description,
          hostId: room.hostId,
          participants: room.participants,
          settings: room.settings,
          status: room.status
        }
      });
    } catch (error) {
      socket.emit('room_error', { 
        message: error instanceof Error ? error.message : 'Failed to get room info' 
      });
    }
  });

  // ===== LEGACY USER MANAGEMENT (for non-room users) =====
  socket.on('join', (data) => {
    // Only handle this if not in a room
    if (currentRoom) return;
    
    const { displayName } = data;
    const user: SocketUser = {
      id: socket.id,
      socketId: socket.id,
      displayName,
      isStoryCreator: isStoryCreator(displayName),
      joinedAt: new Date().toISOString()
    };

    connectedUsers[socket.id] = user;

    socket.emit('user_joined', {
      user,
      stories,
      votingSessions,
      votes
    });

    // Broadcast user list update
    io.emit('users_updated', Object.values(connectedUsers));
    
    console.log(`${displayName} joined as ${isStoryCreator(displayName) ? 'Story Creator' : 'Team Member'}`);
  });

  // ===== STORY MANAGEMENT =====
  socket.on('create_story', (data) => {
    // Check if user is in a room or using legacy mode
    if (currentRoom) {
      // Room-based story creation
      const roomData = getOrCreateRoomData(currentRoom);
      const roomUser = roomData.connectedUsers[socket.id];
      
      if (!roomUser || !roomUser.isStoryCreator) {
        socket.emit('error', { message: 'Only story creators can create stories' });
        return;
      }

      const newStory: StoryType = {
        id: Date.now().toString(),
        title: data.title,
        description: data.description || '',
        final_points: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      roomData.stories.unshift(newStory);
      
      // Broadcast only to room members
      io.to(currentRoom).emit('story_created', newStory);
    } else {
      // Legacy mode for non-room users
      const user = connectedUsers[socket.id];
      if (!user || !user.isStoryCreator) {
        socket.emit('error', { message: 'Only story creators can create stories' });
        return;
      }

      const newStory: StoryType = {
        id: Date.now().toString(),
        title: data.title,
        description: data.description || '',
        final_points: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      stories.unshift(newStory);
      
      // Broadcast to all non-room users
      io.emit('story_created', newStory);
    }
  });

  socket.on('update_story', (data) => {
    if (currentRoom) {
      // Room-based story update
      const roomData = getOrCreateRoomData(currentRoom);
      const roomUser = roomData.connectedUsers[socket.id];
      
      if (!roomUser || !roomUser.isStoryCreator) {
        socket.emit('error', { message: 'Only story creators can update stories' });
        return;
      }

      const storyIndex = roomData.stories.findIndex(s => s.id === data.id);
      if (storyIndex !== -1) {
        roomData.stories[storyIndex] = {
          ...roomData.stories[storyIndex],
          title: data.title,
          description: data.description || '',
          updated_at: new Date().toISOString()
        };
        io.to(currentRoom).emit('story_updated', roomData.stories[storyIndex]);
      }
    } else {
      // Legacy mode
      const user = connectedUsers[socket.id];
      if (!user || !user.isStoryCreator) {
        socket.emit('error', { message: 'Only story creators can update stories' });
        return;
      }

      const storyIndex = stories.findIndex(s => s.id === data.id);
      if (storyIndex !== -1) {
        stories[storyIndex] = {
          ...stories[storyIndex],
          title: data.title,
          description: data.description || '',
          updated_at: new Date().toISOString()
        };
        io.emit('story_updated', stories[storyIndex]);
      }
    }
  });

  socket.on('delete_story', (data) => {
    if (currentRoom) {
      // Room-based story deletion
      const roomData = getOrCreateRoomData(currentRoom);
      const roomUser = roomData.connectedUsers[socket.id];
      
      if (!roomUser || !roomUser.isStoryCreator) {
        socket.emit('error', { message: 'Only story creators can delete stories' });
        return;
      }

      const storyIndex = roomData.stories.findIndex(s => s.id === data.id);
      if (storyIndex !== -1) {
        roomData.stories.splice(storyIndex, 1);
        
        // Clean up related voting sessions and votes for this room
        delete roomData.votingSessions[data.id];
        Object.keys(roomData.votes).forEach(key => {
          if (key.startsWith(`${data.id}_`)) {
            delete roomData.votes[key];
          }
        });

        io.to(currentRoom).emit('story_deleted', { id: data.id });
      }
    } else {
      // Legacy mode
      const user = connectedUsers[socket.id];
      if (!user || !user.isStoryCreator) {
        socket.emit('error', { message: 'Only story creators can delete stories' });
        return;
      }

      const storyIndex = stories.findIndex(s => s.id === data.id);
      if (storyIndex !== -1) {
        stories.splice(storyIndex, 1);
        
        // Clean up related voting sessions and votes
        delete votingSessions[data.id];
        Object.keys(votes).forEach(key => {
          if (key.startsWith(`${data.id}_`)) {
            delete votes[key];
          }
        });

        io.emit('story_deleted', { id: data.id });
      }
    }
  });

  socket.on('bulk_create_stories', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can create stories' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    
    if (currentRoom) {
      // Room-aware mode
      const roomData = getOrCreateRoomData(currentRoom);
      const newStories: StoryType[] = data.stories.map(story => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: story.title,
        description: story.description || '',
        final_points: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      roomData.stories.unshift(...newStories);
      console.log(`📚 ${newStories.length} stories bulk created in room ${currentRoom}`);
      io.to(currentRoom).emit('stories_bulk_created', newStories);
    } else {
      // Legacy global mode
      const newStories: StoryType[] = data.stories.map(story => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: story.title,
        description: story.description || '',
        final_points: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      stories.unshift(...newStories);
      io.emit('stories_bulk_created', newStories);
    }
  });

  socket.on('save_story_points', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can save story points' });
      return;
    }

    const storyIndex = stories.findIndex(s => s.id === data.storyId);
    if (storyIndex !== -1) {
      stories[storyIndex] = {
        ...stories[storyIndex],
        final_points: data.points,
        updated_at: new Date().toISOString()
      };
      io.emit('story_points_saved', {
        storyId: data.storyId,
        points: data.points,
        story: stories[storyIndex]
      });
    }
  });

  // ===== VOTING SESSION MANAGEMENT =====
  socket.on('start_voting_session', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can start voting sessions' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    
    if (currentRoom) {
      // Room-aware mode
      const roomData = getOrCreateRoomData(currentRoom);
      const session: VotingSessionType = {
        id: `${data.storyId}_${Date.now()}`,
        storyId: data.storyId,
        deckType: data.deckType || 'powersOfTwo',
        isActive: true,
        votesRevealed: false,
        timerDuration: data.timerDuration || 60,
        timerStartedAt: null,
        createdBy: user.displayName,
        createdAt: new Date().toISOString()
      };

      roomData.votingSessions[data.storyId] = session;
      
      // Clear existing votes for this story in the room
      Object.keys(roomData.votes).forEach(key => {
        if (key.startsWith(`${data.storyId}_`)) {
          delete roomData.votes[key];
        }
      });

      console.log(`🗳️ Voting session started in room ${currentRoom} for story ${data.storyId}`);
      io.to(currentRoom).emit('voting_session_started', session);
    } else {
      // Legacy global mode
      const session: VotingSessionType = {
        id: `${data.storyId}_${Date.now()}`,
        storyId: data.storyId,
        deckType: data.deckType || 'powersOfTwo',
        isActive: true,
        votesRevealed: false,
        timerDuration: data.timerDuration || 60,
        timerStartedAt: null,
        createdBy: user.displayName,
        createdAt: new Date().toISOString()
      };

      votingSessions[data.storyId] = session;
      
      // Clear existing votes for this story
      Object.keys(votes).forEach(key => {
        if (key.startsWith(`${data.storyId}_`)) {
          delete votes[key];
        }
      });

      io.emit('voting_session_started', session);
    }
  });

  socket.on('submit_vote', (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    
    if (currentRoom) {
      // Room-aware mode
      const roomData = getRoomData(currentRoom);
      if (!roomData) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const session = roomData.votingSessions[data.storyId];
      if (!session || !session.isActive || session.votesRevealed) {
        socket.emit('error', { message: 'Invalid voting session' });
        return;
      }

      const voteKey = `${data.storyId}_${user.displayName}`;
      roomData.votes[voteKey] = {
        id: voteKey,
        storyId: data.storyId,
        userId: socket.id,
        displayName: user.displayName,
        voteValue: data.value,
        submittedAt: new Date().toISOString()
      };

      // Broadcast vote count update to room
      const voteCount = Object.keys(roomData.votes).filter(key => 
        key.startsWith(`${data.storyId}_`)
      ).length;
      
      console.log(`🗳️ Vote submitted in room ${currentRoom} for story ${data.storyId} (${voteCount} votes)`);
      io.to(currentRoom).emit('vote_submitted', { storyId: data.storyId, voteCount, hasVoted: true });
    } else {
      // Legacy global mode
      const session = votingSessions[data.storyId];
      if (!session || !session.isActive || session.votesRevealed) {
        socket.emit('error', { message: 'Invalid voting session' });
        return;
      }

      const voteKey = `${data.storyId}_${user.displayName}`;
      votes[voteKey] = {
        id: voteKey,
        storyId: data.storyId,
        userId: socket.id,
        displayName: user.displayName,
        voteValue: data.value,
        submittedAt: new Date().toISOString()
      };

      // Broadcast vote count update
      const voteCount = Object.keys(votes).filter(key => 
        key.startsWith(`${data.storyId}_`)
      ).length;
      
      io.emit('vote_submitted', { storyId: data.storyId, voteCount, hasVoted: true });
    }
  });

  socket.on('start_timer', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can start timer' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.timerStartedAt = new Date().toISOString();
      session.timerDuration = data.duration || session.timerDuration;
      io.emit('timer_started', {
        storyId: data.storyId,
        startedAt: session.timerStartedAt,
        duration: session.timerDuration
      });
    }
  });

  socket.on('stop_timer', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can stop timer' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.timerStartedAt = null;
      io.emit('timer_stopped', { storyId: data.storyId });
    }
  });

  socket.on('reveal_votes', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can reveal votes' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.votesRevealed = data.revealed;
      session.timerStartedAt = null; // Stop timer when revealing votes

      const storyVotes = Object.values(votes)
        .filter(v => v.storyId === data.storyId)
        .map(vote => {
          // Ensure each vote has a userId
          if (!vote.userId) {
            const userMatch = Object.entries(connectedUsers).find(
              ([_, user]) => user.displayName === vote.displayName
            );
            
            if (userMatch) {
              vote.userId = userMatch[0];
            } else {
              vote.userId = 'unknown';
            }
          }
          return vote;
        });
      
      io.emit('votes_revealed', {
        storyId: data.storyId,
        revealed: data.revealed,
        votes: data.revealed ? storyVotes : []
      });
    }
  });

  socket.on('reset_voting', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can reset voting' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.votesRevealed = false;
      session.timerStartedAt = null;

      // Clear votes for this story
      Object.keys(votes).forEach(key => {
        if (key.startsWith(`${data.storyId}_`)) {
          delete votes[key];
        }
      });

      io.emit('voting_reset', { storyId: data.storyId });
    }
  });

  socket.on('change_deck_type', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can change deck type' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.deckType = data.deckType;
      io.emit('deck_type_changed', {
        storyId: data.storyId,
        deckType: data.deckType
      });
    }
  });

  socket.on('end_voting_session', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can end voting sessions' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.isActive = false;
      io.emit('voting_session_ended', { storyId: data.storyId });
    }
  });

  // ===== RETROSPECTIVE EVENT HANDLERS =====
  socket.on('join_retrospective', (data) => {
    const user: SocketUser = {
      id: socket.id,
      socketId: socket.id,
      displayName: data.displayName,
      isStoryCreator: false,
      joinedAt: new Date().toISOString()
    };
    
    retrospectiveConnectedUsers[socket.id] = user;
    const allUsers = Object.values(retrospectiveConnectedUsers);
    
    // Convert backend items to frontend format
    const frontendItems = retrospectiveItems.map((backendItem) => ({
      id: backendItem.id,
      content: backendItem.content,
      category: (backendItem.categoryId as any) || 'went-well', // Map categoryId to category
      author: backendItem.authorName || 'Anonymous',
      authorId: backendItem.authorId,
      roomId: 'default-room',
      votes: retrospectiveVotes[backendItem.id]?.length || 0,
      votedBy: retrospectiveVotes[backendItem.id]?.map(v => (v as any).userId) || [],
      isResolved: false,
      tags: [],
      priority: 0,
      createdAt: new Date(backendItem.createdAt),
      updatedAt: new Date(backendItem.createdAt)
    }));

    socket.emit('retrospective_user_joined', {
      user,
      items: frontendItems,
      votes: retrospectiveVotes,
      session: retrospectiveSession,
      connectedUsers: allUsers
    });
    
    io.emit('retrospective_users_updated', allUsers);
    console.log('👤 User joined retrospective:', data.displayName, 'Total users:', allUsers.length);
  });

  socket.on('add_retrospective_item', (data) => {
    const user = retrospectiveConnectedUsers[socket.id];
    
    const frontendItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: data.text,
      category: data.category as 'went-well' | 'to-improve' | 'action-items',
      author: user?.displayName || 'Anonymous',
      authorId: socket.id,
      roomId: 'default-room',
      votes: 0,
      votedBy: [],
      isResolved: false,
      tags: [],
      priority: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const backendItem: RetrospectiveItem = {
      id: frontendItem.id,
      categoryId: frontendItem.category,
      authorId: frontendItem.authorId,
      authorName: frontendItem.author,
      content: frontendItem.content,
      votes: [],
      isAnonymous: false,
      createdAt: new Date().toISOString()
    };
    
    retrospectiveItems.unshift(backendItem);
    retrospectiveVotes[frontendItem.id] = [];
    
    io.emit('retrospective_item_added', frontendItem as any);
    console.log('📝 Retrospective item added:', frontendItem.content);
  });

  socket.on('update_retrospective_item', (data) => {
    const itemIndex = retrospectiveItems.findIndex(item => item.id === data.id);
    if (itemIndex !== -1) {
      // Update backend item
      retrospectiveItems[itemIndex] = {
        ...retrospectiveItems[itemIndex],
        content: data.text, // Update content property
        categoryId: data.category, // Update category
        createdAt: new Date().toISOString() // Update timestamp
      };
      
      const frontendItem = {
        id: retrospectiveItems[itemIndex].id,
        content: data.text,
        category: data.category as 'went-well' | 'to-improve' | 'action-items',
        author: retrospectiveItems[itemIndex].authorName || 'Anonymous',
        authorId: retrospectiveItems[itemIndex].authorId,
        roomId: 'default-room',
        votes: retrospectiveVotes[retrospectiveItems[itemIndex].id]?.length || 0,
        votedBy: retrospectiveVotes[retrospectiveItems[itemIndex].id]?.map(v => (v as any).userId) || [],
        isResolved: false,
        tags: [],
        priority: 0,
        createdAt: new Date(retrospectiveItems[itemIndex].createdAt),
        updatedAt: new Date()
      };
      
      io.emit('retrospective_item_updated', frontendItem as any);
      console.log('✏️ Retrospective item updated:', data.id);
    }
  });

  socket.on('delete_retrospective_item', (data) => {
    const itemIndex = retrospectiveItems.findIndex(item => item.id === data.id);
    if (itemIndex !== -1) {
      retrospectiveItems.splice(itemIndex, 1);
      delete retrospectiveVotes[data.id];
      
      io.emit('retrospective_item_deleted', { id: data.id });
      console.log('🗑️ Retrospective item deleted:', data.id);
    }
  });

  socket.on('vote_retrospective_item', (data) => {
    const item = retrospectiveItems.find(item => item.id === data.itemId);
    if (item) {
      const existingVote = retrospectiveVotes[data.itemId]?.find(vote => vote.userId === socket.id);
      if (!existingVote) {
        const user = retrospectiveConnectedUsers[socket.id];
        const vote: RetrospectiveVote = {
          id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          itemId: data.itemId,
          userId: socket.id,
          displayName: user?.displayName || 'Anonymous',
          createdAt: new Date().toISOString()
        };
        
        if (!retrospectiveVotes[data.itemId]) {
          retrospectiveVotes[data.itemId] = [];
        }
        retrospectiveVotes[data.itemId].push(vote);
        
        item.votes = retrospectiveVotes[data.itemId].length;
        
        io.emit('retrospective_vote_added', vote);
        console.log('🗳️ Retrospective vote added:', vote.displayName);
      }
    }
  });

  socket.on('remove_retrospective_vote', (data) => {
    const item = retrospectiveItems.find(item => item.id === data.itemId);
    if (item && retrospectiveVotes[data.itemId]) {
      const voteIndex = retrospectiveVotes[data.itemId].findIndex(vote => vote.userId === socket.id);
      if (voteIndex !== -1) {
        const vote = retrospectiveVotes[data.itemId][voteIndex];
        retrospectiveVotes[data.itemId].splice(voteIndex, 1);
        
        item.votes = retrospectiveVotes[data.itemId].length;
        
        io.emit('retrospective_vote_removed', { itemId: data.itemId, voteId: vote.id });
        console.log('🗳️ Retrospective vote removed:', vote.displayName);
      }
    }
  });

  socket.on('change_retrospective_phase', (data) => {
    retrospectiveSession.phase = data.phase as 'gather' | 'group' | 'vote' | 'discuss';
    retrospectiveSession.updatedAt = new Date().toISOString();
    
    io.emit('retrospective_phase_changed', { phase: data.phase });
    console.log('🔄 Retrospective phase changed to:', data.phase);
  });
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Enhanced startup
const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TypeScript Socket.IO server running on port ${PORT}`);
  console.log(`📡 Backend URL: https://planning-poker-backend-dxkk.onrender.com`);
  console.log(`🏥 Health check: https://planning-poker-backend-dxkk.onrender.com/health`);
  console.log(`🧪 Test endpoint: https://planning-poker-backend-dxkk.onrender.com/test`);
  console.log(`🔧 Transport modes: polling, websocket`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📘 TypeScript: Enabled`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Keep alive for Render (ping every 5 minutes)
setInterval(() => {
  console.log(`Server alive - Connections: ${io.engine.clientsCount}, Uptime: ${Math.floor(process.uptime())}s`);
}, 300000);

// Self-ping to prevent sleeping (Render free tier)
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    try {
      const response = await fetch('https://planning-poker-backend-dxkk.onrender.com/wake');
      console.log('Self-ping successful:', response.status);
    } catch (error) {
      console.log('Self-ping failed:', (error as Error).message);
    }
  }, 840000); // Every 14 minutes
}

// ===== ROOM API ENDPOINTS =====
app.use(express.json());

// Create a new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { hostId, name, description, settings } = req.body;
    
    if (!hostId || !name) {
      return res.status(400).json({
        success: false,
        error: 'hostId and name are required'
      });
    }

    const { RoomService } = await import('./services/RoomService');
    const room = await RoomService.createRoom(hostId, { name, description, settings });
    
    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        participants: room.participants,
        settings: room.settings,
        status: room.status,
        createdAt: room.createdAt,
        shareUrl: `${req.protocol}://${req.get('host')}/room/${room._id}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create room'
    });
  }
});

// Get room details
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { RoomService } = await import('./services/RoomService');
    
    if (!RoomService.isValidRoomCode(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room code format'
      });
    }

    const room = await RoomService.getRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        participants: room.participants,
        settings: room.settings,
        status: room.status,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        shareUrl: `${req.protocol}://${req.get('host')}/room/${room._id}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get room'
    });
  }
});

// Join a room
app.post('/api/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, name, displayName, role } = req.body;
    
    if (!userId || !name || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'userId, name, and displayName are required'
      });
    }

    const { RoomService } = await import('./services/RoomService');
    const room = await RoomService.joinRoom(roomId, { userId, name, displayName, role });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        participants: room.participants,
        settings: room.settings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join room'
    });
  }
});

// Get user's rooms
app.get('/api/users/:userId/rooms', async (req, res) => {
  try {
    const { userId } = req.params;
    const { RoomService } = await import('./services/RoomService');
    
    const rooms = await RoomService.getUserRooms(userId);
    
    res.json({
      success: true,
      rooms: rooms.map(room => ({
        id: room._id,
        name: room.name,
        description: room.description,
        isHost: room.hostId === userId,
        participants: room.participants.length,
        lastActivity: room.lastActivity,
        shareUrl: `${req.protocol}://${req.get('host')}/room/${room._id}`
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user rooms'
    });
  }
});

// Update room settings (host only)
app.put('/api/rooms/:roomId/settings', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, settings } = req.body;
    
    if (!hostId) {
      return res.status(400).json({
        success: false,
        error: 'hostId is required'
      });
    }

    const { RoomService } = await import('./services/RoomService');
    const room = await RoomService.updateRoomSettings(roomId, hostId, settings);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found or insufficient permissions'
      });
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        settings: room.settings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update room settings'
    });
  }
});
