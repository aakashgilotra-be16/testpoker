import Room from '../models/Room';
import { IRoom } from '../models/Room';

export class RoomService {
  
  /**
   * Generate a unique 6-character room code
   */
  static generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new room
   */
  static async createRoom(hostId: string, roomData: {
    name: string;
    description?: string;
    settings?: Partial<IRoom['settings']>;
  }): Promise<IRoom> {
    let roomCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique room code
    do {
      roomCode = this.generateRoomCode();
      attempts++;
      
      const existingRoom = await Room.findById(roomCode);
      if (!existingRoom) break;
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique room code');
      }
    } while (attempts < maxAttempts);

    const room = new Room({
      _id: roomCode,
      name: roomData.name,
      description: roomData.description || '',
      hostId: hostId,
      participants: [{
        userId: hostId,
        name: 'Host', // Will be updated when user joins
        displayName: 'Host',
        role: 'host',
        joinedAt: new Date(),
        lastActivity: new Date(),
        isOnline: true
      }],
      settings: {
        deckType: 'fibonacci',
        customDeck: [],
        allowSpectators: true,
        autoRevealVotes: false,
        timerDuration: 300,
        allowChangeVote: true,
        showVoteCount: false,
        ...roomData.settings
      },
      stats: {
        totalSessions: 0,
        totalVotes: 0,
        averageVotingTime: 0,
        completedStories: 0
      },
      status: 'active',
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    return await room.save();
  }

  /**
   * Get room by ID
   */
  static async getRoomById(roomId: string): Promise<IRoom | null> {
    return await Room.findById(roomId.toUpperCase());
  }

  /**
   * Join a room
   */
  static async joinRoom(roomId: string, userData: {
    userId: string;
    name: string;
    displayName: string;
    role?: 'participant' | 'facilitator';
  }): Promise<IRoom | null> {
    const room = await Room.findById(roomId.toUpperCase());
    if (!room) return null;

    room.addParticipant({
      ...userData,
      role: userData.role || 'participant'
    });

    return await room.save();
  }

  /**
   * Leave a room
   */
  static async leaveRoom(roomId: string, userId: string): Promise<IRoom | null> {
    const room = await Room.findById(roomId.toUpperCase());
    if (!room) return null;

    // Mark user as offline instead of removing (for rejoining)
    const participant = room.participants.find(p => p.userId === userId);
    if (participant) {
      participant.isOnline = false;
      participant.lastActivity = new Date();
    }

    room.updateActivity();
    return await room.save();
  }

  /**
   * Update room settings
   */
  static async updateRoomSettings(
    roomId: string, 
    hostId: string, 
    settings: Partial<IRoom['settings']>
  ): Promise<IRoom | null> {
    const room = await Room.findById(roomId.toUpperCase());
    if (!room || !room.canUserManage(hostId)) return null;

    room.settings = { ...room.settings, ...settings };
    room.updateActivity();
    
    return await room.save();
  }

  /**
   * Get active rooms for a user
   */
  static async getUserRooms(userId: string): Promise<IRoom[]> {
    return await Room.find({
      'participants.userId': userId,
      status: 'active'
    }).sort({ lastActivity: -1 });
  }

  /**
   * Archive a room
   */
  static async archiveRoom(roomId: string, hostId: string): Promise<IRoom | null> {
    const room = await Room.findById(roomId.toUpperCase());
    if (!room || !room.isHost(hostId)) return null;

    room.status = 'archived';
    room.updateActivity();
    
    return await room.save();
  }

  /**
   * Validate room code format
   */
  static isValidRoomCode(roomCode: string): boolean {
    return /^[A-Z0-9]{6}$/.test(roomCode.toUpperCase());
  }

  /**
   * Clean up inactive rooms (for scheduled tasks)
   */
  static async cleanupInactiveRooms(): Promise<number> {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const result = await Room.updateMany(
      {
        lastActivity: { $lt: cutoffDate },
        status: 'active'
      },
      {
        status: 'archived'
      }
    );

    return result.modifiedCount;
  }
}
