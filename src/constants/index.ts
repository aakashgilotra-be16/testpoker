/**
 * Application Constants
 * Centralized configuration values for maintainability
 */

// Application Configuration
export const APP_CONFIG = {
  ROOM_CODE_LENGTH: 6,
  MAX_ROOM_PARTICIPANTS: 50,
  MAX_STORIES_PER_ROOM: 100,
  RETROSPECTIVE_MAX_ITEMS_PER_CATEGORY: 50,
  SOCKET_RECONNECTION_ATTEMPTS: 5,
  SOCKET_TIMEOUT: 10000,
} as const;

// Voting System
export const VOTING_CONFIG = {
  DEFAULT_VOTING_SCALE: ['1', '2', '3', '5', '8', '13', '21', '?'],
  FIBONACCI_SCALE: ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'],
  T_SHIRT_SCALE: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  LINEAR_SCALE: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?'],
  VOTING_TIMER_SECONDS: 300, // 5 minutes
  REVEAL_DELAY_MS: 1000,
} as const;

// Retrospective Categories
export const RETROSPECTIVE_CATEGORIES = {
  WENT_WELL: 'went-well',
  TO_IMPROVE: 'to-improve',
  ACTION_ITEMS: 'action-items',
} as const;

export const RETROSPECTIVE_CONFIG = {
  CATEGORIES: [
    { 
      id: RETROSPECTIVE_CATEGORIES.WENT_WELL, 
      title: 'What Went Well', 
      color: 'green',
      icon: '👍',
      description: 'Things that went well during this sprint'
    },
    { 
      id: RETROSPECTIVE_CATEGORIES.TO_IMPROVE, 
      title: 'What Can Be Improved', 
      color: 'yellow',
      icon: '🔄',
      description: 'Areas for improvement and optimization'
    },
    { 
      id: RETROSPECTIVE_CATEGORIES.ACTION_ITEMS, 
      title: 'Action Items', 
      color: 'blue',
      icon: '🎯',
      description: 'Specific actions to take moving forward'
    },
  ],
  MAX_ITEM_LENGTH: 500,
  AUTO_SAVE_DELAY_MS: 1000,
} as const;

// UI Constants
export const UI_CONFIG = {
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  MODAL_Z_INDEX: 1000,
  DROPDOWN_Z_INDEX: 999,
  TOOLTIP_DELAY: 500,
} as const;

// Breakpoints (matching Tailwind defaults)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Socket Events
export const SOCKET_EVENTS = {
  // Room Management
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ROOM_JOINED: 'room-joined',
  ROOM_LEFT: 'room-left',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  
  // Planning Poker
  STORY_ADDED: 'story-added',
  STORY_UPDATED: 'story-updated',
  STORY_DELETED: 'story-deleted',
  VOTING_STARTED: 'voting-started',
  VOTING_ENDED: 'voting-ended',
  VOTE_CAST: 'vote-cast',
  VOTES_REVEALED: 'votes-revealed',
  
  // Retrospective
  RETROSPECTIVE_ITEM_ADDED: 'retrospective-item-added',
  RETROSPECTIVE_ITEM_UPDATED: 'retrospective-item-updated',
  RETROSPECTIVE_ITEM_DELETED: 'retrospective-item-deleted',
  
  // System
  ERROR: 'error',
  RECONNECT: 'reconnect',
  DISCONNECT: 'disconnect',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_NAME: 'planning-poker-user-name',
  THEME_PREFERENCE: 'planning-poker-theme',
  RECENT_ROOMS: 'planning-poker-recent-rooms',
  USER_PREFERENCES: 'planning-poker-preferences',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  ROOM_NOT_FOUND: 'Room not found',
  ROOM_FULL: 'Room is full',
  INVALID_ROOM_CODE: 'Invalid room code',
  CONNECTION_FAILED: 'Failed to connect to server',
  VOTING_IN_PROGRESS: 'Voting is already in progress',
  NOT_AUTHORIZED: 'You are not authorized to perform this action',
  INVALID_INPUT: 'Invalid input provided',
  SERVER_ERROR: 'Server error occurred',
  NETWORK_ERROR: 'Network connection error',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ROOM_CREATED: 'Room created successfully',
  ROOM_JOINED: 'Joined room successfully',
  STORY_ADDED: 'Story added successfully',
  VOTE_CAST: 'Vote cast successfully',
  EXPORT_COMPLETED: 'Export completed successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
} as const;

// Theme Configuration
export const THEME_CONFIG = {
  DEFAULT_THEME: 'light',
  THEMES: ['light', 'dark', 'auto'],
  COLOR_SCHEMES: {
    LIGHT: {
      PRIMARY: '#3b82f6',
      SECONDARY: '#64748b',
      SUCCESS: '#10b981',
      WARNING: '#f59e0b',
      ERROR: '#ef4444',
      BACKGROUND: '#ffffff',
      SURFACE: '#f8fafc',
      TEXT_PRIMARY: '#0f172a',
      TEXT_SECONDARY: '#64748b',
    },
    DARK: {
      PRIMARY: '#60a5fa',
      SECONDARY: '#94a3b8',
      SUCCESS: '#34d399',
      WARNING: '#fbbf24',
      ERROR: '#f87171',
      BACKGROUND: '#0f172a',
      SURFACE: '#1e293b',
      TEXT_PRIMARY: '#f8fafc',
      TEXT_SECONDARY: '#cbd5e1',
    },
  },
} as const;

// Export individual configs for convenience
export { RETROSPECTIVE_CATEGORIES as RETRO_CATEGORIES };

// Type definitions for better TypeScript support
export type VotingScale = typeof VOTING_CONFIG.DEFAULT_VOTING_SCALE[number];
export type RetrospectiveCategory = typeof RETROSPECTIVE_CATEGORIES[keyof typeof RETROSPECTIVE_CATEGORIES];
export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
export type ThemeName = typeof THEME_CONFIG.THEMES[number];

// Utility functions for constants
export const getRetrospectiveCategoryConfig = (categoryId: RetrospectiveCategory) => {
  return RETROSPECTIVE_CONFIG.CATEGORIES.find(cat => cat.id === categoryId);
};

export const isValidVotingScale = (scale: string[]): scale is VotingScale[] => {
  return scale.every(value => typeof value === 'string' && value.length > 0);
};

export const getBreakpointValue = (breakpoint: keyof typeof BREAKPOINTS): number => {
  return BREAKPOINTS[breakpoint];
};