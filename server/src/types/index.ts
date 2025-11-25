// ===== CORE TYPES =====
export interface User {
  id: string;
  displayName: string;
  isStoryCreator: boolean;
  joinedAt: string;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  final_points: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  storyId: string;
  userId: string;
  displayName: string;
  voteValue: string;
  submittedAt: string;
}

export interface VotingSession {
  id: string;
  storyId: string;
  deckType: 'fibonacci' | 'powersOfTwo' | 'tShirt' | 'custom';
  isActive: boolean;
  votesRevealed: boolean;
  timerDuration: number;
  timerStartedAt: string | null;
  createdBy: string;
  createdAt: string;
}

// ===== ROOM TYPES (New) =====
export interface Room {
  id: string;
  name: string;
  description?: string;
  hostId: string;
  participants: RoomParticipant[];
  settings: RoomSettings;
  status: 'active' | 'paused' | 'archived';
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomParticipant {
  userId: string;
  name: string;
  displayName: string;
  role: 'host' | 'facilitator' | 'participant';
  joinedAt: string;
  lastActivity: string;
  isOnline: boolean;
}

export interface RoomSettings {
  deckType: 'fibonacci' | 'powersOfTwo' | 'tShirt' | 'custom';
  customDeck: string[];
  allowSpectators: boolean;
  autoRevealVotes: boolean;
  timerDuration: number;
  allowChangeVote: boolean;
  showVoteCount: boolean;
}

// ===== SOCKET EVENT TYPES =====
export interface SocketUser extends User {
  socketId: string;
}

export interface CreateStoryData {
  title: string;
  description?: string;
}

export interface UpdateStoryData {
  id: string;
  title: string;
  description?: string;
}

export interface BulkCreateStoriesData {
  stories: Array<{
    title: string;
    description?: string;
  }>;
}

export interface StartVotingSessionData {
  storyId: string;
  deckType?: 'fibonacci' | 'powersOfTwo' | 'tShirt' | 'custom';
  timerDuration?: number;
}

export interface SubmitVoteData {
  storyId: string;
  value: string;
}

export interface RevealVotesData {
  storyId: string;
  revealed: boolean;
}

export interface SaveStoryPointsData {
  storyId: string;
  points: string;
}

export interface TimerData {
  storyId: string;
  duration?: number;
}

export interface ChangeDeckTypeData {
  storyId: string;
  deckType: 'fibonacci' | 'powersOfTwo' | 'tShirt' | 'custom';
}

// ===== ROOM EVENT TYPES (New) =====
export interface CreateRoomData {
  name: string;
  description?: string;
  hostName: string;
  hostDisplayName: string;
  settings?: Partial<RoomSettings>;
}

export interface JoinRoomData {
  roomId: string;
  userId: string;
  name: string;
  displayName: string;
}

export interface LeaveRoomData {
  roomId: string;
  userId: string;
}

export interface UpdateRoomSettingsData {
  roomId: string;
  settings: Partial<RoomSettings>;
}

// ===== RETROSPECTIVE TYPES =====
export interface RetrospectiveParticipant {
  userId: string;
  name: string;
  displayName: string;
  joinedAt: string;
  isOnline: boolean;
}

export interface RetrospectiveCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
  order: number;
}

export interface RetrospectiveItem {
  id: string;
  categoryId: string;
  authorId: string;
  authorName?: string;
  content: string;
  groupId?: string;
  votes: Array<{
    userId: string;
    userName: string;
    votedAt: string;
  }>;
  isAnonymous: boolean;
  createdAt: string;
}

export interface RetrospectiveGroup {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  itemIds: string[];
  totalVotes: number;
  createdAt: string;
}

export interface RetrospectiveActionItem {
  id: string;
  title: string;
  description: string;
  assigneeId?: string;
  assigneeName?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'completed';
  dueDate?: string;
  createdAt: string;
}

export interface RetrospectiveVote {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  votedAt: string;
}

export interface RetrospectiveSession {
  id: string;
  retrospectiveId: string;
  phase: 'gathering' | 'grouping' | 'voting' | 'action-items' | 'completed';
  isActive: boolean;
  timerEndTime?: string;
  createdAt: string;
}

export interface RetrospectiveSettings {
  allowAnonymous: boolean;
  timerDuration: number;
  maxItemsPerCategory: number;
  votingEnabled: boolean;
  votesPerPerson: number;
}

export interface RetrospectiveStats {
  totalItems: number;
  totalVotes: number;
  totalGroups: number;
  totalActionItems: number;
  duration: number;
  participationRate: number;
}

export interface Retrospective {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  facilitatorId: string;
  participants: RetrospectiveParticipant[];
  phase: 'gathering' | 'grouping' | 'voting' | 'action-items' | 'completed';
  settings: RetrospectiveSettings;
  categories: RetrospectiveCategory[];
  items: RetrospectiveItem[];
  groups: RetrospectiveGroup[];
  actionItems: RetrospectiveActionItem[];
  stats: RetrospectiveStats;
  status: 'active' | 'completed' | 'archived';
  startedAt: string;
  completedAt?: string;
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface VoteStatistics {
  totalVotes: number;
  voteDistribution: Record<string, number>;
  votes: Array<{
    userId: string;
    displayName: string;
    voteValue?: string;
  }>;
}

// ===== SOCKET EVENT MAP =====
export interface ServerToClientEvents {
  // User events
  user_joined: (data: { user: SocketUser; stories: Story[]; votingSessions: Record<string, VotingSession>; votes: Record<string, Vote> }) => void;
  users_updated: (users: SocketUser[]) => void;
  
