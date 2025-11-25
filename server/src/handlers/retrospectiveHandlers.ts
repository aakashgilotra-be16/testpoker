import { Socket } from 'socket.io';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  SocketUser, 
  RetrospectiveItem, 
  RetrospectiveVote, 
  RetrospectiveSession 
} from '../types/index';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents>;

// In-memory storage for retrospectives
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

export const setupRetrospectiveHandlers = (socket: SocketType, io: any) => {
  
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
      retrospectiveItems[itemIndex] = {
        ...retrospectiveItems[itemIndex],
        content: data.text,
        categoryId: data.category,
        createdAt: new Date().toISOString()
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

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    if (retrospectiveConnectedUsers[socket.id]) {
      delete retrospectiveConnectedUsers[socket.id];
      const allUsers = Object.values(retrospectiveConnectedUsers);
      io.emit('retrospective_users_updated', allUsers);
    }
  });
};

// Export storage for testing/debugging
export const getRetrospectiveData = () => ({
  items: retrospectiveItems,
  votes: retrospectiveVotes,
  users: retrospectiveConnectedUsers,
  session: retrospectiveSession
});
