import type {
  SocketUser,
  Story as StoryType,
  VotingSession as VotingSessionType,
  Vote as VoteType
} from '../types/index';

// ===== IN-MEMORY STORAGE =====
// Room-based storage
export const roomStories: Record<string, StoryType[]> = {};
export const roomVotingSessions: Record<string, Record<string, VotingSessionType>> = {};
export const roomVotes: Record<string, Record<string, VoteType>> = {};
export const roomConnectedUsers: Record<string, Record<string, SocketUser>> = {};

// User to room mapping
export const userRooms: Record<string, string> = {};

// Socket ID to actual User ID mapping (for authorization)
export const socketToUserId: Record<string, string> = {};

// Temporary vote storage (before saving to DB)
// Format: { sessionId: { userId: { value, confidence, displayName, submittedAt } } }
export const temporaryVotes: Record<string, Record<string, { value: string; confidence: number; displayName: string; submittedAt: Date; reasoning?: string }>> = {};

// Legacy global storage for backward compatibility
export const stories: StoryType[] = [
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

export const votingSessions: Record<string, VotingSessionType> = {};
export const votes: Record<string, VoteType> = {};
export const connectedUsers: Record<string, SocketUser> = {};

// Helper functions for room-based data management
export const getOrCreateRoomData = (roomId: string) => {
  if (!roomStories[roomId]) roomStories[roomId] = [];
  if (!roomVotingSessions[roomId]) roomVotingSessions[roomId] = {};
  if (!roomVotes[roomId]) roomVotes[roomId] = {};
  if (!roomConnectedUsers[roomId]) roomConnectedUsers[roomId] = {};

  return {
    stories: roomStories[roomId],
    votingSessions: roomVotingSessions[roomId],
    votes: roomVotes[roomId],
    connectedUsers: roomConnectedUsers[roomId]
  };
};

export const getRoomData = (roomId: string) => {
  return {
    stories: roomStories[roomId] || [],
    votingSessions: roomVotingSessions[roomId] || {},
    votes: roomVotes[roomId] || {},
    connectedUsers: roomConnectedUsers[roomId] || {}
  };
};

// Retrospective storage (legacy)
export interface RetrospectiveData {
  items: any[];
  votes: Record<string, any>;
}

export const retrospectives: Record<string, RetrospectiveData> = {};

export const getOrCreateRetrospectiveData = (roomId: string): RetrospectiveData => {
  if (!retrospectives[roomId]) {
    retrospectives[roomId] = {
      items: [],
      votes: {}
    };
  }
  return retrospectives[roomId];
};
