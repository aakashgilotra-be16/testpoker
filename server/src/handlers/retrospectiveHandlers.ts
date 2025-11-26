import { Socket } from 'socket.io';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  SocketUser, 
  RetrospectiveItem, 
  RetrospectiveVote, 
  RetrospectiveSession 
} from '../types/index.js';
import { getSchemeConfig } from '../utils/retrospectiveSchemes.js';
import { generateAIActionItems, checkAIServiceHealth } from '../services/AIService.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents>;

// In-memory storage for retrospectives - organized by room
const retrospectiveRooms = new Map<string, {
  items: RetrospectiveItem[];
  votes: Record<string, RetrospectiveVote[]>;
  users: Record<string, SocketUser>;
  session: RetrospectiveSession;
  aiActions: Map<string, any>;
}>();

// Track which room each socket is in
const socketRoomMap = new Map<string, string>();

// Helper to get or create room data
function getOrCreateRoomData(roomId: string) {
  if (!retrospectiveRooms.has(roomId)) {
    retrospectiveRooms.set(roomId, {
      items: [],
      votes: {},
      users: {},
      session: {
        id: `retrospective-${roomId}`,
        retrospectiveId: `retro-${roomId}`,
        phase: 'gathering',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      aiActions: new Map()
    });
  }
  return retrospectiveRooms.get(roomId)!;
}

export const setupRetrospectiveHandlers = (socket: SocketType, io: any) => {
  
  socket.on('join_retrospective', (data: { displayName: string; roomId?: string }) => {
    // Extract roomId from data, or use default
    const roomId = data.roomId || 'default-room';
    
    // Store room mapping for this socket
    socketRoomMap.set(socket.id, roomId);
    
    // Join the socket.io room
    socket.join(`retrospective-${roomId}`);
    
    // Get or create room data
    const roomData = getOrCreateRoomData(roomId);
    
    const user: SocketUser = {
      id: socket.id,
      socketId: socket.id,
      displayName: data.displayName,
      isStoryCreator: false,
      joinedAt: new Date().toISOString()
    };
    
    roomData.users[socket.id] = user;
    const allUsers = Object.values(roomData.users);
    
    socket.emit('retrospective_user_joined', {
      user,
      items: roomData.items,
      votes: roomData.votes,
      session: roomData.session,
      connectedUsers: allUsers
    });
    
    io.to(`retrospective-${roomId}`).emit('retrospective_users_updated', allUsers);
    console.log('👤 User joined retrospective:', data.displayName, 'Total users:', allUsers.length);
  });

  socket.on('add_retrospective_item', (data) => {
    const roomId = socketRoomMap.get(socket.id) || 'default-room';
    const roomData = getOrCreateRoomData(roomId);
    const user = roomData.users[socket.id];
    
    const frontendItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: data.text,
      category: data.category as 'went-well' | 'to-improve' | 'action-items',
      author: user?.displayName || 'Anonymous',
      authorId: socket.id,
      roomId: roomId,
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
    
    roomData.items.unshift(backendItem);
    roomData.votes[frontendItem.id] = [];
    
    io.to(`retrospective-${roomId}`).emit('retrospective_item_added', frontendItem as any);
    console.log('📝 Retrospective item added in room', roomId, ':', frontendItem.content);
  });

  socket.on('update_retrospective_item', (data) => {
    const roomId = socketRoomMap.get(socket.id) || 'default-room';
    const roomData = getOrCreateRoomData(roomId);
    const itemIndex = roomData.items.findIndex(item => item.id === data.id);
    if (itemIndex !== -1) {
      roomData.items[itemIndex] = {
        ...roomData.items[itemIndex],
        content: data.text,
        categoryId: data.category,
        createdAt: new Date().toISOString()
      };
      
      const frontendItem = {
        id: roomData.items[itemIndex].id,
        content: data.text,
        category: data.category as 'went-well' | 'to-improve' | 'action-items',
        author: roomData.items[itemIndex].authorName || 'Anonymous',
        authorId: roomData.items[itemIndex].authorId,
        roomId: roomId,
        votes: roomData.votes[roomData.items[itemIndex].id]?.length || 0,
        votedBy: roomData.votes[roomData.items[itemIndex].id]?.map(v => (v as any).userId) || [],
        isResolved: false,
        tags: [],
        priority: 0,
        createdAt: new Date(roomData.items[itemIndex].createdAt),
        updatedAt: new Date()
      };
      
      io.to(`retrospective-${roomId}`).emit('retrospective_item_updated', frontendItem as any);
      console.log('✏️ Retrospective item updated in room', roomId, ':', data.id);
    }
  });

  socket.on('delete_retrospective_item', (data) => {
    const roomId = socketRoomMap.get(socket.id) || 'default-room';
    const roomData = getOrCreateRoomData(roomId);
    const itemIndex = roomData.items.findIndex(item => item.id === data.id);
    if (itemIndex !== -1) {
      roomData.items.splice(itemIndex, 1);
      delete roomData.votes[data.id];
      
      io.to(`retrospective-${roomId}`).emit('retrospective_item_deleted', { id: data.id });
      console.log('🗑️ Retrospective item deleted in room', roomId, ':', data.id);
    }
  });

  socket.on('vote_retrospective_item', (data) => {
    const roomId = socketRoomMap.get(socket.id) || 'default-room';
    const roomData = getOrCreateRoomData(roomId);
    const item = roomData.items.find(item => item.id === data.itemId);
    if (item) {
      const existingVote = roomData.votes[data.itemId]?.find(vote => vote.userId === socket.id);
      if (!existingVote) {
        const user = roomData.users[socket.id];
        const vote: RetrospectiveVote = {
          id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          itemId: data.itemId,
          userId: socket.id,
          userName: user?.displayName || 'Anonymous',
          votedAt: new Date().toISOString()
        };
        
        if (!roomData.votes[data.itemId]) {
          roomData.votes[data.itemId] = [];
        }
        roomData.votes[data.itemId].push(vote);
        
        item.votes = roomData.votes[data.itemId].map(v => ({
          userId: v.userId,
          userName: v.userName,
          votedAt: v.votedAt
        }));
        
        io.to(`retrospective-${roomId}`).emit('retrospective_vote_added', vote);
        console.log('🗳️ Retrospective vote added in room', roomId, ':', vote.userName);
      }
    }
  });

  socket.on('remove_retrospective_vote', (data) => {
    const roomId = socketRoomMap.get(socket.id) || 'default-room';
    const roomData = getOrCreateRoomData(roomId);
    const item = roomData.items.find(item => item.id === data.itemId);
    if (item && roomData.votes[data.itemId]) {
      const voteIndex = roomData.votes[data.itemId].findIndex(vote => vote.userId === socket.id);
      if (voteIndex !== -1) {
        const vote = roomData.votes[data.itemId][voteIndex];
        roomData.votes[data.itemId].splice(voteIndex, 1);
        
        item.votes = roomData.votes[data.itemId].map(v => ({
          userId: v.userId,
          userName: v.userName,
          votedAt: v.votedAt
        }));
        
        io.to(`retrospective-${roomId}`).emit('retrospective_vote_removed', { itemId: data.itemId, voteId: vote.id });
        console.log('🗳️ Retrospective vote removed in room', roomId, ':', vote.userName);
      }
    }
  });

  socket.on('change_retrospective_phase', (data) => {
    const roomId = socketRoomMap.get(socket.id) || 'default-room';
    const roomData = getOrCreateRoomData(roomId);
    roomData.session.phase = data.phase as 'gathering' | 'grouping' | 'voting' | 'action-items' | 'completed';
    
    io.to(`retrospective-${roomId}`).emit('retrospective_phase_changed', { phase: data.phase });
    console.log('🔄 Retrospective phase changed to', data.phase, 'in room', roomId);
  });

  socket.on('change_retrospective_scheme', (data) => {
    const roomId = socketRoomMap.get(socket.id) || 'default-room';
    const schemeConfig = getSchemeConfig(data.scheme);
    
    const categories = schemeConfig.categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      description: cat.description || '',
      order: 0
    }));
    
    io.to(`retrospective-${roomId}`).emit('retrospective_scheme_changed', {
      scheme: data.scheme,
      categories
    });
    
    console.log('🔄 Retrospective scheme changed to', data.scheme, 'in room', roomId);
  });

  socket.on('generate_ai_actions', async (data) => {
    try {
      const roomId = socketRoomMap.get(socket.id) || 'default-room';
      const roomData = getOrCreateRoomData(roomId);
      
      // Group items by category for context
      const contextByCategory: Record<string, string[]> = {};
      
      data.contextItems.forEach((item: RetrospectiveItem) => {
        const categoryId = item.categoryId || (item as any).category || 'unknown';
        if (!contextByCategory[categoryId]) {
          contextByCategory[categoryId] = [];
        }
        contextByCategory[categoryId].push(item.content);
      });
      
      // Build comprehensive context for AI with clear structure
      let aiPrompt = `You are an expert agile coach helping a software development team create actionable items from their retrospective feedback.

Context: This is a team retrospective session where team members have shared their thoughts and experiences.

Team Feedback by Category:
`;

      // Add categorized feedback
      Object.entries(contextByCategory).forEach(([category, items]) => {
        const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        aiPrompt += `\n${categoryName}:\n`;
        items.forEach((item, index) => {
          aiPrompt += `  ${index + 1}. ${item}\n`;
        });
      });

      aiPrompt += `\n
Your Task:
Analyze the above feedback and generate 3-5 specific, actionable items that the team should work on. Each action item should:

1. Be concrete and measurable
2. Address root causes, not just symptoms
3. Be achievable within 1-2 sprints
4. Have clear ownership potential
5. Focus on the most impactful improvements mentioned

For each action item, provide:
- A clear, concise title (max 80 characters)
- A detailed description explaining what needs to be done and why
- Priority level (high/medium/low) based on impact and urgency
- Which feedback items it addresses

Focus especially on:
- Issues mentioned in "to improve", "stop doing", "mad", "sad", or "lacked" categories
- Concrete process improvements
- Technical debt or blockers
- Team collaboration and communication improvements
- Tools, practices, or workflows that need attention

Generate practical action items that will make a real difference for the team.`;

      // Prepare AI context
      const aiContext = {
        prompt: aiPrompt,
        feedbackCount: data.contextItems.length,
        categories: Object.keys(contextByCategory),
        timestamp: new Date().toISOString()
      };
      
      // Call real Gemini AI service
      console.log('🤖 Calling Gemini AI to generate action items for room', roomId, '...');
      const aiResult = await generateAIActionItems(contextByCategory, data.contextItems, aiContext);
      
      if (!aiResult.success) {
        console.error('❌ AI generation failed:', aiResult.error);
        socket.emit('error', { 
          message: `Failed to generate AI actions: ${aiResult.error}` 
        });
        return;
      }
      
      const generatedActions = aiResult.actions;
      
      // Store generated actions for later retrieval in room-specific storage
      generatedActions.forEach(action => {
        roomData.aiActions.set(action.id, action);
      });
      
      io.to(`retrospective-${roomId}`).emit('retrospective_ai_actions_generated', {
        actionItems: generatedActions
      });
      
      const { processingTime, modelUsed } = aiResult.metadata || {};
      console.log(`✨ AI actions generated for room ${roomId}: ${generatedActions.length} items using ${modelUsed} in ${processingTime}ms`);
      console.log('📝 AI Context prepared with', data.contextItems.length, 'feedback items');
    } catch (error) {
      console.error('❌ Error generating AI actions:', error);
      socket.emit('error', { message: 'Failed to generate AI actions' });
    }
  });

  socket.on('approve_ai_action', (data) => {
    const roomId = socketRoomMap.get(socket.id) || 'default-room';
    const roomData = getOrCreateRoomData(roomId);
    const user = roomData.users[socket.id];
    
    // Retrieve the AI action item from room-specific storage
    const aiItem = roomData.aiActions.get(data.actionItemId) || { 
      title: 'Action from AI', 
      description: 'AI-generated action item' 
    };
    
    // Create approved action with proper structure
    const approvedAction = {
      id: data.actionItemId,
      title: aiItem.title || 'Action from AI',
      description: aiItem.description || '',
      priority: aiItem.priority || 'medium' as const,
      status: 'open' as const,
      isDraft: false,
      aiGenerated: true,
      createdAt: new Date().toISOString()
    };
    
    // Remove from temporary storage
    roomData.aiActions.delete(data.actionItemId);
    
    io.to(`retrospective-${roomId}`).emit('retrospective_action_item_approved', {
      actionItem: approvedAction
    });
    
    console.log('✅ AI action approved in room', roomId, ':', data.actionItemId, 'by', user?.displayName);
  });

  socket.on('discard_ai_action', (data) => {
    const roomId = socketRoomMap.get(socket.id) || 'default-room';
    const roomData = getOrCreateRoomData(roomId);
    
    // Remove from room-specific storage
    roomData.aiActions.delete(data.actionItemId);
    
    io.to(`retrospective-${roomId}`).emit('retrospective_action_item_discarded', {
      actionItemId: data.actionItemId
    });
    
    console.log('🗑️ AI action discarded in room', roomId, ':', data.actionItemId);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    const roomId = socketRoomMap.get(socket.id);
    if (roomId) {
      const roomData = retrospectiveRooms.get(roomId);
      if (roomData && roomData.users[socket.id]) {
        delete roomData.users[socket.id];
        const allUsers = Object.values(roomData.users);
        io.to(`retrospective-${roomId}`).emit('retrospective_users_updated', allUsers);
        
        // Clean up socket mapping
        socketRoomMap.delete(socket.id);
        
        console.log('👋 User disconnected from retrospective room', roomId);
      }
    }
  });
};

// Export storage for testing/debugging
export const getRetrospectiveData = (roomId: string = 'default-room') => {
  const roomData = retrospectiveRooms.get(roomId);
  if (!roomData) {
    return {
      items: [],
      votes: {},
      users: {},
      session: {
        id: 'default',
        roomId: roomId,
        scheme: 'start-stop-continue',
        phase: 'gathering' as const,
        startedAt: new Date().toISOString(),
        maxVotesPerUser: 3
      }
    };
  }
  return {
    items: roomData.items,
    votes: roomData.votes,
    users: roomData.users,
    session: roomData.session
  };
};
