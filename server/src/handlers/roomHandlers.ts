import { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketUser } from '../types/index';
import { connectedUsers, userRooms, roomConnectedUsers, getOrCreateRoomData, socketToUserId } from '../utils/dataStore';
import { StoryService } from '../services/StoryService';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents>;

export const setupRoomHandlers = (socket: SocketType, io: any, currentRoom: { value: string | null }) => {
  
  socket.on('create_room', async (data) => {
    try {
      const { name, description, settings, hostName, hostDisplayName } = data;
      const hostId = socket.id;
      const { RoomService } = await import('../services/RoomService');
      
      const room = await RoomService.createRoom(hostId, { name, description, settings });
      
      // Store socket to userId mapping for authorization
      socketToUserId[socket.id] = hostId;
      
      // Join the room immediately
      currentRoom.value = room._id;
      socket.join(room._id);
      
      socket.emit('room_created', {
        room: {
          id: room._id,
          name: room.name,
          description: room.description,
          hostId: room.hostId,
          participants: room.participants.map(p => ({
            ...p,
            joinedAt: p.joinedAt.toISOString(),
            lastActivity: p.lastActivity.toISOString()
          })),
          settings: room.settings,
          status: room.status,
          lastActivity: room.lastActivity.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString()
        },
        isHost: true
      });
      
      console.log(`Room created: ${room._id} by ${hostId}`);
    } catch (error) {
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to create room' 
      });
    }
  });

  socket.on('join_room', async (data) => {
    try {
      const { roomId, userId, name, displayName } = data;
      const role = 'participant';
      const { RoomService } = await import('../services/RoomService');
      
      if (!RoomService.isValidRoomCode(roomId)) {
        socket.emit('error', { message: 'Invalid room code format' });
        return;
      }
      
      const room = await RoomService.joinRoom(roomId, { userId, name, displayName, role });
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Leave previous room if any
      if (currentRoom.value && currentRoom.value !== roomId) {
        socket.leave(currentRoom.value);
        socket.to(currentRoom.value).emit('users_updated', Object.values(roomConnectedUsers[currentRoom.value] || {}));
      }
      
      // Join new room
      currentRoom.value = roomId.toUpperCase();
      socket.join(currentRoom.value);
      
      // Track user's room
      userRooms[socket.id] = currentRoom.value;
      
      // Store socket to userId mapping for authorization
      socketToUserId[socket.id] = userId;
      console.log(`👤 Socket ${socket.id} mapped to userId: ${userId}`);
      
      // Update user in connected users and room data
      const isAdmin = room.isAdmin(userId);
      console.log(`🔐 User ${userId} admin status in room ${currentRoom.value}: ${isAdmin}`);
      console.log(`   Room hostId: ${room.hostId}, Participant role: ${room.participants.find((p: any) => p.userId === userId)?.role}`);
      
      const user: SocketUser = {
        id: socket.id,
        socketId: socket.id,
        displayName,
        isStoryCreator: isAdmin,
        joinedAt: new Date().toISOString()
      };
      connectedUsers[socket.id] = user;
      
      // Get or create room-specific data
      const roomData = getOrCreateRoomData(currentRoom.value);
      roomData.connectedUsers[socket.id] = user;
      
      // Send room data to the joining user
      socket.emit('room_joined', {
        room: {
          id: room._id,
          name: room.name,
          description: room.description,
          hostId: room.hostId,
          participants: room.participants.map(p => ({
            ...p,
            joinedAt: p.joinedAt.toISOString(),
            lastActivity: p.lastActivity.toISOString()
          })),
          settings: room.settings,
          status: room.status,
          lastActivity: room.lastActivity.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString()
        },
        participant: {
          userId,
          name,
          displayName,
          role,
          joinedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          isOnline: true
        },
        isHost: room.hostId === userId
      });
      
      // Send room-specific stories
      try {
        const storiesResult = await StoryService.getStoriesByRoom(roomId, {}, 1, 50);
        const legacyStories = storiesResult.stories.map(story => ({
          id: story._id.toString(),
          title: story.title,
          description: story.description || '',
          final_points: story.final_points || null,
          created_at: story.createdAt.toISOString(),
          updated_at: story.updatedAt.toISOString()
        }));

        socket.emit('user_joined', {
          user,
          stories: legacyStories,
          votingSessions: roomData.votingSessions,
          votes: roomData.votes
        });
      } catch (error) {
        console.error('Error loading room stories:', error);
        socket.emit('user_joined', {
          user,
          stories: [],
          votingSessions: roomData.votingSessions,
          votes: roomData.votes
        });
      }
      
      // Send current room users
      const roomUsers = Object.values(roomData.connectedUsers).filter(u => 
        currentRoom.value && io.sockets.adapter.rooms.get(currentRoom.value)?.has(u.socketId)
      );
      socket.emit('users_updated', roomUsers);
      io.to(currentRoom.value).emit('users_updated', roomUsers);
      
      console.log(`${displayName} joined room: ${currentRoom.value}`);
    } catch (error) {
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to join room' 
      });
    }
  });

  socket.on('leave_room', async () => {
    if (!currentRoom.value) return;
    
    try {
      const user = connectedUsers[socket.id];
      if (user) {
        const { RoomService } = await import('../services/RoomService');
        await RoomService.leaveRoom(currentRoom.value, socket.id);
        
        socket.leave(currentRoom.value);
        socket.to(currentRoom.value).emit('users_updated', Object.values(roomConnectedUsers[currentRoom.value] || {}));
        
        console.log(`${user.displayName} left room: ${currentRoom.value}`);
      }
      
      const leftRoomId = currentRoom.value;
      currentRoom.value = null;
      socket.emit('room_left', { roomId: leftRoomId, userId: socket.id });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  socket.on('join', (data) => {
    // Users must join a room now
    socket.emit('error', { message: 'Please join or create a room to start' });
  });

  socket.on('promote_to_admin', async (data) => {
    try {
      const { roomId, targetUserId } = data;
      const requesterId = socket.id;

      const { RoomService } = await import('../services/RoomService');
      const room = await RoomService.promoteToAdmin(roomId, requesterId, targetUserId);

      if (room) {
        // Get updated participant info
        const promotedParticipant = room.participants.find((p: any) => p.userId === targetUserId);
        
        // Notify all room members
        io.to(roomId.toUpperCase()).emit('user_promoted_to_admin', {
          userId: targetUserId,
          displayName: promotedParticipant?.displayName || 'User',
          role: promotedParticipant?.role
        });

        // Send updated room data to all participants
        const admins = await RoomService.getRoomAdmins(roomId);
        io.to(roomId.toUpperCase()).emit('room_admins_updated', { admins });

        console.log(`✅ User ${targetUserId} promoted to admin in room ${roomId}`);
      }
    } catch (error) {
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to promote user' 
      });
    }
  });

  socket.on('demote_from_admin', async (data) => {
    try {
      const { roomId, targetUserId } = data;
      const requesterId = socket.id;

      const { RoomService } = await import('../services/RoomService');
      const room = await RoomService.demoteFromAdmin(roomId, requesterId, targetUserId);

      if (room) {
        // Get updated participant info
        const demotedParticipant = room.participants.find((p: any) => p.userId === targetUserId);
        
        // Notify all room members
        io.to(roomId.toUpperCase()).emit('user_demoted_from_admin', {
          userId: targetUserId,
          displayName: demotedParticipant?.displayName || 'User',
          role: demotedParticipant?.role
        });

        // Send updated room data to all participants
        const admins = await RoomService.getRoomAdmins(roomId);
        io.to(roomId.toUpperCase()).emit('room_admins_updated', { admins });

        console.log(`✅ User ${targetUserId} demoted from admin in room ${roomId}`);
      }
    } catch (error) {
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to demote user' 
      });
    }
  });

  socket.on('get_room_admins', async (data) => {
    try {
      const { roomId } = data;
      const { RoomService } = await import('../services/RoomService');
      const admins = await RoomService.getRoomAdmins(roomId);
      
      socket.emit('room_admins_list', { roomId, admins });
    } catch (error) {
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to get admins list' 
      });
    }
  });
};
