/**
 * API Service
 * Enterprise-level HTTP client with retry logic, caching, and error handling
 */

import { API_CONFIG, SECURITY_CONFIG } from '../config';
import type { ApiResponse, ApiError, Room, Story, User, ExportData } from '../types';

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiService {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.defaultTimeout = API_CONFIG.TIMEOUT;
    this.defaultRetries = API_CONFIG.RETRY_ATTEMPTS;
  }

  /**
   * Generic HTTP request method
   */
  private async request<T>(endpoint: string, config: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${config.method}:${url}:${JSON.stringify(config.body || {})}`;
    
    // Check cache for GET requests
    if (config.method === 'GET' && config.cache !== false) {
      const cached = this.getCachedResponse<T>(cacheKey);
      if (cached) return cached;
    }

    // Check if same request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    const requestPromise = this.executeRequest<T>(url, config);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;
      
      // Cache successful GET responses
      if (config.method === 'GET' && response.success && config.cache !== false) {
        this.setCachedResponse(cacheKey, response);
      }

      return response;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T>(url: string, config: RequestConfig): Promise<ApiResponse<T>> {
    const retries = config.retries ?? this.defaultRetries;
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.timeout ?? this.defaultTimeout);

        const response = await fetch(url, {
          method: config.method,
          headers: {
            'Content-Type': 'application/json',
            ...config.headers,
          },
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          success: true,
          data: data as T,
          metadata: {
            processingTime: parseInt(response.headers.get('x-processing-time') || '0'),
          },
        };

      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retries) break;
        
        // Exponential backoff
        const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: lastError.message,
        details: lastError,
        timestamp: new Date(),
      } as ApiError,
    };
  }

  /**
   * Cache management methods
   */
  private getCachedResponse<T>(key: string): ApiResponse<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCachedResponse<T>(key: string, response: ApiResponse<T>, ttl?: number): void {
    const entry: CacheEntry<ApiResponse<T>> = {
      data: response,
      timestamp: Date.now(),
      ttl: ttl ?? 5 * 60 * 1000, // 5 minutes default
    };
    
    this.cache.set(key, entry);
    
    // Cleanup old entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Public HTTP methods
   */
  public async get<T>(endpoint: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', ...config });
  }

  public async post<T>(endpoint: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: data, ...config });
  }

  public async put<T>(endpoint: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body: data, ...config });
  }

  public async patch<T>(endpoint: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body: data, ...config });
  }

  public async delete<T>(endpoint: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', ...config });
  }

  /**
   * Room API methods
   */
  public async createRoom(roomData: Partial<Room>): Promise<ApiResponse<Room>> {
    return this.post<Room>('/api/rooms', roomData);
  }

  public async getRoom(roomId: string): Promise<ApiResponse<Room>> {
    return this.get<Room>(`/api/rooms/${roomId}`);
  }

  public async getRoomByCode(roomCode: string): Promise<ApiResponse<Room>> {
    return this.get<Room>(`/api/rooms/code/${roomCode}`);
  }

  public async updateRoom(roomId: string, updates: Partial<Room>): Promise<ApiResponse<Room>> {
    return this.put<Room>(`/api/rooms/${roomId}`, updates);
  }

  public async deleteRoom(roomId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/rooms/${roomId}`);
  }

  /**
   * Story API methods
   */
  public async getStories(roomId: string): Promise<ApiResponse<Story[]>> {
    return this.get<Story[]>(`/api/rooms/${roomId}/stories`);
  }

  public async createStory(roomId: string, storyData: Partial<Story>): Promise<ApiResponse<Story>> {
    return this.post<Story>(`/api/rooms/${roomId}/stories`, storyData);
  }

  public async updateStory(roomId: string, storyId: string, updates: Partial<Story>): Promise<ApiResponse<Story>> {
    return this.put<Story>(`/api/rooms/${roomId}/stories/${storyId}`, updates);
  }

  public async deleteStory(roomId: string, storyId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/rooms/${roomId}/stories/${storyId}`);
  }

  /**
   * User API methods
   */
  public async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.get<User>('/api/users/me');
  }

  public async updateUserProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    return this.patch<User>('/api/users/me', updates);
  }

  /**
   * Export/Import API methods
   */
  public async exportRoom(roomId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<ApiResponse<ExportData>> {
    return this.post<ExportData>(`/api/rooms/${roomId}/export`, { format });
  }

  public async importStories(roomId: string, stories: Story[]): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
    return this.post<{ imported: number; errors: string[] }>(`/api/rooms/${roomId}/import`, { stories });
  }

  /**
   * Analytics API methods
   */
  public async getRoomAnalytics(roomId: string, dateRange?: { start: Date; end: Date }): Promise<ApiResponse<any>> {
    const params = dateRange ? `?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}` : '';
    return this.get<any>(`/api/rooms/${roomId}/analytics${params}`);
  }

  public async trackEvent(event: string, properties?: Record<string, any>): Promise<ApiResponse<void>> {
    return this.post<void>('/api/analytics/events', { event, properties, timestamp: new Date() });
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<ApiResponse<{ status: string; uptime: number }>> {
    return this.get<{ status: string; uptime: number }>('/api/health');
  }

  /**
   * File upload
   */
  public async uploadFile(file: File, roomId?: string): Promise<ApiResponse<{ url: string; id: string }>> {
    // Validate file
    if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
      return {
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds ${SECURITY_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit`,
          timestamp: new Date(),
        } as ApiError,
      };
    }

    if (!SECURITY_CONFIG.ALLOWED_FILE_TYPES.includes(file.type as any)) {
      return {
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `File type ${file.type} is not allowed`,
          timestamp: new Date(),
        } as ApiError,
      };
    }

    const formData = new FormData();
    formData.append('file', file);
    if (roomId) formData.append('roomId', roomId);

    try {
      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: (error as Error).message,
          timestamp: new Date(),
        } as ApiError,
      };
    }
  }

  /**
   * Utility methods
   */
  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public setBaseURL(url: string): void {
    this.baseURL = url;
  }

  public getBaseURL(): string {
    return this.baseURL;
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export class for testing or custom instances
export { ApiService };