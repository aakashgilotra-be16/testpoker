/**
 * Application Configuration
 * Environment-specific settings and feature flags
 */

// Environment Detection
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';
const isTesting = import.meta.env.MODE === 'test';

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3'),
  RETRY_DELAY: parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000'),
} as const;

// Database Configuration
export const DATABASE_CONFIG = {
  MONGODB_URI: import.meta.env.VITE_MONGODB_URI || 'mongodb://localhost:27017/planning-poker',
  COLLECTION_NAMES: {
    ROOMS: 'rooms',
    STORIES: 'stories',
    VOTING_SESSIONS: 'voting_sessions',
    RETROSPECTIVES: 'retrospectives',
    USERS: 'users',
  },
  CONNECTION_OPTIONS: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  // Core Features
  ENABLE_RETROSPECTIVES: import.meta.env.VITE_ENABLE_RETROSPECTIVES !== 'false',
  ENABLE_PLANNING_POKER: import.meta.env.VITE_ENABLE_PLANNING_POKER !== 'false',
  ENABLE_REAL_TIME_SYNC: import.meta.env.VITE_ENABLE_REAL_TIME_SYNC !== 'false',
  
  // Advanced Features
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_USER_AVATARS: import.meta.env.VITE_ENABLE_USER_AVATARS === 'true',
  ENABLE_EXPORT_PDF: import.meta.env.VITE_ENABLE_EXPORT_PDF === 'true',
  ENABLE_DARK_MODE: import.meta.env.VITE_ENABLE_DARK_MODE !== 'false',
  ENABLE_NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  
  // Experimental Features
  ENABLE_AI_SUGGESTIONS: import.meta.env.VITE_ENABLE_AI_SUGGESTIONS === 'true',
  ENABLE_VOICE_CHAT: import.meta.env.VITE_ENABLE_VOICE_CHAT === 'true',
  ENABLE_SCREEN_SHARING: import.meta.env.VITE_ENABLE_SCREEN_SHARING === 'true',
  ENABLE_CUSTOM_THEMES: import.meta.env.VITE_ENABLE_CUSTOM_THEMES === 'true',
  
  // Admin Features
  ENABLE_ADMIN_PANEL: import.meta.env.VITE_ENABLE_ADMIN_PANEL === 'true',
  ENABLE_USAGE_METRICS: import.meta.env.VITE_ENABLE_USAGE_METRICS === 'true',
  ENABLE_ERROR_REPORTING: import.meta.env.VITE_ENABLE_ERROR_REPORTING !== 'false',
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  // Rendering
  VIRTUAL_SCROLLING_THRESHOLD: 50,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  
  // Caching
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100,
  
  // Real-time Updates
  SOCKET_RECONNECT_ATTEMPTS: 5,
  SOCKET_RECONNECT_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000,
  
  // Asset Loading
  LAZY_LOAD_IMAGES: true,
  PRELOAD_CRITICAL_ASSETS: true,
  
  // Memory Management
  AUTO_CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
  MAX_UNDO_HISTORY: 50,
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  // Input Validation
  MAX_INPUT_LENGTH: 5000,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Rate Limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_ROOM_JOINS_PER_HOUR: 10,
  MAX_STORIES_PER_HOUR: 100,
  
  // Content Security
  ENABLE_XSS_PROTECTION: true,
  SANITIZE_HTML: true,
  VALIDATE_ROOM_CODES: true,
  
  // Authentication
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  REQUIRE_USER_VERIFICATION: false,
  ENABLE_GUEST_ACCESS: true,
} as const;

// UI Configuration
export const UI_CONFIG = {
  // Layout
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,
  FOOTER_HEIGHT: 48,
  
  // Animations
  ANIMATION_DURATION: 200,
  TRANSITION_EASING: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  REDUCE_MOTION: false,
  
  // Responsive Breakpoints
  BREAKPOINTS: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
  },
  
  // Colors and Themes
  DEFAULT_THEME: 'light',
  AUTO_THEME_DETECTION: true,
  CUSTOM_BRAND_COLORS: false,
  
  // Accessibility
  FOCUS_VISIBLE: true,
  HIGH_CONTRAST_MODE: false,
  KEYBOARD_NAVIGATION: true,
  SCREEN_READER_SUPPORT: true,
} as const;

