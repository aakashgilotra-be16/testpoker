import Room from '../models/Room';
import { socketToUserId } from './dataStore';

/**
 * Check if a user is an admin of a room (host or facilitator)
 */
export const isRoomAdmin = async (userId: string, roomId: string): Promise<boolean> => {
  try {
    const room = await Room.findById(roomId);
    return room ? room.isAdmin(userId) : false;
  } catch (error) {
    console.error('Error checking room admin status:', error);
    return false;
  }
};

/**
 * Verify if user has permission to perform admin actions
 * @param socketId - The socket ID of the user
 * @param roomId - The room ID to check
 */
export const requireRoomAdmin = async (
  socketId: string,
  roomId: string | null
): Promise<{ authorized: boolean; error?: string }> => {
  if (!roomId) {
    return { authorized: false, error: 'You must be in a room' };
  }

  // Get the actual userId from socketId mapping
  const userId = socketToUserId[socketId];
  if (!userId) {
    console.error(`No userId found for socketId: ${socketId}`);
    return { authorized: false, error: 'User not authenticated' };
  }

  const isAdmin = await isRoomAdmin(userId, roomId);
  if (!isAdmin) {
    console.log(`Authorization failed: userId=${userId}, roomId=${roomId}, isAdmin=${isAdmin}`);
    return { authorized: false, error: 'Only room admin can perform this action' };
  }

  return { authorized: true };
};
