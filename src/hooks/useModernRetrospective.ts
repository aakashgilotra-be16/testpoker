/**
 * Modern Retrospective Hook
 * Enterprise-level hook using the service architecture
 */

import { useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socketService';
import { storageService } from '../services/storageService';
import { SOCKET_EVENTS, RETROSPECTIVE_CATEGORIES } from '../constants';
import type { 
  RetrospectiveItem, 
  RetrospectiveSession, 
  User,
  LoadingState,
  ConnectionStatus
} from '../types';
import { utils } from '../utils';

// Hook interface for enterprise integration
export interface UseModernRetrospectiveReturn {
  connectionStatus: ConnectionStatus;
  items: RetrospectiveItem[];
  session: RetrospectiveSession | null;
  connectedUsers: User[];
  error: string | null;
  loading: LoadingState;
  actions: {
    initialize: () => Promise<void>;
    joinSession: (userName: string) => Promise<void>;
    addItem: (category: string, text: string) => Promise<void>;
    updateItem: (itemId: string, text: string) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
    voteOnItem: (itemId: string) => Promise<void>;
    changePhase: (phase: string) => Promise<void>;
    disconnect: () => void;
  };
  utils: {
    getItemsByCategory: (category: string) => RetrospectiveItem[];
    getCategoryStats: (category: string) => { count: number; votes: number };
    exportSession: () => any;
    clearError: () => void;
  };
}

export const useModernRetrospective = (): UseModernRetrospectiveReturn => {
  // State management with proper typing
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [items, setItems] = useState<RetrospectiveItem[]>([]);
  const [session, setSession] = useState<RetrospectiveSession | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    error: undefined,
  });

  // Utility functions
  const utilities = {
    getItemsByCategory: useCallback((category: string): RetrospectiveItem[] => {
      return items.filter(item => item.category === category);
    }, [items]),

    getCategoryStats: useCallback((category: string) => {
      const categoryItems = utilities.getItemsByCategory(category);
      return {
        count: categoryItems.length,
        votes: categoryItems.reduce((sum, item) => sum + (item.votes || 0), 0),
      };
    }, [items]),

    exportSession: useCallback(() => {
      return {
        session,
        items,
        connectedUsers,
        timestamp: new Date().toISOString(),
        categories: Object.values(RETROSPECTIVE_CATEGORIES).map(cat => ({
          category: cat,
          items: utilities.getItemsByCategory(cat),
          stats: utilities.getCategoryStats(cat),
        })),
      };
    }, [session, items, connectedUsers]),

    clearError: useCallback(() => {
      setError(null);
    }, []),
  };

  // Action handlers with error handling and optimistic updates
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

    joinSession: useCallback(async (userName: string): Promise<void> => {
      try {
        setLoading({ isLoading: true });
        setError(null);

        // Validate input
        const validation = utils.validation.validate(userName, {
          required: true,
          minLength: 2,
          maxLength: 30,
        });

        if (validation) {
          throw new Error(validation);
        }

        // Generate and store user
        const user: User = {
          id: utils.string.generateId(),
          name: userName.trim(),
          joinedAt: new Date(),
          lastSeen: new Date(),
        };
        
        storageService.setUser(user);
        
        // Join retrospective session
        const response = await socketService.emit('join-retrospective-session', { 
          userName: user.name,
          userId: user.id 
        });

        if (response.data?.session) {
          setSession(response.data.session);
        }
        
        if (response.data?.items) {
          setItems(response.data.items);
        }
        
        setLoading({ isLoading: false });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to join session';
        setError(errorMessage);
        setLoading({ isLoading: false, error: errorMessage });
      }
    }, []),

    addItem: useCallback(async (category: string, text: string): Promise<void> => {
      try {
        const user = storageService.getUser();
        if (!user) throw new Error('User not authenticated');

        // Validate input
        const textValidation = utils.validation.validate(text, {
          required: true,
          minLength: 1,
          maxLength: 500,
        });

        if (textValidation) {
          throw new Error(textValidation);
        }

        // Sanitize content
        const sanitizedText = utils.string.sanitize(text.trim());

        const newItem: Omit<RetrospectiveItem, 'id' | 'createdAt' | 'updatedAt'> = {
          content: sanitizedText,
          category: category as RetrospectiveItem['category'],
          author: user.name,
          authorId: user.id,
          roomId: session?.roomId || '',
        };

        // Optimistic update
        const tempItem: RetrospectiveItem = {
          ...newItem,
          id: `temp-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        setItems(prev => [...prev, tempItem]);

        // Send to server
        const savedItem = await socketService.addRetrospectiveItem(newItem);
        
        // Replace temp item with real item
        setItems(prev => prev.map(item => 
          item.id === tempItem.id ? savedItem : item
        ));

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add item';
        setError(errorMessage);
        
        // Revert optimistic update on error
        setItems(prev => prev.filter(item => !item.id.startsWith('temp-')));
      }
    }, [session?.roomId]),

    updateItem: useCallback(async (itemId: string, text: string): Promise<void> => {
      try {
        // Validate input
        const validation = utils.validation.validate(text, {
          required: true,
          minLength: 1,
          maxLength: 500,
        });

        if (validation) {
          throw new Error(validation);
        }

        const sanitizedText = utils.string.sanitize(text.trim());

        // Optimistic update
        const originalItem = items.find(item => item.id === itemId);
        if (!originalItem) throw new Error('Item not found');

        setItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, content: sanitizedText, updatedAt: new Date() }
            : item
        ));

        // Send to server
        await socketService.updateRetrospectiveItem(itemId, {
          content: sanitizedText,
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update item';
        setError(errorMessage);
        
        // Revert optimistic update
        const originalItem = items.find(item => item.id === itemId);
        if (originalItem) {
          setItems(prev => prev.map(item => 
            item.id === itemId ? originalItem : item
          ));
        }
      }
    }, [items]),

    deleteItem: useCallback(async (itemId: string): Promise<void> => {
      try {
        // Optimistic update - store original for rollback
        const originalItem = items.find(item => item.id === itemId);
        if (!originalItem) throw new Error('Item not found');

        setItems(prev => prev.filter(item => item.id !== itemId));

        // Send to server
        await socketService.deleteRetrospectiveItem(itemId);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete item';
        setError(errorMessage);
        
        // Revert optimistic update
        const originalItem = items.find(item => item.id === itemId);
        if (originalItem) {
          setItems(prev => [...prev, originalItem]);
        }
      }
    }, [items]),

    voteOnItem: useCallback(async (itemId: string): Promise<void> => {
      try {
        const user = storageService.getUser();
        if (!user) throw new Error('User not authenticated');

        // Optimistic update
        setItems(prev => prev.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                votes: (item.votes || 0) + 1,
                votedBy: [...(item.votedBy || []), user.id]
              }
            : item
        ));

        // Send to server
        await socketService.voteOnRetrospectiveItem(itemId);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to vote on item';
        setError(errorMessage);
        
        // Revert optimistic update
        setItems(prev => prev.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                votes: Math.max((item.votes || 1) - 1, 0),
                votedBy: (item.votedBy || []).filter(id => id !== storageService.getUser()?.id)
              }
            : item
        ));
      }
    }, []),

    changePhase: useCallback(async (phase: string): Promise<void> => {
      const originalPhase = session?.phase;
      
      try {
        // Optimistic update
        setSession(prev => prev ? { ...prev, phase: phase as RetrospectiveSession['phase'] } : null);

        // Send to server
        await socketService.emit('change-retrospective-phase', { phase });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to change phase';
        setError(errorMessage);
        
        // Revert optimistic update
        if (originalPhase) {
          setSession(prev => prev ? { ...prev, phase: originalPhase } : null);
        }
      }
    }, [session]),

    disconnect: useCallback((): void => {
      socketService.disconnect();
      setConnectionStatus('disconnected');
      setSession(null);
      setConnectedUsers([]);
      setItems([]);
    }, []),
  };

  // Socket event handlers with proper cleanup
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Connection status monitoring
    unsubscribers.push(
      socketService.on('connectionStatusChanged', (status: ConnectionStatus) => {
        setConnectionStatus(status);
      })
    );

    // Retrospective-specific events
    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.RETROSPECTIVE_ITEM_ADDED, (item: RetrospectiveItem) => {
        setItems(prev => {
          const exists = prev.find(i => i.id === item.id);
          return exists ? prev : [...prev, item];
        });
      })
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.RETROSPECTIVE_ITEM_UPDATED, (item: RetrospectiveItem) => {
        setItems(prev => prev.map(i => i.id === item.id ? item : i));
      })
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.RETROSPECTIVE_ITEM_DELETED, (data: { itemId: string }) => {
        setItems(prev => prev.filter(item => item.id !== data.itemId));
      })
    );

    unsubscribers.push(
      socketService.on('retrospective-users-updated', (users: User[]) => {
        setConnectedUsers(users);
      })
    );

    unsubscribers.push(
      socketService.on('retrospective-session-updated', (sessionData: RetrospectiveSession) => {
        setSession(sessionData);
      })
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENTS.ERROR, (errorData: { message: string }) => {
        setError(errorData.message);
      })
    );

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // Auto-clear errors with debouncing
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Periodic connection health check
  useEffect(() => {
    const healthCheck = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.ping().catch(() => {
          setError('Connection health check failed');
        });
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(healthCheck);
  }, []);

  return {
    connectionStatus,
    items,
    session,
    connectedUsers,
    error,
    loading,
    actions,
    utils: utilities,
  };
};

// Export both hooks for flexibility
export { useModernRetrospective as useRetrospective };