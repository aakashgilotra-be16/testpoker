/**
 * Centralized Type Definitions
 * Enterprise-level type safety and consistency
 */

// Base Entity Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Management
export interface User {
  id: string;
  name: string;
  isHost?: boolean;
  joinedAt: Date;
  lastSeen: Date;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface Participant {
  userId: string;
  name: string;
  displayName: string;
  role: 'host' | 'facilitator' | 'participant';
  joinedAt: string;
  lastActivity: string;
  isOnline: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  votingScale: string[];
  autoRevealVotes: boolean;
  soundEnabled: boolean;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  joinLeave: boolean;
  votingEvents: boolean;
  storyUpdates: boolean;
  retrospectiveUpdates: boolean;
}

// Room Management
export interface Room extends BaseEntity {
  code: string;
  name?: string;
  description?: string;
  type?: 'planning-poker' | 'retrospective';
  hostId: string;
  participants: Participant[];
  settings: RoomSettings;
  isActive?: boolean;
  status?: 'active' | 'paused' | 'archived';
  lastActivity: Date;
}

export interface RoomSettings {
  maxParticipants: number;
  allowSpectators: boolean;
  autoRevealVotes: boolean;
  votingTimeLimit?: number;
  requireAuth: boolean;
  isPublic: boolean;
  customVotingScale?: string[];
}

// Planning Poker Types
export interface Story extends BaseEntity {
  title: string;
  description?: string;
  acceptanceCriteria?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'voting' | 'voted' | 'estimated';
  estimate?: string;
  consensus?: number; // Percentage of agreement
  roomId: string;
  createdBy: string;
  tags?: string[];
  attachments?: Attachment[];
}

export interface Vote extends BaseEntity {
  userId: string;
  userName: string;
  storyId: string;
  value: string;
  confidence?: number; // 1-5 scale
  comment?: string;
  isRevealed: boolean;
}

export interface VotingSession extends BaseEntity {
  storyId: string;
  roomId: string;
  votes: Vote[];
  isActive: boolean;
  isRevealed: boolean;
  startedAt: Date;
  endedAt?: Date;
  timeLimit?: number;
  consensus?: ConsensusData;
}

export interface ConsensusData {
  hasConsensus: boolean;
  averageVote?: number;
  medianVote?: number;
  mode?: string;
  variance: number;
  agreementPercentage: number;
  outliers: string[]; // User IDs with outlier votes
}

// Retrospective Types
export interface RetrospectiveItem extends BaseEntity {
  content: string;
  category: 'went-well' | 'to-improve' | 'action-items';
  author: string;
  authorId: string;
  roomId: string;
  votes?: number;
  votedBy?: string[];
  isResolved?: boolean;
  tags?: string[];
  priority?: number;
}

export interface RetrospectiveSession extends BaseEntity {
  roomId: string;
  items: RetrospectiveItem[];
  phase: 'collecting' | 'voting' | 'discussing' | 'completed';
  settings: RetrospectiveSettings;
  facilitatorId: string;
  actionItems?: ActionItem[];
}

export interface RetrospectiveSettings {
  allowVoting: boolean;
  maxItemsPerCategory: number;
  timeBoxed: boolean;
  phaseTimeLimits?: {
    collecting: number;
    voting: number;
    discussing: number;
  };
  anonymousItems: boolean;
}

export interface ActionItem extends BaseEntity {
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  status: 'open' | 'in-progress' | 'completed' | 'blocked';
  retrospectiveId: string;
}

// Common Utility Types
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: ToastAction;
}

export interface ToastAction {
  label: string;
  handler: () => void;
}

// Socket Event Types
export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface RoomJoinData {
  roomCode: string;
  userName: string;
  userId?: string;
}

export interface RoomJoinResponse extends SocketResponse {
  data: {
    room: Room;
    user: User;
    existingStories?: Story[];
    activeSessions?: VotingSession[];
    retrospectiveData?: RetrospectiveSession;
  };
}

// Export/Import Types
export interface ExportData {
  room: Room;
  stories: Story[];
  votingSessions: VotingSession[];
  retrospective?: RetrospectiveSession;
  exportedAt: Date;
  exportedBy: string;
  format: 'json' | 'csv' | 'pdf';
}

export interface ImportResult {
  success: boolean;
  imported: {
    stories: number;
    sessions: number;
    retrospectiveItems: number;
  };
  errors?: string[];
  warnings?: string[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ResponseMetadata {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
  processingTime?: number;
}

// Form Types
export interface StoryFormData {
  title: string;
  description?: string;
  acceptanceCriteria?: string[];
  priority: Story['priority'];
  tags?: string[];
}

export interface RetrospectiveItemFormData {
  content: string;
  category: RetrospectiveItem['category'];
  tags?: string[];
}

export interface RoomFormData {
  name?: string;
  type: Room['type'];
  settings: Partial<RoomSettings>;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  retry?: () => void;
}

// Hook Return Types
export interface UseSocketReturn {
  socket: any; // Socket.IO instance
  isConnected: boolean;
  error?: string;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
}

export interface UseAuthReturn {
  user?: User;
  isAuthenticated: boolean;
  login: (userData: Partial<User>) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export interface UseRoomReturn {
  room?: Room;
  participants: User[];
  isHost: boolean;
  joinRoom: (data: RoomJoinData) => Promise<void>;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  loading: LoadingState;
}

// Validation Types
export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
  message?: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Theme Types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  shadows: Record<string, string>;
  borderRadius: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, any>;
}

// Analytics Types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
}

export interface SessionAnalytics {
  sessionId: string;
  roomId: string;
  duration: number;
  participantCount: number;
  storiesEstimated: number;
  consensusRate: number;
  averageVotingTime: number;
  events: AnalyticsEvent[];
}

// Feature Flag Types
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
  variants?: Record<string, any>;
}

// Utility Type Helpers
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Event Handler Types
export type EventHandler<T = any> = (event: T) => void;
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;
export type VoidFunction = () => void;
export type AsyncVoidFunction = () => Promise<void>;

// Status Types
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';
export type VotingStatus = 'waiting' | 'voting' | 'revealing' | 'completed';

// Generic Utility Types
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  group?: string;
}

export interface SortConfig<T = string> {
  field: T;
  direction: 'asc' | 'desc';
}

export interface FilterConfig<T = any> {
  field: string;
  operator: 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge' | 'contains' | 'startsWith' | 'endsWith';
  value: T;
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total?: number;
}

// Re-export commonly used types
// Participant type is now defined above