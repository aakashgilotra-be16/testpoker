/**
 * Modern Planning Poker Hook
 * Enterprise-level hook for planning poker functionality
 */

import { useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socketService';
import { storageService } from '../services/storageService';
import { SOCKET_EVENTS, VOTING_CONFIG } from '../constants';
import type { 
  Story, 
  VotingSession, 
  Vote,
  User,
  LoadingState,
  ConnectionStatus
} from '../types';
import { utils } from '../utils';

export interface UsePlanningPokerReturn {
  connectionStatus: ConnectionStatus;
  stories: Story[];
  currentVotingSession: VotingSession | null;
  votes: Vote[];
  connectedUsers: User[];
  error: string | null;
  loading: LoadingState;
  actions: {
    initialize: () => Promise<void>;
    addStory: (storyData: Partial<Story>) => Promise<void>;
    updateStory: (storyId: string, updates: Partial<Story>) => Promise<void>;
    deleteStory: (storyId: string) => Promise<void>;
    startVoting: (storyId: string) => Promise<void>;
    castVote: (storyId: string, value: string) => Promise<void>;
    revealVotes: () => Promise<void>;
    endVoting: () => Promise<void>;
    setEstimate: (storyId: string, estimate: string) => Promise<void>;
  };
  utils: {
    getStoryById: (storyId: string) => Story | undefined;
    getVotesByStory: (storyId: string) => Vote[];
    calculateConsensus: (votes: Vote[]) => { hasConsensus: boolean; percentage: number };
    exportStories: () => any;
    getVotingStats: () => { totalStories: number; estimatedStories: number; averagePoints: number };
  };
}

export const usePlanningPoker = (): UsePlanningPokerReturn => {
  // State management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [stories, setStories] = useState<Story[]>([]);
  const [currentVotingSession, setCurrentVotingSession] = useState<VotingSession | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    error: undefined,
  });

  // Utility functions
  const utilities = {
    getStoryById: useCallback((storyId: string): Story | undefined => {
      return stories.find(story => story.id === storyId);
    }, [stories]),

    getVotesByStory: useCallback((storyId: string): Vote[] => {
      return votes.filter(vote => vote.storyId === storyId);
    }, [votes]),

    calculateConsensus: useCallback((storyVotes: Vote[]) => {
      if (storyVotes.length === 0) return { hasConsensus: false, percentage: 0 };
      
      const voteValues = storyVotes.map(vote => vote.value);
      const uniqueValues = Array.from(new Set(voteValues));
      
      if (uniqueValues.length === 1) {
        return { hasConsensus: true, percentage: 100 };
      }
      
      // Calculate percentage of most common vote
      const voteCounts = voteValues.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const maxCount = Math.max(...Object.values(voteCounts));
      const percentage = (maxCount / voteValues.length) * 100;
      
      return { hasConsensus: percentage >= 70, percentage };
    }, []),

    exportStories: useCallback(() => {
      return {
        stories,
        votingSessions: currentVotingSession ? [currentVotingSession] : [],
        votes,
        timestamp: new Date().toISOString(),
        statistics: utilities.getVotingStats(),
      };
    }, [stories, currentVotingSession, votes]),

    getVotingStats: useCallback(() => {
      const estimatedStories = stories.filter(story => story.estimate).length;
      const totalPoints = stories
        .filter(story => story.estimate && !isNaN(Number(story.estimate)))
        .reduce((sum, story) => sum + Number(story.estimate), 0);
      
      return {
        totalStories: stories.length,
        estimatedStories,
        averagePoints: estimatedStories > 0 ? totalPoints / estimatedStories : 0,
      };
    }, [stories]),
  };

  // Action handlers
  const actions = {
    initialize: useCallback(async (): Promise<void> => {
      try {
        setLoading({ isLoading: true });
        
        if (!socketService.isConnected()) {
          await socketService.connect();
        }
        
        setLoading({ isLoading: false });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize';
        setError(errorMessage);
        setLoading({ isLoading: false, error: errorMessage });
      }
    }, []),

    addStory: useCallback(async (storyData: Partial<Story>): Promise<void> => {
      try {
        const user = storageService.getUser();
        if (!user) throw new Error('User not authenticated');

        // Validate story data
        if (!storyData.title?.trim()) {
          throw new Error('Story title is required');
        }

        const newStory: Omit<Story, 'id' | 'createdAt' | 'updatedAt'> = {
          title: utils.string.sanitize(storyData.title.trim()),
          description: storyData.description ? utils.string.sanitize(storyData.description.trim()) : undefined,
          acceptanceCriteria: storyData.acceptanceCriteria || [],
          priority: storyData.priority || 'medium',
          status: 'pending',
          roomId: '', // Will be set by the server
          createdBy: user.id,
          tags: storyData.tags || [],
        };

        // Optimistic update
        const tempStory: Story = {
          ...newStory,
          id: `temp-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          roomId: '', // Will be updated by server
        };
        
        setStories(prev => [...prev, tempStory]);

        // Send to server
        const savedStory = await socketService.addStory(newStory);
        
        // Replace temp story with real story
        setStories(prev => prev.map(story => 
          story.id === tempStory.id ? savedStory : story
        ));

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add story';
        setError(errorMessage);
        
        // Revert optimistic update
        setStories(prev => prev.filter(story => !story.id.startsWith('temp-')));
      }
    }, []),

    updateStory: useCallback(async (storyId: string, updates: Partial<Story>): Promise<void> => {
      try {
        // Validate updates
        if (updates.title && !updates.title.trim()) {
          throw new Error('Story title cannot be empty');
        }

        // Sanitize text fields
        const sanitizedUpdates = {
          ...updates,
          title: updates.title ? utils.string.sanitize(updates.title.trim()) : undefined,
          description: updates.description ? utils.string.sanitize(updates.description.trim()) : undefined,
          updatedAt: new Date(),
        };

        // Optimistic update
        const originalStory = stories.find(story => story.id === storyId);
        if (!originalStory) throw new Error('Story not found');

        setStories(prev => prev.map(story => 
          story.id === storyId 
            ? { ...story, ...sanitizedUpdates } as Story
            : story
        ));

        // Send to server
        await socketService.updateStory(storyId, sanitizedUpdates);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update story';
        setError(errorMessage);
        
        // Revert optimistic update
        const originalStory = stories.find(story => story.id === storyId);
        if (originalStory) {
          setStories(prev => prev.map(story => 
            story.id === storyId ? originalStory : story
          ));
        }
      }
    }, [stories]),

    deleteStory: useCallback(async (storyId: string): Promise<void> => {
      try {
        // Store original for rollback
        const originalStory = stories.find(story => story.id === storyId);
        if (!originalStory) throw new Error('Story not found');

        // Optimistic update
        setStories(prev => prev.filter(story => story.id !== storyId));

        // Send to server
        await socketService.deleteStory(storyId);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete story';
        setError(errorMessage);
        
        // Revert optimistic update
        const originalStory = stories.find(story => story.id === storyId);
        if (originalStory) {
          setStories(prev => [...prev, originalStory]);
        }
      }
    }, [stories]),

    startVoting: useCallback(async (storyId: string): Promise<void> => {
      try {
        const story = utilities.getStoryById(storyId);
        if (!story) throw new Error('Story not found');

        // Update story status optimistically
        setStories(prev => prev.map(s => 
          s.id === storyId ? { ...s, status: 'voting' } : s
        ));

        // Start voting session
        const session = await socketService.startVoting(storyId);
        setCurrentVotingSession(session);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start voting';
        setError(errorMessage);
        
        // Revert story status
        setStories(prev => prev.map(s => 
          s.id === storyId ? { ...s, status: 'pending' } : s
        ));
      }
    }, [utilities]),

    castVote: useCallback(async (storyId: string, value: string): Promise<void> => {
      try {
        const user = storageService.getUser();
        if (!user) throw new Error('User not authenticated');

        // Validate vote value
        if (!VOTING_CONFIG.DEFAULT_VOTING_SCALE.includes(value as any)) {
          throw new Error('Invalid vote value');
        }

        // Create optimistic vote
        const tempVote: Vote = {
          id: `temp-${Date.now()}`,
          userId: user.id,
          userName: user.name,
          storyId,
          value,
          isRevealed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Update votes optimistically
        setVotes(prev => {
          // Remove any existing vote from this user for this story
          const filtered = prev.filter(v => !(v.storyId === storyId && v.userId === user.id));
          return [...filtered, tempVote];
        });

        // Send to server
        await socketService.castVote(storyId, value);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to cast vote';
        setError(errorMessage);
        
        // Revert optimistic vote
        const user = storageService.getUser();
        if (user) {
          setVotes(prev => prev.filter(v => 
            !(v.storyId === storyId && v.userId === user.id && v.id.startsWith('temp-'))
          ));
        }
      }
    }, []),

    revealVotes: useCallback(async (): Promise<void> => {
      try {
        if (!currentVotingSession) throw new Error('No active voting session');

        await socketService.revealVotes(currentVotingSession.id);

        // Update votes to revealed status
        setVotes(prev => prev.map(vote => 
          vote.storyId === currentVotingSession.storyId 
            ? { ...vote, isRevealed: true }
            : vote
        ));

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reveal votes';
        setError(errorMessage);
      }
    }, [currentVotingSession]),

    endVoting: useCallback(async (): Promise<void> => {
      try {
        if (!currentVotingSession) throw new Error('No active voting session');

        await socketService.endVoting(currentVotingSession.id);
        
        // Update story status
        setStories(prev => prev.map(story => 
          story.id === currentVotingSession.storyId 
            ? { ...story, status: 'voted' }
            : story
        ));

        setCurrentVotingSession(null);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to end voting';
        setError(errorMessage);
      }
    }, [currentVotingSession]),

    setEstimate: useCallback(async (storyId: string, estimate: string): Promise<void> => {
      try {
        // Validate estimate
        if (!estimate.trim()) {
          throw new Error('Estimate cannot be empty');
        }

        await actions.updateStory(storyId, { 
          estimate: estimate.trim(),
          status: 'estimated'
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to set estimate';
        setError(errorMessage);
      }
    }, []),
  };

  // Socket event handlers
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Connection status
    unsubscribers.push(
      socketService.on('connectionStatusChanged', (status: ConnectionStatus) => {
        setConnectionStatus(status);
      })
    );

    // Story events
    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.STORY_ADDED, (story: Story) => {
        setStories(prev => {
          const exists = prev.find(s => s.id === story.id);
          return exists ? prev : [...prev, story];
        });
      })
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.STORY_UPDATED, (story: Story) => {
        setStories(prev => prev.map(s => s.id === story.id ? story : s));
      })
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.STORY_DELETED, (data: { storyId: string }) => {
        setStories(prev => prev.filter(story => story.id !== data.storyId));
        setVotes(prev => prev.filter(vote => vote.storyId !== data.storyId));
      })
    );

    // Voting events
    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.VOTING_STARTED, (session: VotingSession) => {
        setCurrentVotingSession(session);
        setStories(prev => prev.map(story => 
          story.id === session.storyId 
            ? { ...story, status: 'voting' }
            : story
        ));
      })
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.VOTE_CAST, (vote: Vote) => {
        setVotes(prev => {
          // Remove existing vote from same user for same story
          const filtered = prev.filter(v => 
            !(v.storyId === vote.storyId && v.userId === vote.userId)
          );
          return [...filtered, vote];
        });
      })
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.VOTES_REVEALED, (data: { storyId: string }) => {
        setVotes(prev => prev.map(vote => 
          vote.storyId === data.storyId 
            ? { ...vote, isRevealed: true }
            : vote
        ));
      })
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.VOTING_ENDED, (data: { sessionId: string; storyId: string }) => {
        setCurrentVotingSession(null);
        setStories(prev => prev.map(story => 
          story.id === data.storyId 
            ? { ...story, status: 'voted' }
            : story
        ));
      })
    );

    // User events
    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.USER_JOINED, (user: User) => {
        setConnectedUsers(prev => {
          const exists = prev.find(u => u.id === user.id);
          return exists ? prev : [...prev, user];
        });
      })
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.USER_LEFT, (data: { userId: string }) => {
        setConnectedUsers(prev => prev.filter(user => user.id !== data.userId));
      })
    );

    // Error handling
    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.ERROR, (errorData: { message: string }) => {
        setError(errorData.message);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // Auto-clear errors
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    connectionStatus,
    stories,
    currentVotingSession,
    votes,
    connectedUsers,
    error,
    loading,
    actions,
    utils: utilities,
  };
};