import { z } from 'zod';

// ===== COMMON ENUMS =====
export enum DeckType {
  FIBONACCI = 'fibonacci',
  POWERS_OF_TWO = 'powersOfTwo',
  T_SHIRT = 'tShirt',
  CUSTOM = 'custom'
}

export enum RoomStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived'
}

export enum StoryStatus {
  PENDING = 'pending',
  VOTING = 'voting', 
  VOTED = 'voted',
  ARCHIVED = 'archived'
}

export enum UserRole {
  HOST = 'host',
  FACILITATOR = 'facilitator',
  PARTICIPANT = 'participant'
}

// ===== ZOD SCHEMAS =====

// Room schemas
export const RoomParticipantSchema = z.object({
  userId: z.string(),
  name: z.string(),
  displayName: z.string(),
  role: z.nativeEnum(UserRole),
  joinedAt: z.date(),
  lastActivity: z.date(),
  isOnline: z.boolean().default(false)
});

export const RoomSettingsSchema = z.object({
  deckType: z.nativeEnum(DeckType).default(DeckType.POWERS_OF_TWO),
  customDeck: z.array(z.string()).default([]),
  allowSpectators: z.boolean().default(true),
  autoRevealVotes: z.boolean().default(false),
  timerDuration: z.number().min(10).max(600).default(60),
  allowChangeVote: z.boolean().default(true),
  showVoteCount: z.boolean().default(true)
});

export const RoomStatsSchema = z.object({
  totalSessions: z.number().default(0),
  totalVotes: z.number().default(0),
  averageVotingTime: z.number().default(0),
  completedStories: z.number().default(0)
});

