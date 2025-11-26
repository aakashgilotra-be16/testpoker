import { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, VotingSession as VotingSessionType } from '../types/index.js';
import { connectedUsers, userRooms, votingSessions, votes, getOrCreateRoomData, temporaryVotes } from '../utils/dataStore.js';
import { requireRoomAdmin } from '../utils/roomUtils.js';
import { VotingService } from '../services/VotingService.js';
import Story from '../models/Story.js';
import VotingSession from '../models/VotingSession.js';
import Vote from '../models/Vote.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents>;

export const setupVotingHandlers = (socket: SocketType, io: any) => {
  
  socket.on('start_voting_session', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room to start voting' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, currentRoom);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    try {
      const story = await Story.findById(data.storyId);
      if (!story) {
        socket.emit('error', { 
          message: 'Story not found in database. Please refresh and try again.' 
        });
        console.error(`Story ${data.storyId} not found for voting session in room ${currentRoom}`);
        return;
      }

      const deckType = data.deckType || 'powersOfTwo';

      const session = await VotingService.createVotingSession(
        currentRoom,
        {
          storyId: data.storyId,
          deckType: deckType,
          timerMinutes: data.timerDuration ? Math.floor(data.timerDuration / 60) : undefined,
          allowDiscussion: true,
          anonymousVoting: false,
          facilitatorId: socket.id
        },
        user.displayName
      );

      const legacyDeckType = (() => {
        switch (session.deckType) {
          case 'fibonacci': return 'fibonacci';
          case 'powersOfTwo': return 'powersOfTwo';
          case 'tShirt': return 'tShirt';
          default: return 'custom';
        }
      })();

      const legacySession: VotingSessionType = {
        id: session._id.toString(),
        storyId: session.storyId.toString(),
        deckType: legacyDeckType,
        isActive: session.isActive,
        votesRevealed: session.votesRevealed,
        timerDuration: session.timerDuration,
        timerStartedAt: null,
        createdBy: session.createdBy,
        createdAt: session.createdAt.toISOString()
      };

      console.log(`🗳️ Voting session started in room ${currentRoom} for story ${data.storyId}`);
      io.to(currentRoom).emit('voting_session_started', legacySession);
    } catch (error) {
      console.error('Error starting voting session:', error);
      socket.emit('error', { message: 'Failed to start voting session' });
    }
  });

  socket.on('submit_vote', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    
    console.log(`📥 Vote submission received:`, {
      user: user.displayName,
      userId: socket.id,
      room: currentRoom,
      storyId: data.storyId,
      voteValue: data.value
    });
    
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room to vote' });
      return;
    }

    try {
      const activeSession = await VotingService.getActiveSessionForStory(data.storyId);
      if (!activeSession) {
        console.error('❌ No active session found for story:', data.storyId);
        socket.emit('error', { message: 'No active voting session found' });
        return;
      }
      
      console.log(`✅ Found active session:`, {
        sessionId: activeSession._id.toString(),
        storyId: activeSession.storyId,
        isActive: activeSession.isActive,
        currentRound: activeSession.currentRound
      });

      // Store vote in memory (not DB)
      const result = await VotingService.castVote(
        activeSession._id.toString(),
        socket.id,
        user.displayName,
        {
          value: data.value,
          confidence: 3
        }
      );

      console.log(`📊 Vote progress: ${result.voteCount}/${result.totalParticipants}`);

      // Broadcast vote submitted (without revealing actual values)
      io.to(currentRoom).emit('vote_submitted', {
        storyId: data.storyId,
        userId: socket.id,
        displayName: user.displayName,
        voteCount: result.voteCount,
        totalVoters: result.totalParticipants
      });

      // Auto-reveal if all votes are in
      if (result.allVotesIn) {
        console.log(`🎉 All votes in! Auto-revealing...`);
        
        // Import temporaryVotes to get the actual vote data
        const { temporaryVotes } = await import('../utils/dataStore');
        const sessionVotes = temporaryVotes[activeSession._id.toString()] || {};
        
        const votes = Object.entries(sessionVotes).map(([userId, vote]) => ({
          userId,
          displayName: vote.displayName,
          voteValue: vote.value,
          confidence: vote.confidence
        }));

        // Mark session as votes revealed
        await VotingService.revealVotes(activeSession._id.toString(), socket.id);

        io.to(currentRoom).emit('votes_revealed', {
          storyId: data.storyId,
          sessionId: activeSession._id.toString(),
          votes,
          revealed: true
        });

        console.log(`✅ Votes auto-revealed with ${votes.length} votes`);
      }

      console.log(`✅ Vote submitted successfully for ${user.displayName}`);
    } catch (error) {
      console.error('Error submitting vote:', error);
      socket.emit('error', { message: 'Failed to submit vote' });
    }
  });

  socket.on('reveal_votes', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room to reveal votes' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, currentRoom);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }
    
    try {
      const activeSession = await VotingService.getActiveSessionForStory(data.storyId);
      if (!activeSession) {
        console.error('❌ No active session found for story:', data.storyId);
        socket.emit('error', { message: 'No active voting session found' });
        return;
      }

      // Handle toggle: if data.revealed is false, hide votes
      if (data.revealed === false) {
        console.log(`🙈 Hiding votes for story ${data.storyId} in room ${currentRoom}`);
        
        // Update session to mark votes as hidden
        await VotingSession.findByIdAndUpdate(activeSession._id, {
          votesRevealed: false
        });
        
        io.to(currentRoom).emit('votes_revealed', {
          storyId: data.storyId,
          revealed: false,
          votes: []
        });
        
        console.log(`📢 Emitted votes_hidden to room ${currentRoom}`);
        return;
      }

      console.log(`🔓 Revealing votes for story ${data.storyId} in room ${currentRoom}`);
      console.log(`✅ Found session ${activeSession._id.toString()}, revealing votes...`);

      // Mark session as revealed
      await VotingService.revealVotes(
        activeSession._id.toString(),
        user.displayName
      );

      // Get votes from temporary memory
      const sessionId = activeSession._id.toString();
      const tempVotes = temporaryVotes[sessionId] || {};
      const voteEntries = Object.entries(tempVotes);

      console.log(`✅ Revealing ${voteEntries.length} votes from memory`);
      
      // Format votes for frontend
      const formattedVotes = voteEntries.map(([userId, vote]) => ({
        userId,
        displayName: vote.displayName,
        voteValue: vote.value,
        confidence: vote.confidence
      }));
      
      console.log(`📤 Sending to frontend:`, formattedVotes);

      io.to(currentRoom).emit('votes_revealed', {
        storyId: data.storyId,
        sessionId: activeSession._id.toString(),
        revealed: true,
        votes: formattedVotes
      });
      
      console.log(`📢 Emitted votes_revealed to room ${currentRoom} with ${formattedVotes.length} votes`);
    } catch (error) {
      console.error('❌ Error revealing votes:', error);
      console.error('   Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to reveal votes' 
      });
    }
  });

  socket.on('end_voting_session', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, currentRoom);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    try {
      const activeSession = await VotingService.getActiveSessionForStory(data.storyId);
      if (!activeSession) {
        socket.emit('error', { message: 'No active voting session found' });
        return;
      }

      await VotingService.endVotingSession(activeSession._id.toString(), user.displayName);
      io.to(currentRoom).emit('voting_session_ended', { storyId: data.storyId });
    } catch (error) {
      console.error('Error ending voting session:', error);
      socket.emit('error', { message: 'Failed to end voting session' });
    }
  });

  socket.on('start_timer', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, room);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.timerStartedAt = new Date().toISOString();
      session.timerDuration = data.duration || session.timerDuration;
      io.emit('timer_started', {
        storyId: data.storyId,
        startedAt: session.timerStartedAt,
        duration: session.timerDuration
      });
    }
  });

  socket.on('stop_timer', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, room);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.timerStartedAt = null;
      io.emit('timer_stopped', { storyId: data.storyId });
    }
  });

  socket.on('reset_voting', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, room);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    try {
      // Reset database session
      const activeSession = await VotingService.getActiveSessionForStory(data.storyId);
      if (activeSession) {
        await VotingSession.findByIdAndUpdate(activeSession._id, {
          votesRevealed: false,
          currentRound: (activeSession.currentRound || 1) + 1,
          lastActivity: new Date()
        });
        
        console.log(`🔄 Reset voting for story ${data.storyId}, moved to round ${(activeSession.currentRound || 1) + 1}`);
      }
      
      // Also reset in-memory session (for backward compatibility)
      const session = votingSessions[data.storyId];
      if (session) {
        session.votesRevealed = false;
        session.timerStartedAt = null;

        Object.keys(votes).forEach(key => {
          if (key.startsWith(`${data.storyId}_`)) {
            delete votes[key];
          }
        });
      }

      io.to(room).emit('voting_reset', { storyId: data.storyId });
      console.log(`✅ Voting reset for story ${data.storyId}`);
    } catch (error) {
      console.error('Error resetting voting:', error);
      socket.emit('error', { message: 'Failed to reset voting' });
    }
  });

  socket.on('change_deck_type', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const room = userRooms[socket.id];
    if (!room) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, room);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    const session = votingSessions[data.storyId];
    if (session) {
      session.deckType = data.deckType;
      io.emit('deck_type_changed', {
        storyId: data.storyId,
        deckType: data.deckType
      });
    }
  });

  socket.on('save_final_estimate', async (data) => {
    const user = connectedUsers[socket.id];
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const currentRoom = userRooms[socket.id];
    if (!currentRoom) {
      socket.emit('error', { message: 'You must be in a room' });
      return;
    }

    const authCheck = await requireRoomAdmin(socket.id, currentRoom);
    if (!authCheck.authorized) {
      socket.emit('error', { message: authCheck.error || 'Unauthorized' });
      return;
    }

    try {
      const { storyId, sessionId, finalEstimate } = data;
      
      console.log(`💾 Saving final estimate for story ${storyId}:`, finalEstimate);

      // Get temporary votes from memory
      const sessionVotes = temporaryVotes[sessionId] || {};
      const voteEntries = Object.entries(sessionVotes);

      if (voteEntries.length === 0) {
        socket.emit('error', { message: 'No votes to save' });
        return;
      }

      // Get the voting session
      const session = await VotingSession.findById(sessionId);
      if (!session) {
        socket.emit('error', { message: 'Voting session not found' });
        return;
      }

      // Save all votes to database
      const savedVotes = [];
      for (const [userId, vote] of voteEntries) {
        const voteId = `${sessionId}_${userId}_round${session.currentRound}`;
        
        const savedVote = await Vote.findOneAndUpdate(
          { sessionId, userId, roundNumber: session.currentRound },
          {
            $set: {
              _id: voteId,
              sessionId: sessionId,
              storyId: session.storyId,
              roomId: session.roomId,
              userId,
              displayName: vote.displayName,
              voteValue: vote.value,
              confidence: vote.confidence,
              reasoning: vote.reasoning,
              roundNumber: session.currentRound,
              submittedAt: vote.submittedAt,
              isRevealedVote: true
            }
          },
          { upsert: true, new: true, runValidators: true }
        );
        
        savedVotes.push(savedVote);
      }

      // End the voting session first
      await VotingService.endVotingSession(sessionId, finalEstimate);

      // Update story with final estimate and reset status
      await Story.findByIdAndUpdate(storyId, {
        final_points: finalEstimate,
        status: 'completed',
        lastVotedAt: new Date()
      });

      // Clear temporary votes from memory
      delete temporaryVotes[sessionId];

      console.log(`✅ Saved ${savedVotes.length} votes and final estimate: ${finalEstimate}`);

      io.to(currentRoom).emit('final_estimate_saved', {
        storyId,
        sessionId,
        finalEstimate,
        voteCount: savedVotes.length
      });
    } catch (error) {
      console.error('Error saving final estimate:', error);
      socket.emit('error', { message: 'Failed to save final estimate' });
    }
  });
};
