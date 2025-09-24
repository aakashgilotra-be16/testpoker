import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { socketService } from '../services/socketService';
import { storageService } from '../services/storageService';
import { SOCKET_EVENTS, RETROSPECTIVE_CATEGORIES } from '../constants';
import type { 
  RetrospectiveItem, 
  RetrospectiveSession, 
  User,
  LoadingState 
} from '../types';
import { utils } from '../utils';

// Temporary type for RetrospectiveVote until it's added to main types
type RetrospectiveVote = {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  votedAt: string;
};

export const useRetrospective = () => {
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef<boolean>(false);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<RetrospectiveItem[]>([]);
  const [votes, setVotes] = useState<Record<string, RetrospectiveVote[]>>({});
  const [session, setSession] = useState<RetrospectiveSession | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      socketRef.current.emit('join_retrospective', { displayName });
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

  const resetSession = () => {
    joinedRef.current = false;
    setUser(null);
    setItems([]);
    setVotes({});
    setSession(null);
    setConnectedUsers([]);
  };



  return {
    connected,
    user,
    items,
    votes,
    session,
    connectedUsers,
    error,
    actions: {
      joinRetrospectiveSession,
      addItem,
      updateItem,
      deleteItem,
      voteItem,
      removeVote,
      changePhase,
      hasUserVoted,
      resetSession,
    },
  };
};
