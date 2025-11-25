import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { 
  RetrospectiveItem, 
  RetrospectiveSession
} from '../types';

// Temporary type for RetrospectiveVote until it's added to main types
type RetrospectiveVote = {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  votedAt: string;
};

export const useRetrospective = (roomId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef<boolean>(false);
  const roomIdRef = useRef<string | undefined>(roomId);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<RetrospectiveItem[]>([]);
  const [votes, setVotes] = useState<Record<string, RetrospectiveVote[]>>({});
  const [session, setSession] = useState<RetrospectiveSession | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentScheme, setCurrentScheme] = useState<string>('standard');
  const [schemeCategories, setSchemeCategories] = useState<any[]>([]);
  const [aiActionItems, setAiActionItems] = useState<any[]>([]);
  
  // Update roomId ref when prop changes
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    // Prevent multiple connections
    if (socketRef.current) {
      return;
    }

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    
    socketRef.current = io(BACKEND_URL, {
      transports: ['polling', 'websocket'],
      timeout: 60000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 20,
      upgrade: true,
      rememberUpgrade: false,
      autoConnect: true,
      withCredentials: false,
      extraHeaders: {
        'Access-Control-Allow-Origin': '*'
      }
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      setError(null);
  
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current.on('connect_error', () => {
      setError('Failed to connect to retrospective server');
      setConnected(false);
    });

    socketRef.current.on('retrospective_user_joined', (data) => {
      setUser(data.user);
      setItems(data.items || []);
      setVotes(data.votes || {});
      setSession(data.session);
      if (data.connectedUsers) {
        setConnectedUsers(data.connectedUsers);
      }
    });

    socketRef.current.on('retrospective_users_updated', (users) => {
      setConnectedUsers(users);
    });

    socketRef.current.on('retrospective_item_added', (item) => {
      setItems(prev => [item, ...prev]);
    });

    socketRef.current.on('retrospective_item_updated', (item) => {
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
    });

    socketRef.current.on('retrospective_item_deleted', (data) => {
      setItems(prev => prev.filter(i => i.id !== data.id));
      setVotes(prev => {
        const updated = { ...prev };
        delete updated[data.id];
        return updated;
      });
    });

    socketRef.current.on('retrospective_vote_added', (vote) => {
      setVotes(prev => ({
        ...prev,
        [vote.itemId]: [...(prev[vote.itemId] || []), vote]
      }));
      // Update item vote count
      setItems(prev => prev.map(item => 
        item.id === vote.itemId 
          ? { ...item, votes: (item.votes || 0) + 1 }
          : item
      ));
    });

    socketRef.current.on('retrospective_vote_removed', (data) => {
      setVotes(prev => ({
        ...prev,
        [data.itemId]: (prev[data.itemId] || []).filter(v => v.id !== data.voteId)
      }));
      // Update item vote count
      setItems(prev => prev.map(item => 
        item.id === data.itemId 
          ? { ...item, votes: Math.max(0, (item.votes || 0) - 1) }
          : item
      ));
    });

    socketRef.current.on('retrospective_phase_changed', (data) => {
      setSession(prev => prev ? { ...prev, phase: data.phase } : null);
    });

    socketRef.current.on('retrospective_scheme_changed', (data: any) => {
      setCurrentScheme(data.scheme);
      setSchemeCategories(data.categories);
    });

    socketRef.current.on('retrospective_ai_actions_generated', (data: any) => {
      setAiActionItems(data.actionItems);
    });

    socketRef.current.on('retrospective_action_item_approved', (data: any) => {
      // Remove from AI suggestions
      setAiActionItems(prev => prev.filter(item => item.id !== data.actionItem.id));
      
      // Add approved action as a regular retrospective item
      const newItem: RetrospectiveItem = {
        id: data.actionItem.id,
        roomId: session?.roomId || '',
        content: data.actionItem.title + (data.actionItem.description ? ': ' + data.actionItem.description : ''),
        category: 'action-items',
        author: user?.displayName || 'AI Assistant',
        authorId: user?.id || 'ai',
        createdAt: data.actionItem.createdAt ? new Date(data.actionItem.createdAt) : new Date(),
        updatedAt: new Date(),
        votes: 0
      };
      setItems(prev => [newItem, ...prev]);
    });

    socketRef.current.on('retrospective_action_item_discarded', (data: any) => {
      setAiActionItems(prev => prev.filter(item => item.id !== data.actionItemId));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        joinedRef.current = false;
      }
    };
  }, []);

  const joinRetrospectiveSession = (displayName: string) => {
    if (joinedRef.current) {
      return;
    }
    
    if (socketRef.current && socketRef.current.connected) {
      joinedRef.current = true;
      socketRef.current.emit('join_retrospective', { 
        displayName,
        roomId: roomIdRef.current 
      });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const addItem = (text: string, category: 'went-well' | 'to-improve' | 'action-items') => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('add_retrospective_item', { text, category });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const updateItem = (id: string, text: string, category: 'went-well' | 'to-improve' | 'action-items') => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('update_retrospective_item', { id, text, category });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const deleteItem = (id: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('delete_retrospective_item', { id });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const voteItem = (itemId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('vote_retrospective_item', { itemId });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const removeVote = (itemId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('remove_retrospective_vote', { itemId });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const changePhase = (phase: 'gather' | 'discuss' | 'vote' | 'action') => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('change_retrospective_phase', { phase });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const hasUserVoted = (itemId: string) => {
    if (!user) return false;
    return votes[itemId]?.some(vote => vote.userId === user.id) || false;
  };

  const changeScheme = (scheme: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('change_retrospective_scheme', { scheme });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const generateAIActions = () => {
    if (socketRef.current && socketRef.current.connected) {
      // Filter items that aren't action items for context
      const contextItems = items.filter(item => 
        item.category !== 'action-items' && 
        (item as any).categoryId !== 'action-items'
      );
      socketRef.current.emit('generate_ai_actions', { contextItems });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const approveAIAction = (actionItemId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('approve_ai_action', { actionItemId });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const discardAIAction = (actionItemId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('discard_ai_action', { actionItemId });
    } else {
      setError('Not connected to retrospective server');
    }
  };

  const resetSession = () => {
    joinedRef.current = false;
    setUser(null);
    setItems([]);
    setVotes({});
    setSession(null);
    setConnectedUsers([]);
    setCurrentScheme('standard');
    setSchemeCategories([]);
    setAiActionItems([]);
  };



  return {
    connected,
    user,
    items,
    votes,
    session,
    connectedUsers,
    error,
    currentScheme,
    schemeCategories,
    aiActionItems,
    actions: {
      joinRetrospectiveSession,
      addItem,
      updateItem,
      deleteItem,
      voteItem,
      removeVote,
      changePhase,
      hasUserVoted,
      changeScheme,
      generateAIActions,
      approveAIAction,
      discardAIAction,
      resetSession,
    },
  };
};
