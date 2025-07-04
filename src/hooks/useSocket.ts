import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface User {
  id: string;
  displayName: string;
  isStoryCreator: boolean;
  joinedAt: string;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  final_points: string | null;
  created_at: string;
  updated_at: string;
}

export interface VotingSession {
  id: string;
  storyId: string;
  deckType: string;
  isActive: boolean;
  votesRevealed: boolean;
  timerDuration: number;
  timerStartedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Vote {
  id: string;
  storyId: string;
  userId: string;
  displayName: string;
  voteValue: string;
  submittedAt: string;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [votingSessions, setVotingSessions] = useState<Record<string, VotingSession>>({});
  const [votes, setVotes] = useState<Record<string, Vote[]>>({});
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');

  useEffect(() => {
    // Use environment variable for backend URL, fallback to localhost for development
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    
    console.log('🔌 Connecting to backend:', BACKEND_URL);
    setConnectionStatus('Connecting...');
    
    // Initialize socket connection with enhanced configuration for Render
    socketRef.current = io(BACKEND_URL, {
      // Start with polling for better compatibility, allow upgrade to websocket
      transports: ['polling', 'websocket'],
      timeout: 60000, // Increased timeout to 60 seconds
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000, // Start with 1 second delay
      reconnectionDelayMax: 10000, // Max 10 seconds
      reconnectionAttempts: 20, // More attempts for better reliability
      // Enhanced options for Render compatibility
      upgrade: true,
      rememberUpgrade: false,
      autoConnect: true,
      // Additional options
      withCredentials: false,
      extraHeaders: {
        'Access-Control-Allow-Origin': '*'
      }
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      setError(null);
      setReconnectAttempts(0);
      setConnectionStatus('Connected');
      
      console.log('✅ Connected to backend:', BACKEND_URL);
      console.log('🚀 Transport:', socketRef.current?.io.engine.transport.name);
      console.log('🆔 Socket ID:', socketRef.current?.id);
      
      // Log transport upgrades
      socketRef.current?.io.engine.on('upgrade', () => {
        console.log('⬆️ Transport upgraded to:', socketRef.current?.io.engine.transport.name);
      });

      // Log transport downgrades
      socketRef.current?.io.engine.on('upgradeError', (error) => {
        console.log('⬇️ Transport upgrade failed, staying on polling:', error.message);
      });
    });

    socketRef.current.on('disconnect', (reason) => {
      setConnected(false);
      setConnectionStatus(`Disconnected: ${reason}`);
      console.log('❌ Disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        console.log('🔄 Server disconnected, attempting reconnect...');
        socketRef.current?.connect();
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('🚫 Connection error:', err.message);
      setReconnectAttempts(prev => prev + 1);
      setConnectionStatus(`Connection failed (${reconnectAttempts + 1})`);
      
      if (reconnectAttempts < 5) {
        setError(`Connection failed. Retrying... (${reconnectAttempts + 1}/5)`);
      } else {
        setError('Failed to connect to server. The backend might be starting up (Render free tier). Please wait 30 seconds and refresh.');
      }
      setConnected(false);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      setConnected(true);
      setError(null);
      setReconnectAttempts(0);
      setConnectionStatus('Reconnected');
      
      // Re-join the session to refresh user data
      if (user) {
        console.log('Re-joining session as', user.displayName);
        socketRef.current?.emit('join', { displayName: user.displayName });
      }
    });

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt', attemptNumber);
      setConnectionStatus(`Reconnecting... (${attemptNumber})`);
    });

    socketRef.current.on('reconnect_error', (err) => {
      console.error('🚫 Reconnection error:', err.message);
      setConnectionStatus(`Reconnection failed: ${err.message}`);
    });

    socketRef.current.on('reconnect_failed', () => {
      console.error('💀 Reconnection failed after all attempts');
      setError('Connection failed permanently. Please refresh the page.');
      setConnectionStatus('Connection failed');
    });

    socketRef.current.on('error', (data) => {
      console.error('⚠️ Socket error:', data);
      setError(data.message || 'An error occurred');
      setConnectionStatus('Error occurred');
    });

    // User events
    socketRef.current.on('user_joined', (data) => {
      setUser(data.user);
      setStories(data.stories);
      setVotingSessions(data.votingSessions);
      setVotes(data.votes);
      console.log('👤 User joined:', data.user.displayName);
    });

    socketRef.current.on('users_updated', (users) => {
      setConnectedUsers(users);
      console.log('👥 Users updated:', users.length, 'online');
    });

    // Story events
    socketRef.current.on('story_created', (story) => {
      setStories(prev => [story, ...prev]);
      console.log('📝 Story created:', story.title);
    });

    socketRef.current.on('story_updated', (story) => {
      setStories(prev => prev.map(s => s.id === story.id ? story : s));
      console.log('✏️ Story updated:', story.title);
    });

    socketRef.current.on('story_deleted', (data) => {
      setStories(prev => prev.filter(s => s.id !== data.id));
      setVotingSessions(prev => {
        const updated = { ...prev };
        delete updated[data.id];
        return updated;
      });
      setVotes(prev => {
        const updated = { ...prev };
        delete updated[data.id];
        return updated;
      });
      console.log('🗑️ Story deleted:', data.id);
    });

    socketRef.current.on('stories_bulk_created', (newStories) => {
      setStories(prev => [...newStories, ...prev]);
      console.log('📚 Bulk stories created:', newStories.length);
    });

    socketRef.current.on('story_points_saved', (data) => {
      setStories(prev => prev.map(s => s.id === data.storyId ? data.story : s));
      console.log('💾 Story points saved:', data.points);
    });

    // Voting events
    socketRef.current.on('voting_session_started', (session) => {
      console.log(`🗳️ Voting session started for story ID: ${session.storyId}, session ID: ${session.id}`);
      setVotingSessions(prev => {
        const updated = { ...prev };
        updated[session.storyId] = session;
        return updated;
      });
      setVotes(prev => ({ ...prev, [session.storyId]: [] }));
    });

    socketRef.current.on('vote_submitted', (data) => {
      // Update the votes state with the new information about who has voted
      // (we'll still hide the actual vote values until revealed)
      setVotes(prev => {
        // Track who has voted for this story 
        console.log(`Vote submitted for story ${data.storyId}: ${data.voterName} (${data.voteCount || 0}/${data.totalUsers || 0} votes)`);
        
        // Check if userVotes is available from server (backward compatibility)
        if (!data.userVotes) {
          console.log('userVotes not available in server response - using legacy mode');
          // Backward compatibility: if server hasn't been updated, just add the single vote
          // Get the existing votes for this story
          const existingVotes = [...(prev[data.storyId] || [])];
          
          // Check if this voter already exists
          const voterIndex = existingVotes.findIndex(v => v.displayName === data.voterName);
          
          if (voterIndex >= 0) {
            // Update existing vote
            existingVotes[voterIndex] = {
              ...existingVotes[voterIndex],
              submittedAt: new Date().toISOString()
            };
          } else {
            // Add new vote
            existingVotes.push({
              id: `${data.storyId}_${data.voterName}`,
              storyId: data.storyId,
              userId: data.userId || 'unknown', // Fallback if userId not available
              displayName: data.voterName,
              voteValue: data.value || '?', // Use the actual vote value if available, otherwise placeholder
              submittedAt: new Date().toISOString()
            });
          }
          
          return {
            ...prev,
            [data.storyId]: existingVotes
          };
        }
        
        // New mode with userVotes data
        console.log('Users who voted:', data.userVotes);
        
        // We don't have the actual vote values yet, but we know who has voted
        // If the current user is voting, we should show their selection immediately
        return {
          ...prev,
          [data.storyId]: data.userVotes.map((voter: { userId: string; displayName: string; value?: string }) => {
            // For the current user who just voted, show their actual vote value
            const isCurrentUser = voter.displayName === data.voterName && data.value;
            
            return {
              id: `${data.storyId}_${voter.displayName}`,
              storyId: data.storyId,
              userId: voter.userId,
              displayName: voter.displayName,
              // Use the actual vote value for the current user if available
              voteValue: isCurrentUser ? data.value : (voter.value || '?'),
              submittedAt: new Date().toISOString()
            };
          })
        };
      });
    });

    socketRef.current.on('votes_revealed', (data) => {
      setVotingSessions(prev => ({
        ...prev,
        [data.storyId]: { ...prev[data.storyId], votesRevealed: data.revealed }
      }));
      if (data.revealed) {
        setVotes(prev => ({ ...prev, [data.storyId]: data.votes }));
      }
      console.log('👁️ Votes revealed for story:', data.storyId);
    });

    socketRef.current.on('timer_started', (data) => {
      setVotingSessions(prev => ({
        ...prev,
        [data.storyId]: {
          ...prev[data.storyId],
          timerStartedAt: data.startedAt,
          timerDuration: data.duration
        }
      }));
      console.log('⏰ Timer started for story:', data.storyId);
    });

    socketRef.current.on('timer_stopped', (data) => {
      setVotingSessions(prev => ({
        ...prev,
        [data.storyId]: { ...prev[data.storyId], timerStartedAt: null }
      }));
      console.log('⏹️ Timer stopped for story:', data.storyId);
    });

    socketRef.current.on('voting_reset', (data) => {
      setVotingSessions(prev => ({
        ...prev,
        [data.storyId]: {
          ...prev[data.storyId],
          votesRevealed: false,
          timerStartedAt: null
        }
      }));
      setVotes(prev => ({ ...prev, [data.storyId]: [] }));
      console.log('🔄 Voting reset for story:', data.storyId);
    });

    socketRef.current.on('deck_type_changed', (data) => {
      setVotingSessions(prev => ({
        ...prev,
        [data.storyId]: { ...prev[data.storyId], deckType: data.deckType }
      }));
      console.log('🃏 Deck type changed for story:', data.storyId, 'to:', data.deckType);
    });

    socketRef.current.on('voting_session_ended', (data) => {
      setVotingSessions(prev => ({
        ...prev,
        [data.storyId]: { ...prev[data.storyId], isActive: false }
      }));
      console.log('🏁 Voting session ended for story:', data.storyId);
    });

    return () => {
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket...');
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinSession = (displayName: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join', { displayName });
      console.log('👋 Joining session as:', displayName);
    } else {
      setError('Not connected to server. Please wait for connection...');
      console.warn('❌ Cannot join - not connected');
    }
  };

  const createStory = (title: string, description: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('create_story', { title, description });
    } else {
      setError('Not connected to server');
    }
  };

  const updateStory = (id: string, title: string, description: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('update_story', { id, title, description });
    } else {
      setError('Not connected to server');
    }
  };

