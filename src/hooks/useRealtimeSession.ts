import { useState, useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface SessionParticipant {
  id: string;
  displayName: string;
  isStoryCreator: boolean;
  joinedAt: string;
  lastSeen: string;
}

export interface SessionState {
  id: string;
  storyId: string;
  participants: SessionParticipant[];
  isActive: boolean;
  votesRevealed: boolean;
  timerStartedAt: string | null;
  timerDuration: number;
  deckType: string;
}

export interface Vote {
  userId: string;
  displayName: string;
  value: string;
  submittedAt: string;
}

interface UseRealtimeSessionProps {
  storyId: string;
  user: {
    id: string;
    displayName: string;
    isStoryCreator: boolean;
  } | null;
  onSessionEnd?: () => void;
}

export const useRealtimeSession = ({ storyId, user, onSessionEnd }: UseRealtimeSessionProps) => {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session and join room
  useEffect(() => {
    if (!user || !storyId) return;

    initializeSession();

    return () => {
      cleanup();
    };
  }, [storyId, user?.id]);

  // Heartbeat to maintain presence
  useEffect(() => {
    if (!channelRef.current || !user) return;

    const sendHeartbeat = () => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'heartbeat',
        payload: {
          userId: user.id,
          displayName: user.displayName,
          isStoryCreator: user.isStoryCreator,
          timestamp: new Date().toISOString(),
        },
      });
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 30 seconds
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [user, channelRef.current]);

  const initializeSession = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Check for existing session
      const { data: existingSession, error: sessionError } = await supabase
        .from('voting_sessions')
        .select('*')
        .eq('story_id', storyId)
        .eq('is_active', true)
        .maybeSingle();

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError;
      }

      let session = existingSession;

      // Create session if none exists and user is story creator
      if (!session && user.isStoryCreator) {
        const { data: newSession, error: createError } = await supabase
          .from('voting_sessions')
          .insert({
            story_id: storyId,
            deck_type: 'fibonacci',
            is_active: true,
            votes_revealed: false,
            timer_duration: 60,
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        session = newSession;
      }

      if (session) {
        // Initialize session state
        setSessionState({
          id: session.id,
          storyId: session.story_id,
          participants: [],
          isActive: session.is_active,
          votesRevealed: session.votes_revealed,
          timerStartedAt: session.timer_started_at,
          timerDuration: session.timer_duration,
          deckType: session.deck_type,
        });

        // Load existing votes
        await loadVotes(session.id);

        // Setup real-time channel
        setupRealtimeChannel(session.id);
      } else if (!user.isStoryCreator) {
        // Non-story creator waiting for session
        setSessionState(null);
        setupWaitingChannel();
      }
    } catch (err) {
      console.error('Error initializing session:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize session');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeChannel = (sessionId: string) => {
    const channelName = `voting_session_${sessionId}`;
    
    channelRef.current = supabase.channel(channelName, {
      config: {
        presence: {
          key: user?.id || 'anonymous',
        },
      },
    });

    // Handle presence changes (users joining/leaving)
    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channelRef.current?.presenceState();
        if (presenceState) {
          const participants: SessionParticipant[] = Object.values(presenceState)
            .flat()
            .map((presence: any) => ({
              id: presence.userId,
              displayName: presence.displayName,
              isStoryCreator: presence.isStoryCreator,
              joinedAt: presence.joinedAt,
              lastSeen: presence.timestamp,
            }));

          setSessionState(prev => prev ? { ...prev, participants } : null);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      });

    // Handle broadcast events
    channelRef.current
      .on('broadcast', { event: 'vote_submitted' }, ({ payload }) => {
        setVotes(prev => ({
          ...prev,
          [payload.userId]: {
            userId: payload.userId,
            displayName: payload.displayName,
            value: payload.value,
            submittedAt: payload.timestamp,
          },
        }));
      })
      .on('broadcast', { event: 'votes_revealed' }, ({ payload }) => {
        setSessionState(prev => prev ? { ...prev, votesRevealed: payload.revealed } : null);
      })
      .on('broadcast', { event: 'timer_started' }, ({ payload }) => {
        setSessionState(prev => prev ? {
          ...prev,
          timerStartedAt: payload.startedAt,
          timerDuration: payload.duration,
        } : null);
      })
      .on('broadcast', { event: 'timer_stopped' }, () => {
        setSessionState(prev => prev ? { ...prev, timerStartedAt: null } : null);
      })
      .on('broadcast', { event: 'session_reset' }, () => {
        setVotes({});
        setSessionState(prev => prev ? {
          ...prev,
          votesRevealed: false,
          timerStartedAt: null,
        } : null);
      })
      .on('broadcast', { event: 'deck_changed' }, ({ payload }) => {
        setSessionState(prev => prev ? { ...prev, deckType: payload.deckType } : null);
      })
      .on('broadcast', { event: 'session_ended' }, () => {
        setSessionState(prev => prev ? { ...prev, isActive: false } : null);
        onSessionEnd?.();
      });

    // Subscribe and track presence
    channelRef.current.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && user) {
        await channelRef.current?.track({
          userId: user.id,
          displayName: user.displayName,
          isStoryCreator: user.isStoryCreator,
          joinedAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        });
      }
    });
  };

  const setupWaitingChannel = () => {
    // Channel for non-story creators to wait for session creation
    const waitingChannelName = `story_${storyId}_waiting`;
    
    channelRef.current = supabase.channel(waitingChannelName);

    channelRef.current
      .on('broadcast', { event: 'session_created' }, ({ payload }) => {
        if (payload.storyId === storyId) {
          // Reinitialize when session is created
          setTimeout(() => initializeSession(), 1000);
        }
      })
      .subscribe();
  };

  const loadVotes = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('session_id', sessionId);

      if (error) throw error;

      const votesMap: Record<string, Vote> = {};
      data?.forEach(vote => {
        votesMap[vote.user_id || vote.display_name] = {
          userId: vote.user_id || vote.display_name,
          displayName: vote.display_name,
          value: vote.vote_value,
          submittedAt: vote.created_at,
        };
      });

      setVotes(votesMap);
    } catch (error) {
      console.error('Error loading votes:', error);
    }
  };

  const submitVote = async (value: string) => {
    if (!sessionState || !user) return;

    try {
      // Save to database
      const { error } = await supabase
        .from('votes')
        .upsert({
          session_id: sessionState.id,
          user_id: user.id,
          display_name: user.displayName,
          vote_value: value,
        });

      if (error) throw error;

      // Broadcast to other users
      channelRef.current?.send({
        type: 'broadcast',
        event: 'vote_submitted',
        payload: {
          userId: user.id,
          displayName: user.displayName,
          value,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  };

  const revealVotes = async (revealed: boolean) => {
    if (!sessionState || !user?.isStoryCreator) return;

    try {
      const { error } = await supabase
        .from('voting_sessions')
        .update({ 
          votes_revealed: revealed,
          timer_started_at: null, // Stop timer when revealing
        })
        .eq('id', sessionState.id);

      if (error) throw error;

      // Broadcast to other users
      channelRef.current?.send({
        type: 'broadcast',
        event: 'votes_revealed',
        payload: { revealed },
      });

    } catch (error) {
      console.error('Error revealing votes:', error);
      throw error;
    }
  };

  const startTimer = async (duration: number) => {
    if (!sessionState || !user?.isStoryCreator) return;

    const startedAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('voting_sessions')
        .update({ 
          timer_started_at: startedAt,
          timer_duration: duration,
        })
        .eq('id', sessionState.id);

      if (error) throw error;

      // Broadcast to other users
      channelRef.current?.send({
        type: 'broadcast',
        event: 'timer_started',
        payload: { startedAt, duration },
      });

    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  };

  const stopTimer = async () => {
    if (!sessionState || !user?.isStoryCreator) return;

    try {
      const { error } = await supabase
        .from('voting_sessions')
        .update({ timer_started_at: null })
        .eq('id', sessionState.id);

      if (error) throw error;

      // Broadcast to other users
      channelRef.current?.send({
        type: 'broadcast',
        event: 'timer_stopped',
        payload: {},
      });

    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  };

  const resetSession = async () => {
    if (!sessionState || !user?.isStoryCreator) return;

    try {
      // Delete all votes
      await supabase
        .from('votes')
        .delete()
        .eq('session_id', sessionState.id);

      // Reset session
      await supabase
        .from('voting_sessions')
        .update({ 
          votes_revealed: false,
          timer_started_at: null,
        })
        .eq('id', sessionState.id);

      // Broadcast to other users
      channelRef.current?.send({
        type: 'broadcast',
        event: 'session_reset',
        payload: {},
      });

    } catch (error) {
      console.error('Error resetting session:', error);
      throw error;
    }
  };

  const changeDeckType = async (deckType: string) => {
    if (!sessionState || !user?.isStoryCreator) return;

    try {
      const { error } = await supabase
        .from('voting_sessions')
        .update({ deck_type: deckType })
        .eq('id', sessionState.id);

      if (error) throw error;

      // Broadcast to other users
      channelRef.current?.send({
        type: 'broadcast',
        event: 'deck_changed',
        payload: { deckType },
      });

    } catch (error) {
      console.error('Error changing deck type:', error);
      throw error;
    }
  };

  const endSession = async () => {
    if (!sessionState || !user?.isStoryCreator) return;

    try {
      const { error } = await supabase
        .from('voting_sessions')
        .update({ is_active: false })
        .eq('id', sessionState.id);

      if (error) throw error;

      // Broadcast to other users
      channelRef.current?.send({
        type: 'broadcast',
        event: 'session_ended',
        payload: {},
      });

      // Notify waiting users that session is available
      const waitingChannel = supabase.channel(`story_${storyId}_waiting`);
      waitingChannel.send({
        type: 'broadcast',
        event: 'session_created',
        payload: { storyId },
      });

    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  };

  const cleanup = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  return {
    sessionState,
    votes: Object.values(votes),
    loading,
    error,
    actions: {
      submitVote,
      revealVotes,
      startTimer,
      stopTimer,
      resetSession,
      changeDeckType,
      endSession,
      retry: initializeSession,
    },
  };
};