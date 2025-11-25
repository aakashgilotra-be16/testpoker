import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import Room from './models/Room';
import Story from './models/Story';
import VotingSession from './models/VotingSession';
import Vote from './models/Vote';
import { StoryService } from './services/StoryService';
import { VotingService } from './services/VotingService';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents,
  SocketUser,
  Story as StoryType,
  VotingSession as VotingSessionType,
  Vote as VoteType,
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
let roomVotes: Record<string, Record<string, VoteType>> = {};
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
let votes: Record<string, VoteType> = {};
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
  retrospectiveId: 'retro-1',
  phase: 'gathering',
  isActive: true,
  createdAt: new Date().toISOString()
};

// ===== UTILITY FUNCTIONS =====
const isRoomAdmin = async (userId: string, roomId: string): Promise<boolean> => {
  try {
    const room = await Room.findById(roomId);
    return room ? room.hostId === userId : false;
  } catch (error) {
    console.error('Error checking room admin status:', error);
    return false;
  }
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
        socket.to(currentRoom).emit('users_updated', Object.values(roomConnectedUsers[currentRoom] || {}));
        
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
      const { name, description, settings, hostName, hostDisplayName } = data;
    const hostId = socket.id; // Use socket ID as host ID
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
          participants: room.participants.map(p => ({
            ...p,
            joinedAt: p.joinedAt.toISOString(),
            lastActivity: p.lastActivity.toISOString()
          })),
          settings: room.settings,
          status: room.status,
          lastActivity: room.lastActivity.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString()
        },
        isHost: true
      });      console.log(`Room created: ${room._id} by ${hostId}`);
    } catch (error) {
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to create room' 
      });
    }
  });

  socket.on('join_room', async (data) => {
    try {
      const { roomId, userId, name, displayName } = data;
      const role = 'participant'; // Default role for joining users
      const { RoomService } = await import('./services/RoomService');
      
      // Validate room code
      if (!RoomService.isValidRoomCode(roomId)) {
        socket.emit('error', { message: 'Invalid room code format' });
        return;
      }
      
      const room = await RoomService.joinRoom(roomId, { userId, name, displayName, role });
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Leave previous room if any
      if (currentRoom && currentRoom !== roomId) {
        socket.leave(currentRoom);
        socket.to(currentRoom).emit('users_updated', Object.values(roomConnectedUsers[currentRoom] || {}));
      }
      
      // Join new room
      currentRoom = roomId.toUpperCase();
      socket.join(currentRoom);
      
      // Track user's room
      userRooms[socket.id] = currentRoom;
      
      // Update user in connected users and room data
      const isAdmin = room.hostId === userId;
      const user: SocketUser = {
        id: socket.id,
        socketId: socket.id,
        displayName,
        isStoryCreator: isAdmin, // Legacy field for backwards compatibility
        joinedAt: new Date().toISOString()
      };
      connectedUsers[socket.id] = user;
      
      // Get or create room-specific data
      const roomData = getOrCreateRoomData(currentRoom);
      roomData.connectedUsers[socket.id] = user;
      
      // Notify room participants
      socket.to(currentRoom).emit('users_updated', Object.values(roomConnectedUsers[currentRoom] || {}));
      
      // Send room data to the joining user
      socket.emit('room_joined', {
        room: {
          id: room._id,
          name: room.name,
          description: room.description,
          hostId: room.hostId,
          participants: room.participants.map(p => ({
            ...p,
            joinedAt: p.joinedAt.toISOString(),
            lastActivity: p.lastActivity.toISOString()
          })),
          settings: room.settings,
          status: room.status,
          lastActivity: room.lastActivity.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString()
        },
        participant: {
          userId,
          name,
          displayName,
          role,
          joinedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          isOnline: true
        },
        isHost: room.hostId === userId
      });      // Send room-specific planning poker data with database stories
      try {
        const storiesResult = await StoryService.getStoriesByRoom(roomId, {}, 1, 50);
        const legacyStories = storiesResult.stories.map(story => ({
          id: story._id.toString(),
          title: story.title,
          description: story.description || '',
          final_points: story.final_points || null,
          created_at: story.createdAt.toISOString(),
          updated_at: story.updatedAt.toISOString()
        }));

        socket.emit('user_joined', {
          user,
          stories: legacyStories,
          votingSessions: roomData.votingSessions,
          votes: roomData.votes
        });
      } catch (error) {
        console.error('Error loading room stories:', error);
        // Fallback to empty array
        socket.emit('user_joined', {
          user,
          stories: [],
          votingSessions: roomData.votingSessions,
          votes: roomData.votes
        });
      }
      
      // Send current room users
      const roomUsers = Object.values(roomData.connectedUsers).filter(u => 
        currentRoom && io.sockets.adapter.rooms.get(currentRoom)?.has(u.socketId)
      );
      socket.emit('users_updated', roomUsers);
      io.to(currentRoom).emit('users_updated', roomUsers);
      
      console.log(`${displayName} joined room: ${currentRoom}`);
    } catch (error) {
      socket.emit('error', { 
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
        socket.to(currentRoom).emit('users_updated', Object.values(roomConnectedUsers[currentRoom] || {}));
        
        console.log(`${user.displayName} left room: ${currentRoom}`);
      }
      
      const leftRoomId = currentRoom;
      currentRoom = null;
      socket.emit('room_left', { roomId: leftRoomId, userId: socket.id });
    } catch (error) {
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to leave room' 
      });
    }
  });

  // Room info can be fetched via HTTP API endpoints

  // ===== LEGACY USER MANAGEMENT (for non-room users) =====
  socket.on('join', (data) => {
    // Users must join a room now
    socket.emit('error', { message: 'Please join or create a room to start' });
  });

  // ===== STORY MANAGEMENT =====
  socket.on('create_story', async (data) => {
    // Check if user is in a room or using legacy mode
    if (currentRoom) {
      // Room-based story creation with database
      const roomData = getOrCreateRoomData(currentRoom);
      const roomUser = roomData.connectedUsers[socket.id];
      
      if (!roomUser) {
        socket.emit('error', { message: 'User not found in room' });
        return;
      }

      // Check if user is room admin
      const isAdmin = await isRoomAdmin(socket.id, currentRoom);
      if (!isAdmin) {
        socket.emit('error', { message: 'Only room admin can create stories' });
        return;
      }

      try {
        const newStory = await StoryService.createStory(
          currentRoom,
          {
            title: data.title,
            description: data.description || '',
            priority: 'medium'
          },
          roomUser.displayName
        );

        // Emit to room with legacy-compatible format
        const legacyStory: StoryType = {
          id: newStory._id.toString(),
          title: newStory.title,
          description: newStory.description || '',
          final_points: newStory.final_points || null,
          created_at: newStory.createdAt.toISOString(),
          updated_at: newStory.updatedAt.toISOString()
        };

        // Broadcast only to room members
        io.to(currentRoom).emit('story_created', legacyStory);
        console.log(`📚 Story created in room ${currentRoom}: ${data.title}`);
      } catch (error) {
        console.error('Error creating story:', error);
        socket.emit('error', { message: 'Failed to create story' });
      }
    } else {
      // User must be in a room to create stories
      socket.emit('error', { message: 'You must join a room to create stories' });
    }
  });

  socket.on('update_story', async (data) => {
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room to update stories' });
      return;
    }

    // Check if user is room admin
    const isAdmin = await isRoomAdmin(socket.id, currentRoom);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can update stories' });
      return;
    }

    const roomData = getOrCreateRoomData(currentRoom);
    const roomUser = roomData.connectedUsers[socket.id];
    
    if (!roomUser) {
      socket.emit('error', { message: 'User not found in room' });
      return;
    }

      try {
        const updatedStory = await StoryService.updateStory(
          data.id,
          {
            title: data.title,
            description: data.description
          },
          roomUser.displayName
        );

        if (updatedStory) {
          const legacyStory = {
            id: updatedStory._id.toString(),
            title: updatedStory.title,
            description: updatedStory.description || '',
            final_points: updatedStory.final_points || null,
            created_at: updatedStory.createdAt.toISOString(),
            updated_at: updatedStory.updatedAt.toISOString()
          };

          io.to(currentRoom).emit('story_updated', legacyStory);
        }
      } catch (error) {
        console.error('Error updating story:', error);
        socket.emit('error', { message: 'Failed to update story' });
      }
  });

  socket.on('delete_story', async (data) => {
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room to delete stories' });
      return;
    }

    // Check if user is room admin
    const isAdmin = await isRoomAdmin(socket.id, currentRoom);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can delete stories' });
      return;
    }

    const roomData = getOrCreateRoomData(currentRoom);
    const roomUser = roomData.connectedUsers[socket.id];
    
    if (!roomUser) {
      socket.emit('error', { message: 'User not found in room' });
      return;
    }

      try {
        await StoryService.deleteStory(data.id, roomUser.displayName);
        io.to(currentRoom).emit('story_deleted', { id: data.id });
      } catch (error) {
        console.error('Error deleting story:', error);
        socket.emit('error', { message: 'Failed to delete story' });
      }
  });

  socket.on('bulk_create_stories', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    
    if (!currentRoom) {
      socket.emit('error', { message: 'You must join a room to create stories' });
      return;
    }

    // Check if user is room admin
    const isAdmin = await isRoomAdmin(socket.id, currentRoom);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can create stories' });
      return;
    }
    
    // Room-aware mode with database
    try {
      const createdStories = [];
        
        // Create each story in the database
        for (const story of data.stories) {
          const newStory = await StoryService.createStory(
            currentRoom,
            {
              title: story.title,
              description: story.description || '',
              priority: 'medium'
            },
            user.displayName
          );
          
          // Convert to legacy format
          createdStories.push({
            id: newStory._id.toString(),
            title: newStory.title,
            description: newStory.description || '',
            final_points: newStory.final_points || null,
            created_at: newStory.createdAt.toISOString(),
            updated_at: newStory.updatedAt.toISOString()
          });
        }

        console.log(`📚 ${createdStories.length} stories bulk created in room ${currentRoom}`);
        io.to(currentRoom).emit('stories_bulk_created', createdStories);
      } catch (error) {
        console.error('Error bulk creating stories:', error);
        socket.emit('error', { message: 'Failed to bulk create stories' });
      }
  });

  socket.on('save_story_points', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room to save story points' });
      return;
    }

    // Check if user is room admin
    const isAdmin = await isRoomAdmin(socket.id, currentRoom);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can save story points' });
      return;
    }

    try {
      const updatedStory = await StoryService.setStoryEstimate(
        data.storyId,
        data.points,
        5, // High confidence for manual estimates
        user.displayName
      );

      if (updatedStory) {
        const legacyStory = {
          id: updatedStory._id.toString(),
          title: updatedStory.title,
          description: updatedStory.description || '',
          final_points: updatedStory.final_points || null,
          created_at: updatedStory.createdAt.toISOString(),
          updated_at: updatedStory.updatedAt.toISOString()
        };

        io.to(currentRoom).emit('story_points_saved', {
          storyId: data.storyId,
          points: data.points,
          story: legacyStory
        });
      }
    } catch (error) {
      console.error('Error saving story points:', error);
      socket.emit('error', { message: 'Failed to save story points' });
    }
  });

  // ===== VOTING SESSION MANAGEMENT =====
  socket.on('start_voting_session', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room to start voting' });
      return;
    }

    // Check if user is room admin
    const isAdmin = await isRoomAdmin(socket.id, currentRoom);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can start voting sessions' });
      return;
    }

    try {
      // Verify story exists in database
      const story = await Story.findById(data.storyId);
        if (!story) {
          socket.emit('error', { 
            message: 'Story not found in database. Please refresh and try again.' 
          });
          console.error(`Story ${data.storyId} not found for voting session in room ${currentRoom}`);
          return;
        }

        // Use deckType directly (already in correct format)
        const deckType = data.deckType || 'powersOfTwo';

        const session = await VotingService.createVotingSession(
          currentRoom,
          {
            storyId: data.storyId,
            deckType: deckType,
            timerMinutes: data.timerDuration ? Math.floor(data.timerDuration / 60) : undefined,
            allowDiscussion: true,
            anonymousVoting: false,
            facilitatorId: socket.id
          },
          user.displayName
        );

        // Convert to legacy format
        const legacyDeckType = (() => {
          switch (session.deckType) {
            case 'fibonacci': return 'fibonacci';
            case 'powersOfTwo': return 'powersOfTwo';
            case 'tShirt': return 'tShirt';
            default: return 'custom';
          }
        })();

        const legacySession: VotingSessionType = {
          id: session._id.toString(),
          storyId: session.storyId.toString(),
          deckType: legacyDeckType,
          isActive: session.isActive,
          votesRevealed: session.votesRevealed,
          timerDuration: session.timerDuration,
          timerStartedAt: null,
          createdBy: session.createdBy,
          createdAt: session.createdAt.toISOString()
        };

        console.log(`🗳️ Voting session started in room ${currentRoom} for story ${data.storyId}`);
        io.to(currentRoom).emit('voting_session_started', legacySession);
    } catch (error) {
      console.error('Error starting voting session:', error);
      socket.emit('error', { message: 'Failed to start voting session' });
    }
  });

  socket.on('submit_vote', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    
    console.log(`📥 Vote submission received:`, {
      user: user.displayName,
      userId: socket.id,
      room: currentRoom,
      storyId: data.storyId,
      voteValue: data.value
    });
    
    if (currentRoom) {
      // Room-aware mode with database
      try {
        // Find the active voting session for this story
        const activeSession = await VotingService.getActiveSessionForStory(data.storyId);
        if (!activeSession) {
          console.error('❌ No active session found for story:', data.storyId);
          socket.emit('error', { message: 'No active voting session found' });
          return;
        }
        
        console.log(`✅ Found active session:`, {
          sessionId: activeSession._id.toString(),
          storyId: activeSession.storyId,
          isActive: activeSession.isActive,
          currentRound: activeSession.currentRound
        });

        // Cast vote using the service
        await VotingService.castVote(
          activeSession._id.toString(),
          socket.id,
          user.displayName,
          {
            value: data.value,
            confidence: 3
          }
        );

        // Get updated vote count
        console.log(`🔍 Fetching votes with:`, {
          sessionId: activeSession._id.toString(),
          round: activeSession.currentRound || 1,
          includeRevealed: false
        });
        
        const sessionVotes = await VotingService.getSessionVotes(
          activeSession._id.toString(),
          activeSession.currentRound || 1,
          false
        );

        console.log(`📊 Retrieved ${sessionVotes.length} votes from DB`);
        if (sessionVotes.length > 0) {
          console.log(`   First vote sample:`, {
            sessionId: sessionVotes[0].sessionId,
            userId: sessionVotes[0].userId,
            displayName: sessionVotes[0].displayName,
            roundNumber: sessionVotes[0].roundNumber,
            voteValue: sessionVotes[0].voteValue
          });
        }

        // Get all users who have voted (deduplicate by userId)
        const uniqueVoters = new Map();
        sessionVotes.forEach(vote => {
          uniqueVoters.set(vote.userId, {
            userId: vote.userId,
            displayName: vote.displayName
          });
        });
        const votersList = Array.from(uniqueVoters.values());

        // Get total number of users in the room
        const roomData = getRoomData(currentRoom);
        const connectedUserIds = Object.keys(roomData.connectedUsers);
        const totalRoomUsers = connectedUserIds.length;

        console.log(`🗳️ Vote submitted in room ${currentRoom} for story ${data.storyId}`);
        console.log(`   Session ID: ${activeSession._id.toString()}`);
        console.log(`   Current Round: ${activeSession.currentRound || 1}`);
        console.log(`   Total Votes Retrieved: ${sessionVotes.length}`);
        console.log(`   Unique Voters: ${votersList.length}/${totalRoomUsers}`);
        console.log(`   Voters:`, votersList.map(v => `${v.displayName} (${v.userId})`));
        console.log(`   Room Users:`, connectedUserIds.map(id => {
          const u = roomData.connectedUsers[id];
          return `${u?.displayName} (${id})`;
        }));
        console.log(`   Vote Details:`, sessionVotes.map(v => ({
          user: v.displayName,
          userId: v.userId,
          value: v.voteValue,
          round: v.roundNumber
        })));
        
        io.to(currentRoom).emit('vote_submitted', { 
          storyId: data.storyId, 
          voteCount: votersList.length, 
          voterName: user.displayName,
          userId: socket.id,
          userVotes: votersList,
          totalUsers: totalRoomUsers
        });
      } catch (error) {
        console.error('❌ Error submitting vote:', error);
        console.error('   Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to submit vote' 
        });
      }
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

      // Broadcast vote count update with all voters
      const storyVotes = Object.values(votes).filter(v => 
        v.storyId === data.storyId
      );
      
      const votersList = storyVotes.map(vote => ({
        userId: vote.userId,
        displayName: vote.displayName
      }));
      
      io.emit('vote_submitted', { 
        storyId: data.storyId, 
        voteCount: storyVotes.length, 
        voterName: user.displayName,
        userId: socket.id,
        userVotes: votersList,
        totalUsers: Object.keys(connectedUsers).length
      });
    }
  });

  socket.on('start_timer', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const isAdmin = await isRoomAdmin(socket.id, room);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can start timer' });
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

  socket.on('stop_timer', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const isAdmin = await isRoomAdmin(socket.id, room);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can stop timer' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.timerStartedAt = null;
      io.emit('timer_stopped', { storyId: data.storyId });
    }
  });

  socket.on('reveal_votes', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room to reveal votes' });
      return;
    }

    const isAdmin = await isRoomAdmin(socket.id, currentRoom);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can reveal votes' });
      return;
    }
    
    try {
      console.log(`🔓 Revealing votes for story ${data.storyId} in room ${currentRoom}`);
        
        // Find active session
        const activeSession = await VotingService.getActiveSessionForStory(data.storyId);
        if (!activeSession) {
          console.error('❌ No active session found for story:', data.storyId);
          socket.emit('error', { message: 'No active voting session found' });
          return;
        }

        console.log(`✅ Found session ${activeSession._id.toString()}, revealing votes...`);

        // Reveal votes using the service
        const { votes: revealedVotes } = await VotingService.revealVotes(
          activeSession._id.toString(),
          user.displayName
        );

        console.log(`✅ Revealed ${revealedVotes.length} votes`);

        // Convert to legacy format
        const legacyVotes = revealedVotes.map(vote => ({
          id: `${vote.sessionId}_${vote.userId}`,
          storyId: data.storyId,
          userId: vote.userId,
          displayName: vote.displayName,
          voteValue: vote.voteValue,
          submittedAt: vote.submittedAt.toISOString()
        }));

        io.to(currentRoom).emit('votes_revealed', {
          storyId: data.storyId,
          revealed: data.revealed,
          votes: data.revealed ? legacyVotes : []
        });
        
        console.log(`📢 Emitted votes_revealed to room ${currentRoom}`);
      } catch (error) {
        console.error('❌ Error revealing votes:', error);
        console.error('   Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to reveal votes' 
        });
      }
  });

  socket.on('reset_voting', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const isAdmin = await isRoomAdmin(socket.id, room);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can reset voting' });
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

  socket.on('change_deck_type', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const isAdmin = await isRoomAdmin(socket.id, room);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can change deck type' });
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

  socket.on('end_voting_session', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const isAdmin = await isRoomAdmin(socket.id, currentRoom);
    if (!isAdmin) {
      socket.emit('error', { message: 'Only room admin can end voting sessions' });
      return;
    }
    
    if (currentRoom) {
      try {
        const activeSession = await VotingService.getActiveSessionForStory(data.storyId);
        if (!activeSession) {
          socket.emit('error', { message: 'No active voting session found' });
          return;
        }

        await VotingService.endVotingSession(
          activeSession._id.toString(),
          undefined, // No final estimate yet
          undefined, // No confidence
          user.displayName
        );

        io.to(currentRoom).emit('voting_session_ended', { storyId: data.storyId });
      } catch (error) {
        console.error('Error ending voting session:', error);
        socket.emit('error', { message: 'Failed to end voting session' });
      }
    } else {
      // Legacy global mode
      const session = votingSessions[data.storyId];
      if (session) {
        session.isActive = false;
        io.emit('voting_session_ended', { storyId: data.storyId });
      }
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
    
    socket.emit('retrospective_user_joined', {
      user,
      items: retrospectiveItems,
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
          userName: user?.displayName || 'Anonymous',
          votedAt: new Date().toISOString()
        };
        
        if (!retrospectiveVotes[data.itemId]) {
          retrospectiveVotes[data.itemId] = [];
        }
        retrospectiveVotes[data.itemId].push(vote);
        
        // Update the votes array in the item
        item.votes = retrospectiveVotes[data.itemId].map(v => ({
          userId: v.userId,
          userName: v.userName,
          votedAt: v.votedAt
        }));
        
        io.emit('retrospective_vote_added', vote);
        console.log('🗳️ Retrospective vote added:', vote.userName);
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
        
        // Update the votes array in the item
        item.votes = retrospectiveVotes[data.itemId].map(v => ({
          userId: v.userId,
          userName: v.userName,
          votedAt: v.votedAt
        }));
        
        io.emit('retrospective_vote_removed', { itemId: data.itemId, voteId: vote.id });
        console.log('🗳️ Retrospective vote removed:', vote.userName);
      }
    }
  });

  socket.on('change_retrospective_phase', (data) => {
    retrospectiveSession.phase = data.phase as 'gathering' | 'grouping' | 'voting' | 'action-items' | 'completed';
    
    io.emit('retrospective_phase_changed', { phase: data.phase });
    console.log('🔄 Retrospective phase changed to:', data.phase);
  });
});

// ===== AI API ENDPOINTS =====
import aiRoutes from './routes/aiRoutes';
app.use('/api/retrospectives', aiRoutes);

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
    
    return res.json({
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
    return res.status(500).json({
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

    return res.json({
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
    return res.status(500).json({
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

    return res.json({
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
    return res.status(500).json({
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
    
    return res.json({
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
    return res.status(500).json({
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

    return res.json({
      success: true,
      room: {
        id: room._id,
        settings: room.settings
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update room settings'
    });
  }
});