  const deleteStory = (id: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('delete_story', { id });
    } else {
      setError('Not connected to server');
    }
  };

  const bulkCreateStories = (stories: Array<{ title: string; description: string }>) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('bulk_create_stories', { stories });
    } else {
      setError('Not connected to server');
    }
  };

  const saveStoryPoints = (storyId: string, points: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('save_story_points', { storyId, points });
    } else {
      setError('Not connected to server');
    }
  };

  const startVotingSession = (storyId: string, deckType = 'powersOfTwo', timerDuration = 60) => {
    if (socketRef.current && socketRef.current.connected) {
      console.log(`Emitting start_voting_session for story ID: ${storyId}`);
      socketRef.current.emit('start_voting_session', { storyId, deckType, timerDuration });
    } else {
      setError('Not connected to server');
    }
  };

  const submitVote = (storyId: string, value: string) => {
    if (socketRef.current && socketRef.current.connected) {
      console.log(`Submitting vote for story ${storyId}: ${value}`);
      
      // Store the vote locally in case of disconnection
      if (user) {
        // Optimistically update local state
        setVotes(prev => {
          const existingVotes = [...(prev[storyId] || [])];
          const voterIndex = existingVotes.findIndex(v => 
            (v.userId && user.id && v.userId === user.id) || 
            v.displayName.toLowerCase() === user.displayName.toLowerCase()
          );
          
          if (voterIndex >= 0) {
            // Update existing vote
            existingVotes[voterIndex] = {
              ...existingVotes[voterIndex],
              voteValue: value,
              submittedAt: new Date().toISOString()
            };
          } else {
            // Add new vote
            existingVotes.push({
              id: `${storyId}_${user.displayName}`,
              storyId: storyId,
              userId: user.id || 'unknown',
              displayName: user.displayName,
              voteValue: value,
              submittedAt: new Date().toISOString()
            });
          }
          
          return {
            ...prev,
            [storyId]: existingVotes
          };
        });
      }
      
      // Send to server
      socketRef.current.emit('submit_vote', { storyId, value });
    } else {
      setError('Not connected to server. Attempting to reconnect...');
      // Try to reconnect
      socketRef.current?.connect();
    }
  };

  const startTimer = (storyId: string, duration: number) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('start_timer', { storyId, duration });
    } else {
      setError('Not connected to server');
    }
  };

  const stopTimer = (storyId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('stop_timer', { storyId });
    } else {
      setError('Not connected to server');
    }
  };

  const revealVotes = (storyId: string, revealed: boolean) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('reveal_votes', { storyId, revealed });
    } else {
      setError('Not connected to server');
    }
  };

  const resetVoting = (storyId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('reset_voting', { storyId });
    } else {
      setError('Not connected to server');
    }
  };

  const changeDeckType = (storyId: string, deckType: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('change_deck_type', { storyId, deckType });
    } else {
      setError('Not connected to server');
    }
  };

  const endVotingSession = (storyId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('end_voting_session', { storyId });
    } else {
      setError('Not connected to server');
    }
  };

  return {
    connected,
    user,
    stories,
    votingSessions,
    votes,
    connectedUsers,
    error,
    connectionStatus,
    actions: {
      joinSession,
      createStory,
      updateStory,
      deleteStory,
      bulkCreateStories,
      saveStoryPoints,
      startVotingSession,
      submitVote,
      startTimer,
      stopTimer,
      revealVotes,
      resetVoting,
      changeDeckType,
      endVotingSession,
    },
  };
};