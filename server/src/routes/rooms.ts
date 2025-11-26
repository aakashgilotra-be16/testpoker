import express, { Request, Response } from 'express';
import { RoomService } from '../services/RoomService.js';

const router = express.Router();

/**
 * POST /api/rooms
 * Create a new room
 */
router.post('/rooms', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hostId, name, description, settings } = req.body;

    if (!hostId || !name) {
      res.status(400).json({
        success: false,
        error: 'hostId and name are required'
      });
      return;
    }

    const room = await RoomService.createRoom(hostId, {
      name,
      description,
      settings
    });

    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        participants: room.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          displayName: p.displayName,
          role: p.role,
          joinedAt: p.joinedAt.toISOString(),
          lastActivity: p.lastActivity.toISOString(),
          isOnline: p.isOnline
        })),
        settings: room.settings,
        status: room.status,
        lastActivity: room.lastActivity.toISOString(),
        expiresAt: room.expiresAt.toISOString(),
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create room'
    });
  }
});

/**
 * GET /api/rooms/:roomId
 * Get room details
 */
router.get('/rooms/:roomId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    if (!RoomService.isValidRoomCode(roomId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid room code format'
      });
      return;
    }

    const room = await RoomService.getRoomById(roomId.toUpperCase());

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        participants: room.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          displayName: p.displayName,
          role: p.role,
          joinedAt: p.joinedAt.toISOString(),
          lastActivity: p.lastActivity.toISOString(),
          isOnline: p.isOnline
        })),
        settings: room.settings,
        status: room.status,
        lastActivity: room.lastActivity.toISOString(),
        expiresAt: room.expiresAt.toISOString(),
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get room'
    });
  }
});

/**
 * POST /api/rooms/:roomId/join
 * Join a room (pre-validation before socket connection)
 */
router.post('/rooms/:roomId/join', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { userId, name, displayName } = req.body;

    if (!RoomService.isValidRoomCode(roomId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid room code format'
      });
      return;
    }

    if (!userId || !name || !displayName) {
      res.status(400).json({
        success: false,
        error: 'userId, name, and displayName are required'
      });
      return;
    }

    const room = await RoomService.getRoomById(roomId.toUpperCase());

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    if (room.status !== 'active') {
      res.status(400).json({
        success: false,
        error: 'Room is not active'
      });
      return;
    }

    // Return success - actual join will happen via socket
    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        isHost: room.hostId === userId
      }
    });
  } catch (error) {
    console.error('Error validating room join:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate room'
    });
  }
});

/**
 * GET /api/rooms/user/:userId
 * Get all rooms for a user
 */
router.get('/rooms/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const rooms = await RoomService.getUserRooms(userId);

    res.json({
      success: true,
      rooms: rooms.map(room => ({
        id: room._id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        isHost: room.hostId === userId,
        participantCount: room.participants.length,
        status: room.status,
        lastActivity: room.lastActivity.toISOString(),
        createdAt: room.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error getting user rooms:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user rooms'
    });
  }
});

export default router;