  // Story events
  story_created: (story: Story) => void;
  story_updated: (story: Story) => void;
  story_deleted: (data: { id: string }) => void;
  stories_bulk_created: (stories: Story[]) => void;
  story_points_saved: (data: { storyId: string; points: string; story: Story }) => void;
  
  // Voting events
  voting_session_started: (session: VotingSession) => void;
  vote_submitted: (data: { storyId: string; voteCount: number; voterName: string; userId: string; userVotes?: Array<{ userId: string; displayName: string }>; totalVoters: number; displayName: string }) => void;
  votes_revealed: (data: { storyId: string; sessionId: string; revealed: boolean; votes: Array<{ userId: string; displayName: string; voteValue: string; confidence: number }> }) => void;
  voting_reset: (data: { storyId: string }) => void;
  voting_session_ended: (data: { storyId: string }) => void;
  timer_started: (data: { storyId: string; startedAt: string; duration: number }) => void;
  timer_stopped: (data: { storyId: string }) => void;
  deck_type_changed: (data: { storyId: string; deckType: string }) => void;
  final_estimate_saved: (data: { storyId: string; sessionId: string; finalEstimate: string; voteCount: number }) => void;
  
  // Room events (New)
  room_created: (data: { room: Room; isHost: boolean }) => void;
  room_joined: (data: { room: Room; participant: RoomParticipant; isHost: boolean }) => void;
  room_left: (data: { roomId: string; userId: string }) => void;
  room_updated: (room: Room) => void;
  room_participants_updated: (data: { roomId: string; participants: RoomParticipant[] }) => void;
  user_promoted_to_admin: (data: { userId: string; displayName: string; role: string }) => void;
  user_demoted_from_admin: (data: { userId: string; displayName: string; role: string }) => void;
  room_admins_updated: (data: { admins: Array<{ userId: string; displayName: string; role: string }> }) => void;
  room_admins_list: (data: { roomId: string; admins: Array<{ userId: string; displayName: string; role: string }> }) => void;
  
  // Error events
  error: (data: { message: string; code?: string }) => void;
  
  // Retrospective events
  retrospective_user_joined: (data: { user: SocketUser; items: RetrospectiveItem[]; votes: Record<string, RetrospectiveVote[]>; session: RetrospectiveSession; connectedUsers: SocketUser[] }) => void;
  retrospective_users_updated: (users: SocketUser[]) => void;
  retrospective_item_added: (item: RetrospectiveItem) => void;
  retrospective_item_updated: (item: RetrospectiveItem) => void;
  retrospective_item_deleted: (data: { id: string }) => void;
  retrospective_vote_added: (vote: RetrospectiveVote) => void;
  retrospective_vote_removed: (data: { itemId: string; voteId: string }) => void;
  retrospective_phase_changed: (data: { phase: string }) => void;
}

export interface ClientToServerEvents {
  // User events
  join: (data: { displayName: string }) => void;
  
  // Story events
  create_story: (data: CreateStoryData) => void;
  update_story: (data: UpdateStoryData) => void;
  delete_story: (data: { id: string }) => void;
  bulk_create_stories: (data: BulkCreateStoriesData) => void;
  save_story_points: (data: SaveStoryPointsData) => void;
  
  // Voting events
  start_voting_session: (data: StartVotingSessionData) => void;
  submit_vote: (data: SubmitVoteData) => void;
  reveal_votes: (data: RevealVotesData) => void;
  reset_voting: (data: { storyId: string }) => void;
  end_voting_session: (data: { storyId: string }) => void;
  start_timer: (data: TimerData) => void;
  stop_timer: (data: { storyId: string }) => void;
  change_deck_type: (data: ChangeDeckTypeData) => void;
  save_final_estimate: (data: { storyId: string; sessionId: string; finalEstimate: string }) => void;
  
  // Room events (New)
  create_room: (data: CreateRoomData) => void;
  join_room: (data: JoinRoomData) => void;
  leave_room: (data: LeaveRoomData) => void;
  update_room_settings: (data: UpdateRoomSettingsData) => void;
  promote_to_admin: (data: { roomId: string; targetUserId: string }) => void;
  demote_from_admin: (data: { roomId: string; targetUserId: string }) => void;
  get_room_admins: (data: { roomId: string }) => void;
  
  // Retrospective events
  join_retrospective: (data: { displayName: string }) => void;
  add_retrospective_item: (data: { text: string; category: string }) => void;
  update_retrospective_item: (data: { id: string; text: string; category: string }) => void;
  delete_retrospective_item: (data: { id: string }) => void;
  vote_retrospective_item: (data: { itemId: string }) => void;
  remove_retrospective_vote: (data: { itemId: string }) => void;
  change_retrospective_phase: (data: { phase: string }) => void;
}
