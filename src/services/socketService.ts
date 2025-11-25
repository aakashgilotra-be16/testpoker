/**
 * Socket Service
 * Enterprise-level WebSocket management with connection handling and event management
 */

import { io, Socket } from 'socket.io-client';
import { API_CONFIG, FEATURE_FLAGS, PERFORMANCE_CONFIG } from '../config';
import { SOCKET_EVENTS } from '../constants';
import type { 
  Story, 
  VotingSession, 
  RetrospectiveItem,
  SocketResponse,
  RoomJoinData,
  RoomJoinResponse 
} from '../types';

export type SocketEventHandler<T = any> = (data: T) => void;
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';

interface SocketServiceConfig {
  url: string;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  timeout: number;
  heartbeatInterval: number;
}

class SocketService {
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<SocketEventHandler>> = new Map();
  private config: SocketServiceConfig;

  constructor(config?: Partial<SocketServiceConfig>) {
    this.config = {
      url: API_CONFIG.SOCKET_URL,
      reconnectionAttempts: PERFORMANCE_CONFIG.SOCKET_RECONNECT_ATTEMPTS,
      reconnectionDelay: PERFORMANCE_CONFIG.SOCKET_RECONNECT_DELAY,
      timeout: API_CONFIG.TIMEOUT,
      heartbeatInterval: PERFORMANCE_CONFIG.HEARTBEAT_INTERVAL,
      ...config,
    };
  }

  /**
   * Initialize socket connection
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionStatus = 'connecting';
        
        this.socket = io(this.config.url, {
          timeout: this.config.timeout,
          reconnection: true,
          reconnectionAttempts: this.config.reconnectionAttempts,
          reconnectionDelay: this.config.reconnectionDelay,
          forceNew: true,
        });

        this.setupEventHandlers();
        
        this.socket.on('connect', () => {
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyListeners('connectionStatusChanged', this.connectionStatus);
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          this.connectionStatus = 'error';
          this.notifyListeners('connectionStatusChanged', this.connectionStatus);
          reject(error);
        });

      } catch (error) {
        this.connectionStatus = 'error';
        this.notifyListeners('connectionStatusChanged', this.connectionStatus);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from socket
   */
  public disconnect(): void {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = 'disconnected';
      this.notifyListeners('connectionStatusChanged', this.connectionStatus);
    }
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Emit event to server
   */
  public emit<T = any>(event: string, data?: T): Promise<SocketResponse<any>> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected()) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(event, data, (response: SocketResponse<any>) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Socket operation failed'));
        }
      });
    });
  }

  /**
   * Add event listener
   */
  public on<T = any>(event: string, handler: SocketEventHandler<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(handler);
    
    // Add socket listener if this is the first handler for this event
    if (this.eventListeners.get(event)!.size === 1 && this.socket) {
      this.socket.on(event, (data: T) => this.notifyListeners(event, data));
    }

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Remove event listener
   */
  public off(event: string, handler?: SocketEventHandler): void {
    const handlers = this.eventListeners.get(event);
    if (!handlers) return;

    if (handler) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventListeners.delete(event);
        this.socket?.off(event);
      }
    } else {
      // Remove all handlers for this event
      this.eventListeners.delete(event);
      this.socket?.off(event);
    }
  }

  /**
   * Room Management Methods
   */
  public async joinRoom(data: RoomJoinData): Promise<RoomJoinResponse> {
    const response = await this.emit<RoomJoinData>(SOCKET_EVENTS.JOIN_ROOM, data);
    return response as RoomJoinResponse;
  }

  public async leaveRoom(): Promise<void> {
    await this.emit(SOCKET_EVENTS.LEAVE_ROOM);
  }

  /**
   * Planning Poker Methods
   */
  public async addStory(story: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>): Promise<Story> {
    const response = await this.emit('add-story', story);
    return response.data as Story;
  }

  public async updateStory(storyId: string, updates: Partial<Story>): Promise<Story> {
    const response = await this.emit('update-story', { storyId, updates });
    return response.data as Story;
  }

  public async deleteStory(storyId: string): Promise<void> {
    await this.emit('delete-story', { storyId });
  }

  public async startVoting(storyId: string): Promise<VotingSession> {
    const response = await this.emit('start-voting', { storyId });
    return response.data as VotingSession;
  }

  public async castVote(storyId: string, value: string): Promise<void> {
    await this.emit('cast-vote', { storyId, value });
  }

  public async revealVotes(sessionId: string): Promise<void> {
    await this.emit('reveal-votes', { sessionId });
  }

  public async endVoting(sessionId: string): Promise<void> {
    await this.emit('end-voting', { sessionId });
  }

  /**
   * Retrospective Methods
   */
  public async addRetrospectiveItem(item: Omit<RetrospectiveItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<RetrospectiveItem> {
    const response = await this.emit('add-retrospective-item', item);
    return response.data as RetrospectiveItem;
  }

  public async updateRetrospectiveItem(itemId: string, updates: Partial<RetrospectiveItem>): Promise<RetrospectiveItem> {
    const response = await this.emit('update-retrospective-item', { itemId, updates });
    return response.data as RetrospectiveItem;
  }

  public async deleteRetrospectiveItem(itemId: string): Promise<void> {
    await this.emit('delete-retrospective-item', { itemId });
  }

  public async voteOnRetrospectiveItem(itemId: string): Promise<void> {
    await this.emit('vote-retrospective-item', { itemId });
  }

  /**
   * Utility Methods
   */
  public async ping(): Promise<number> {
    const start = Date.now();
    await this.emit('ping');
    return Date.now() - start;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Private Methods
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason) => {
      this.connectionStatus = 'disconnected';
      this.stopHeartbeat();
      this.notifyListeners('connectionStatusChanged', this.connectionStatus);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.handleReconnection();
      }
    });

    this.socket.on('reconnect', () => {
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.notifyListeners('connectionStatusChanged', this.connectionStatus);
    });

    this.socket.on('reconnecting', () => {
      this.connectionStatus = 'reconnecting';
      this.reconnectAttempts++;
      this.notifyListeners('connectionStatusChanged', this.connectionStatus);
    });

    this.socket.on('reconnect_failed', () => {
      this.connectionStatus = 'error';
      this.notifyListeners('connectionStatusChanged', this.connectionStatus);
    });

    // Setup error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.notifyListeners('error', error);
    });
  }

  private startHeartbeat(): void {
    if (!FEATURE_FLAGS.ENABLE_REAL_TIME_SYNC) return;
    
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.ping().catch(() => {
          // Heartbeat failed, connection might be lost
          console.warn('Heartbeat failed');
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.config.reconnectionAttempts) {
      setTimeout(() => {
        if (this.socket && !this.isConnected()) {
          this.socket.connect();
        }
      }, this.config.reconnectionDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  private notifyListeners<T>(event: string, data: T): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopHeartbeat();
    this.eventListeners.clear();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatus = 'disconnected';
  }
}

// Create singleton instance
export const socketService = new SocketService();

// Export class for testing or custom instances
export { SocketService };

// Export connection status type for use in components