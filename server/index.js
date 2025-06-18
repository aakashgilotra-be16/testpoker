import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);

// Configure CORS for production
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "planning-poker-pt.netlify.app",
    /\.netlify\.app$/,
    /\.onrender\.com$/
  ],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000", 
      "planning-poker-pt.netlify.app",
      /\.netlify\.app$/,
      /\.onrender\.com$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  // Enhanced configuration for Render compatibility
  transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6,
  // Allow polling as fallback
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
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
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
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Add a simple test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    headers: req.headers,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer')
  });
});

// Wake up endpoint for keeping service alive
app.get('/wake', (req, res) => {
  res.json({
    message: 'Service is awake!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: io.engine.clientsCount || 0
  });
});

// In-memory storage (replace with database in production)
let stories = [
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

let votingSessions = {};
let votes = {};
let connectedUsers = {};

const isStoryCreator = (name) => {
  const trimmedName = name.trim().toLowerCase();
  return trimmedName === 'aakash' || trimmedName === 'mohith';
};

// Enhanced connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} via ${socket.conn.transport.name}. Total: ${io.engine.clientsCount}`);

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
      io.emit('users_updated', Object.values(connectedUsers));
    }
  });

  // User joins with display name
  socket.on('join', (data) => {
    const { displayName } = data;
    connectedUsers[socket.id] = {
      id: socket.id,
      displayName,
      isStoryCreator: isStoryCreator(displayName),
      joinedAt: new Date().toISOString()
    };

    socket.emit('user_joined', {
      user: connectedUsers[socket.id],
      stories,
      votingSessions,
      votes
    });

    // Broadcast user list update
    io.emit('users_updated', Object.values(connectedUsers));
    
    console.log(`${displayName} joined as ${isStoryCreator(displayName) ? 'Story Creator' : 'Team Member'}`);
  });

  // Story CRUD operations (only for story creators)
  socket.on('create_story', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can create stories' });
      return;
    }

    const newStory = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description || '',
      final_points: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    stories.unshift(newStory);
    io.emit('story_created', newStory);
  });

  socket.on('update_story', (data) => {
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
  });

  socket.on('delete_story', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can delete stories' });
      return;
    }

    const storyIndex = stories.findIndex(s => s.id === data.id);
    if (storyIndex !== -1) {
      const deletedStory = stories.splice(storyIndex, 1)[0];
      
      // Clean up related voting sessions and votes
      delete votingSessions[data.id];
      Object.keys(votes).forEach(key => {
        if (key.startsWith(`${data.id}_`)) {
          delete votes[key];
        }
      });

      io.emit('story_deleted', { id: data.id });
    }
  });

  socket.on('bulk_create_stories', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can create stories' });
      return;
    }

    const newStories = data.stories.map(story => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: story.title,
      description: story.description || '',
      final_points: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    stories.unshift(...newStories);
    io.emit('stories_bulk_created', newStories);
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

  // Voting session management
  socket.on('start_voting_session', (data) => {
    const user = connectedUsers[socket.id];
    if (!user || !user.isStoryCreator) {
      socket.emit('error', { message: 'Only story creators can start voting sessions' });
      return;
    }

    const session = {
      id: `${data.storyId}_${Date.now()}`,
      storyId: data.storyId,
      deckType: data.deckType || 'fibonacci',
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
  });

  socket.on('submit_vote', (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

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

    // Broadcast vote count update (without revealing actual votes)
    const storyVotes = Object.values(votes).filter(v => v.storyId === data.storyId);
    io.emit('vote_submitted', {
      storyId: data.storyId,
      voteCount: storyVotes.length,
      voterName: user.displayName
    });
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

      const storyVotes = Object.values(votes).filter(v => v.storyId === data.storyId);
      
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
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Enhanced startup
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`📡 Backend URL: https://planning-poker-backend-dxkk.onrender.com`);
  console.log(`🏥 Health check: https://planning-poker-backend-dxkk.onrender.com/health`);
  console.log(`🧪 Test endpoint: https://planning-poker-backend-dxkk.onrender.com/test`);
  console.log(`🔧 Transport modes: polling, websocket`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
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
}, 300000); // Every 5 minutes

// Self-ping to prevent sleeping (Render free tier)
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    try {
      const response = await fetch('https://planning-poker-backend-dxkk.onrender.com/wake');
      console.log('Self-ping successful:', response.status);
    } catch (error) {
      console.log('Self-ping failed:', error.message);
    }
  }, 840000); // Every 14 minutes (before 15-minute sleep)
}