export const RoomSchema = z.object({
  _id: z.string().regex(/^[A-Z0-9]{6}$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  hostId: z.string(),
  participants: z.array(RoomParticipantSchema).max(30),
  settings: RoomSettingsSchema,
  stats: RoomStatsSchema,
  status: z.nativeEnum(RoomStatus).default(RoomStatus.ACTIVE),
  lastActivity: z.date(),
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Story schemas
export const StorySchema = z.object({
  _id: z.string(),
  roomId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  finalPoints: z.string().nullable().default(null),
  createdBy: z.string(),
  updatedBy: z.string().nullable().default(null),
  status: z.nativeEnum(StoryStatus).default(StoryStatus.PENDING),
  priority: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Voting schemas
export const VoteSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  voteValue: z.string(),
  submittedAt: z.date()
});

export const VotingSessionSettingsSchema = z.object({
  autoReveal: z.boolean().default(false),
  allowChangeVote: z.boolean().default(true),
  showVoteCount: z.boolean().default(true)
});

export const VotingSessionSchema = z.object({
  _id: z.string(),
  roomId: z.string(),
  storyId: z.string(),
  deckType: z.nativeEnum(DeckType).default(DeckType.POWERS_OF_TWO),
  customDeck: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  votesRevealed: z.boolean().default(false),
  timerDuration: z.number().min(10).max(600).default(60),
  timerStartedAt: z.date().nullable().default(null),
  votes: z.array(VoteSchema).default([]),
  createdBy: z.string(),
  sessionSettings: VotingSessionSettingsSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

// ===== TYPE EXPORTS =====
export type Room = z.infer<typeof RoomSchema>;
export type RoomParticipant = z.infer<typeof RoomParticipantSchema>;
export type RoomSettings = z.infer<typeof RoomSettingsSchema>;
export type RoomStats = z.infer<typeof RoomStatsSchema>;

export type Story = z.infer<typeof StorySchema>;
export type Vote = z.infer<typeof VoteSchema>;
export type VotingSession = z.infer<typeof VotingSessionSchema>;
export type VotingSessionSettings = z.infer<typeof VotingSessionSettingsSchema>;

// ===== API REQUEST/RESPONSE TYPES =====

// Room API types
export interface CreateRoomRequest {
  name: string;
  description?: string;
  hostName: string;
  hostDisplayName: string;
  settings?: Partial<RoomSettings>;
}

export interface JoinRoomRequest {
  roomId: string;
  userId: string;
  name: string;
  displayName: string;
}

export interface RoomResponse {
  room: Room;
  isHost: boolean;
  canManage: boolean;
}

// Story API types  
export interface CreateStoryRequest {
  roomId: string;
  title: string;
  description?: string;
  createdBy: string;
}

export interface UpdateStoryRequest {
  storyId: string;
  title?: string;
  description?: string;
  finalPoints?: string;
  status?: StoryStatus;
  updatedBy: string;
}

// Voting API types
export interface StartVotingRequest {
  roomId: string;
  storyId: string;
  deckType?: DeckType;
  customDeck?: string[];
  timerDuration?: number;
  sessionSettings?: Partial<VotingSessionSettings>;
  createdBy: string;
}

export interface SubmitVoteRequest {
  sessionId: string;
  userId: string;
  displayName: string;
  voteValue: string;
}

export interface VoteStatistics {
  totalVotes: number;
  voteDistribution: Record<string, number>;
  votes: Array<{ userId: string; displayName: string; voteValue?: string }>;
}

// ===== SOCKET EVENT TYPES =====
export interface SocketEvents {
  // Room events
  'room:create': (data: CreateRoomRequest) => void;
  'room:join': (data: JoinRoomRequest) => void;
  'room:leave': (data: { roomId: string; userId: string }) => void;
  'room:update_settings': (data: { roomId: string; settings: Partial<RoomSettings>; userId: string }) => void;
  
  // Story events
  'story:create': (data: CreateStoryRequest) => void;
  'story:update': (data: UpdateStoryRequest) => void;
  'story:delete': (data: { storyId: string; userId: string }) => void;
  'story:bulk_create': (data: { roomId: string; stories: Array<Pick<CreateStoryRequest, 'title' | 'description'>>; createdBy: string }) => void;
  
  // Voting events
  'voting:start_session': (data: StartVotingRequest) => void;
  'voting:submit_vote': (data: SubmitVoteRequest) => void;
  'voting:reveal_votes': (data: { sessionId: string; revealed: boolean; userId: string }) => void;
  'voting:reset_session': (data: { sessionId: string; userId: string }) => void;
  'voting:end_session': (data: { sessionId: string; userId: string }) => void;
  'voting:start_timer': (data: { sessionId: string; duration: number; userId: string }) => void;
  'voting:stop_timer': (data: { sessionId: string; userId: string }) => void;
}

// ===== ERROR TYPES =====
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const ErrorCodes = {
  // Room errors
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_EXPIRED: 'ROOM_EXPIRED',
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Story errors
  STORY_NOT_FOUND: 'STORY_NOT_FOUND',
  INVALID_STORY_DATA: 'INVALID_STORY_DATA',
  
  // Voting errors
  VOTING_SESSION_NOT_FOUND: 'VOTING_SESSION_NOT_FOUND',
  VOTING_SESSION_INACTIVE: 'VOTING_SESSION_INACTIVE',
  VOTES_ALREADY_REVEALED: 'VOTES_ALREADY_REVEALED',
  INVALID_VOTE_VALUE: 'INVALID_VOTE_VALUE',
  
  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED'
} as const;

// ===== UTILITY TYPES =====
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>;

// ===== CONSTANTS =====
export const CONSTANTS = {
  ROOM: {
    MAX_PARTICIPANTS: 30,
    EXPIRY_DAYS: 7,
    CODE_LENGTH: 6,
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500
  },
  STORY: {
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 1000
  },
  VOTING: {
    TIMER_MIN_SECONDS: 10,
    TIMER_MAX_SECONDS: 600,
    DEFAULT_TIMER_SECONDS: 60
  },
  DECK_VALUES: {
    [DeckType.FIBONACCI]: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'],
    [DeckType.POWERS_OF_TWO]: ['0', '1', '2', '4', '8', '16', '32', '64', '?'],
    [DeckType.T_SHIRT]: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?']
  }
} as const;