// Logging Configuration
export const LOGGING_CONFIG = {
  LEVEL: isDevelopment ? 'debug' : 'info',
  ENABLE_CONSOLE_LOGS: isDevelopment,
  ENABLE_REMOTE_LOGGING: isProduction,
  
  // Log Targets
  CONSOLE: {
    enabled: isDevelopment,
    colorize: true,
    timestamp: true,
  },
  
  FILE: {
    enabled: false,
    maxSize: '10mb',
    maxFiles: 5,
  },
  
  REMOTE: {
    enabled: isProduction,
    endpoint: import.meta.env.VITE_LOG_ENDPOINT,
    apiKey: import.meta.env.VITE_LOG_API_KEY,
    batchSize: 100,
    flushInterval: 10000,
  },
  
  // What to Log
  LOG_EVENTS: {
    user_actions: true,
    api_calls: isDevelopment,
    errors: true,
    performance: isDevelopment,
    websocket: isDevelopment,
  },
} as const;

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  ENABLED: FEATURE_FLAGS.ENABLE_ANALYTICS && isProduction,
  
  GOOGLE_ANALYTICS: {
    enabled: import.meta.env.VITE_GA_ENABLED === 'true',
    trackingId: import.meta.env.VITE_GA_TRACKING_ID,
  },
  
  CUSTOM_ANALYTICS: {
    enabled: true,
    endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT,
    batchSize: 50,
    flushInterval: 30000,
  },
  
  // Privacy Settings
  RESPECT_DNT: true, // Do Not Track
  ANONYMIZE_IPS: true,
  COOKIE_CONSENT: true,
  
  // Events to Track
  TRACK_EVENTS: {
    page_views: true,
    user_interactions: true,
    performance_metrics: false,
    errors: true,
    feature_usage: true,
  },
} as const;

// Development Configuration
export const DEV_CONFIG = {
  // Debug Tools
  ENABLE_REACT_DEVTOOLS: isDevelopment,
  ENABLE_REDUX_DEVTOOLS: isDevelopment,
  ENABLE_PERFORMANCE_MONITOR: isDevelopment,
  
  // Hot Reloading
  HOT_RELOAD: isDevelopment,
  LIVE_RELOAD: isDevelopment,
  
  // Mock Data
  USE_MOCK_API: import.meta.env.VITE_USE_MOCK_API === 'true',
  MOCK_DELAY: 500,
  
  // Testing
  ENABLE_TEST_IDS: isDevelopment || isTesting,
  MOCK_WEBSOCKETS: isTesting,
} as const;

// Export Environment Utilities
export const ENV = {
  isDevelopment,
  isProduction,
  isTesting,
  mode: import.meta.env.MODE,
  version: import.meta.env.PACKAGE_VERSION || '1.0.0',
} as const;

// Configuration Validator
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check required environment variables
  if (!API_CONFIG.BASE_URL) {
    errors.push('API_CONFIG.BASE_URL is required');
  }
  
  if (FEATURE_FLAGS.ENABLE_ANALYTICS && !ANALYTICS_CONFIG.GOOGLE_ANALYTICS.trackingId) {
    errors.push('Google Analytics tracking ID is required when analytics is enabled');
  }
  
  if (LOGGING_CONFIG.REMOTE.enabled && !LOGGING_CONFIG.REMOTE.endpoint) {
    errors.push('Remote logging endpoint is required when remote logging is enabled');
  }
  
  // Validate numeric configurations
  if (API_CONFIG.TIMEOUT < 1000) {
    errors.push('API timeout should be at least 1000ms');
  }
  
  if (PERFORMANCE_CONFIG.CACHE_TTL < 60000) {
    errors.push('Cache TTL should be at least 60 seconds');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Configuration Summary for Debug
export const getConfigSummary = () => {
  return {
    environment: ENV.mode,
    features: Object.entries(FEATURE_FLAGS).filter(([, enabled]) => enabled).map(([key]) => key),
    api: {
      baseUrl: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
    },
    performance: {
      caching: PERFORMANCE_CONFIG.CACHE_TTL,
      virtualScrolling: PERFORMANCE_CONFIG.VIRTUAL_SCROLLING_THRESHOLD,
    },
    validation: validateConfig(),
  };
};

// Export all configurations
export {
  isDevelopment,
  isProduction,
  isTesting,
};