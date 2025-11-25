import { Room, RoomParticipant, UserRole, ErrorCodes, AppError } from './types.js';

/**
 * Generate a random 6-character alphanumeric room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate room code format
 */
export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Check if user is host of the room
 */
export function isRoomHost(room: Room, userId: string): boolean {
  return room.hostId === userId;
}

/**
 * Check if user can manage the room (host or facilitator)
 */
export function canManageRoom(room: Room, userId: string): boolean {
  if (isRoomHost(room, userId)) return true;
  
  const participant = room.participants.find(p => p.userId === userId);
  return participant?.role === UserRole.FACILITATOR;
}

/**
 * Check if room is at capacity
 */
export function isRoomFull(room: Room): boolean {
  return room.participants.length >= 30;
}

/**
 * Check if room has expired
 */
export function isRoomExpired(room: Room): boolean {
  return new Date() > room.expiresAt;
}

/**
 * Check if user is already in room
 */
export function isUserInRoom(room: Room, userId: string): boolean {
  return room.participants.some(p => p.userId === userId);
}

/**
 * Get participant from room by userId
 */
export function getRoomParticipant(room: Room, userId: string): RoomParticipant | undefined {
  return room.participants.find(p => p.userId === userId);
}

/**
 * Add participant to room with validation
 */
export function addParticipantToRoom(
  room: Room, 
  participant: Omit<RoomParticipant, 'joinedAt' | 'lastActivity' | 'isOnline'>
): Room {
  // Validate room capacity
  if (isRoomFull(room)) {
    throw new AppError('Room is at maximum capacity', ErrorCodes.ROOM_FULL);
  }

  // Check if already in room
  if (isUserInRoom(room, participant.userId)) {
    throw new AppError('User is already in this room', ErrorCodes.ALREADY_IN_ROOM);
  }

  // Add participant
  const newParticipant: RoomParticipant = {
    ...participant,
    joinedAt: new Date(),
    lastActivity: new Date(),
    isOnline: true
  };

  return {
    ...room,
    participants: [...room.participants, newParticipant],
    lastActivity: new Date()
  };
}

/**
 * Remove participant from room
 */
export function removeParticipantFromRoom(room: Room, userId: string): Room {
  const participantIndex = room.participants.findIndex(p => p.userId === userId);
  
  if (participantIndex === -1) {
    throw new AppError('User is not in this room', ErrorCodes.NOT_IN_ROOM);
  }

  const updatedParticipants = [...room.participants];
  updatedParticipants.splice(participantIndex, 1);

  return {
    ...room,
    participants: updatedParticipants,
    lastActivity: new Date()
  };
}

/**
 * Update participant online status
 */
export function updateParticipantStatus(
  room: Room, 
  userId: string, 
  isOnline: boolean
): Room {
  const participantIndex = room.participants.findIndex(p => p.userId === userId);
  
  if (participantIndex === -1) {
    throw new AppError('User is not in this room', ErrorCodes.NOT_IN_ROOM);
  }

  const updatedParticipants = [...room.participants];
  updatedParticipants[participantIndex] = {
    ...updatedParticipants[participantIndex],
    isOnline,
    lastActivity: new Date()
  };

  return {
    ...room,
    participants: updatedParticipants,
    lastActivity: new Date()
  };
}

/**
 * Calculate vote statistics
 */
export function calculateVoteStatistics(votes: Array<{ voteValue: string }>): {
  totalVotes: number;
  voteDistribution: Record<string, number>;
  consensus: string | null;
  spread: number;
} {
  const voteDistribution: Record<string, number> = {};
  let totalVotes = 0;

  votes.forEach(vote => {
    voteDistribution[vote.voteValue] = (voteDistribution[vote.voteValue] || 0) + 1;
    totalVotes++;
  });

  // Find consensus (most voted value)
  let consensus: string | null = null;
  let maxVotes = 0;
  let hasConsensus = false;

  Object.entries(voteDistribution).forEach(([value, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      consensus = value;
      hasConsensus = count > totalVotes / 2; // More than 50%
    }
  });

  // Calculate spread (number of different votes)
  const spread = Object.keys(voteDistribution).length;

  return {
    totalVotes,
    voteDistribution,
    consensus: hasConsensus ? consensus : null,
    spread
  };
}

/**
 * Format error response
 */
export function formatErrorResponse(error: Error | AppError) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message
      },
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: false,
    error: {
      code: ErrorCodes.DATABASE_ERROR,
      message: 'An unexpected error occurred'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Format success response
 */
export function formatSuccessResponse<T>(data: T) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Sanitize user input
 */
export function sanitizeString(input: string, maxLength?: number): string {
  let sanitized = input.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Retry async operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError!;
}
