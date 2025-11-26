import { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/index.js';
import { connectedUsers, userRooms, getOrCreateRoomData } from '../utils/dataStore.js';
import { requireRoomAdmin } from '../utils/roomUtils.js';
import { StoryService } from '../services/StoryService.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents>;

export const setupStoryHandlers = (socket: SocketType, io: any, currentRoom: { value: string | null }) => {
  
  socket.on('create_story', async (data) => {
    if (!currentRoom.value) {
      socket.emit('error', { message: 'You must be in a room to create stories' });
      return;
    }

    // Check admin permission
    const authCheck = await requireRoomAdmin(socket.id, currentRoom.value);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    const roomData = getOrCreateRoomData(currentRoom.value);
    const roomUser = roomData.connectedUsers[socket.id];
    
    if (!roomUser) {
      socket.emit('error', { message: 'User not found in room' });
      return;
    }

    try {
      const newStory = await StoryService.createStory(
        currentRoom.value,
        {
          title: data.title,
          description: data.description || '',
          priority: 'medium'
        },
        roomUser.displayName
      );

      const legacyStory = {
        id: newStory._id.toString(),
        title: newStory.title,
        description: newStory.description || '',
        final_points: newStory.final_points || null,
        created_at: newStory.createdAt.toISOString(),
        updated_at: newStory.updatedAt.toISOString()
      };

      io.to(currentRoom.value).emit('story_created', legacyStory);
      console.log(`📚 Story created in room ${currentRoom.value}: ${data.title}`);
    } catch (error) {
      console.error('Error creating story:', error);
      socket.emit('error', { message: 'Failed to create story' });
    }
  });

  socket.on('update_story', async (data) => {
    if (!currentRoom.value) {
      socket.emit('error', { message: 'You must be in a room to update stories' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, currentRoom.value);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    const roomData = getOrCreateRoomData(currentRoom.value);
    const roomUser = roomData.connectedUsers[socket.id];
    
    if (!roomUser) {
      socket.emit('error', { message: 'User not found in room' });
      return;
    }

    try {
      const updatedStory = await StoryService.updateStory(
        data.id,
        {
          title: data.title,
          description: data.description
        },
        roomUser.displayName
      );

      if (updatedStory) {
        const legacyStory = {
          id: updatedStory._id.toString(),
          title: updatedStory.title,
          description: updatedStory.description || '',
          final_points: updatedStory.final_points || null,
          created_at: updatedStory.createdAt.toISOString(),
          updated_at: updatedStory.updatedAt.toISOString()
        };

        io.to(currentRoom.value).emit('story_updated', legacyStory);
      }
    } catch (error) {
      console.error('Error updating story:', error);
      socket.emit('error', { message: 'Failed to update story' });
    }
  });

  socket.on('delete_story', async (data) => {
    if (!currentRoom.value) {
      socket.emit('error', { message: 'You must be in a room to delete stories' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, currentRoom.value);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    const roomData = getOrCreateRoomData(currentRoom.value);
    const roomUser = roomData.connectedUsers[socket.id];
    
    if (!roomUser) {
      socket.emit('error', { message: 'User not found in room' });
      return;
    }

    try {
      await StoryService.deleteStory(data.id, roomUser.displayName);
      io.to(currentRoom.value).emit('story_deleted', { id: data.id });
    } catch (error) {
      console.error('Error deleting story:', error);
      socket.emit('error', { message: 'Failed to delete story' });
    }
  });

  socket.on('bulk_create_stories', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must join a room to create stories' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, room);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    try {
      const createdStories = [];
      
      for (const story of data.stories) {
        const newStory = await StoryService.createStory(
          room,
          {
            title: story.title,
            description: story.description || '',
            priority: 'medium'
          },
          user.displayName
        );
        
        createdStories.push({
          id: newStory._id.toString(),
          title: newStory.title,
          description: newStory.description || '',
          final_points: newStory.final_points || null,
          created_at: newStory.createdAt.toISOString(),
          updated_at: newStory.updatedAt.toISOString()
        });
      }

      console.log(`📚 ${createdStories.length} stories bulk created in room ${room}`);
      io.to(room).emit('stories_bulk_created', createdStories);
    } catch (error) {
      console.error('Error bulk creating stories:', error);
      socket.emit('error', { message: 'Failed to bulk create stories' });
    }
  });

  socket.on('save_story_points', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must be in a room to save story points' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, room);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    try {
      const updatedStory = await StoryService.setStoryEstimate(
        data.storyId,
        data.points,
        5,
        user.displayName
      );

      if (updatedStory) {
        const legacyStory = {
          id: updatedStory._id.toString(),
          title: updatedStory.title,
          description: updatedStory.description || '',
          final_points: updatedStory.final_points || null,
          created_at: updatedStory.createdAt.toISOString(),
          updated_at: updatedStory.updatedAt.toISOString()
        };

        io.to(room).emit('story_points_saved', {
          storyId: data.storyId,
          points: data.points,
          story: legacyStory
        });
      }
    } catch (error) {
      console.error('Error saving story points:', error);
      socket.emit('error', { message: 'Failed to save story points' });
    }
  });
};
