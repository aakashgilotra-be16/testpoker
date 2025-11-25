/**
 * Storage Service
 * Enterprise-level local storage management with encryption and validation
 */

import { STORAGE_KEYS } from '../constants';
import { SECURITY_CONFIG } from '../config';
import type { User, UserPreferences, Room } from '../types';

interface StorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
  compress?: boolean;
}

interface StorageEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  version: string;
}

class StorageService {
  private readonly version = '1.0.0';
  private readonly maxStorageSize = 5 * 1024 * 1024; // 5MB
  private encryptionKey?: string;

  constructor() {
    this.initializeEncryption();
    this.performMaintenance();
  }

  /**
   * Initialize encryption for sensitive data
   */
  private initializeEncryption(): void {
    // Simple encryption key generation (in production, use a more secure method)
    this.encryptionKey = this.generateEncryptionKey();
  }

  /**
   * Generate a simple encryption key
   */
  private generateEncryptionKey(): string {
    return btoa(navigator.userAgent + Date.now()).slice(0, 32);
  }

  /**
   * Simple encryption (in production, use Web Crypto API)
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) return data;
    
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }
    return btoa(encrypted);
  }

  /**
   * Simple decryption
   */
  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) return encryptedData;
    
    try {
      const data = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < data.length; i++) {
        decrypted += String.fromCharCode(
          data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return decrypted;
    } catch {
      return encryptedData; // Return as-is if decryption fails
    }
  }

  /**
   * Check if localStorage is available
   */
  public isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current storage usage
   */
  public getStorageUsage(): { used: number; available: number; percentage: number } {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    const available = this.maxStorageSize - used;
    const percentage = (used / this.maxStorageSize) * 100;
    
    return { used, available, percentage };
  }

  /**
   * Generic set method with options
   */
  public set<T>(key: string, value: T, options?: StorageOptions): boolean {
    if (!this.isAvailable()) return false;

    try {
      const entry: StorageEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: options?.ttl,
        version: this.version,
      };

      let serialized = JSON.stringify(entry);
      
      if (options?.encrypt) {
        serialized = this.encrypt(serialized);
      }

      // Check storage limits
      const usage = this.getStorageUsage();
      if (usage.used + serialized.length > this.maxStorageSize) {
        this.cleanup();
      }

      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  /**
   * Generic get method with validation
   */
  public get<T>(key: string, defaultValue?: T, options?: { decrypt?: boolean }): T | null {
    if (!this.isAvailable()) return defaultValue ?? null;

    try {
      let item = localStorage.getItem(key);
      if (!item) return defaultValue ?? null;

      if (options?.decrypt) {
        item = this.decrypt(item);
      }

      const entry: StorageEntry<T> = JSON.parse(item);
      
      // Check version compatibility
      if (entry.version !== this.version) {
        this.remove(key);
        return defaultValue ?? null;
      }

      // Check TTL
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.remove(key);
        return defaultValue ?? null;
      }

      return entry.data;
    } catch (error) {
      console.error('Storage get error:', error);
      this.remove(key); // Remove corrupted data
      return defaultValue ?? null;
    }
  }

  /**
   * Remove item from storage
   */
  public remove(key: string): void {
    if (this.isAvailable()) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Clear all app-related storage
   */
  public clear(): void {
    if (!this.isAvailable()) return;
    
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * User-specific storage methods
   */
  public setUser(user: User): boolean {
    return this.set(STORAGE_KEYS.USER_NAME, user, { encrypt: true });
  }

  public getUser(): User | null {
    return this.get<User>(STORAGE_KEYS.USER_NAME, undefined, { decrypt: true });
  }

  public setUserPreferences(preferences: UserPreferences): boolean {
    return this.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  public getUserPreferences(): UserPreferences | null {
    return this.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {
      theme: 'light' as 'light' | 'dark' | 'auto',
      votingScale: ['1', '2', '3', '5', '8', '13', '21', '?'],
      autoRevealVotes: false,
      soundEnabled: true,
      notifications: {
        joinLeave: true,
        votingEvents: true,
        storyUpdates: true,
        retrospectiveUpdates: true,
      },
    });
  }

  /**
   * Theme management
   */
  public setTheme(theme: string): boolean {
    return this.set(STORAGE_KEYS.THEME_PREFERENCE, theme);
  }

  public getTheme(): string {
    return this.get<string>(STORAGE_KEYS.THEME_PREFERENCE, 'light') || 'light';
  }

  /**
   * Recent rooms management
   */
  public addRecentRoom(room: Room): boolean {
    const recentRooms = this.getRecentRooms();
    
    // Remove existing room if it exists
    const filtered = recentRooms.filter(r => r.id !== room.id);
    
    // Add to beginning
    filtered.unshift(room);
    
    // Keep only last 10 rooms
    const limited = filtered.slice(0, 10);
    
    return this.set(STORAGE_KEYS.RECENT_ROOMS, limited);
  }

  public getRecentRooms(): Room[] {
    return this.get<Room[]>(STORAGE_KEYS.RECENT_ROOMS, []) || [];
  }

  public removeRecentRoom(roomId: string): boolean {
    const recentRooms = this.getRecentRooms();
    const filtered = recentRooms.filter(r => r.id !== roomId);
    return this.set(STORAGE_KEYS.RECENT_ROOMS, filtered);
  }

  /**
   * Session management
   */
  public setSessionData(key: string, data: any, ttl?: number): boolean {
    const sessionKey = `session_${key}`;
    return this.set(sessionKey, data, { ttl: ttl || SECURITY_CONFIG.SESSION_TIMEOUT });
  }

  public getSessionData<T>(key: string): T | null {
    const sessionKey = `session_${key}`;
    return this.get<T>(sessionKey);
  }

  public clearSessionData(key?: string): void {
    if (key) {
      this.remove(`session_${key}`);
    } else {
      // Clear all session data
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('session_')) {
          localStorage.removeItem(key);
        }
      }
    }
  }

  /**
   * Export/Import functionality
   */
  public exportData(): Record<string, any> {
    const data: Record<string, any> = {};
    
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const value = this.get(key);
      if (value !== null) {
        data[name] = value;
      }
    });
    
    return data;
  }

  public importData(data: Record<string, any>): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;
    
    Object.entries(data).forEach(([name, value]) => {
      try {
        const key = STORAGE_KEYS[name as keyof typeof STORAGE_KEYS];
        if (key && this.set(key, value)) {
          imported++;
        } else {
          errors.push(`Failed to import ${name}`);
        }
      } catch (error) {
        errors.push(`Error importing ${name}: ${(error as Error).message}`);
      }
    });
    
    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  }

  /**
   * Maintenance and cleanup
   */
  public cleanup(): void {
    if (!this.isAvailable()) return;
    
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const item = localStorage.getItem(key);
        if (!item) continue;
        
        const entry = JSON.parse(item);
        
        // Remove expired items
        if (entry.ttl && now - entry.timestamp > entry.ttl) {
          keysToRemove.push(key);
        }
        
        // Remove old version items
        if (entry.version && entry.version !== this.version) {
          keysToRemove.push(key);
        }
      } catch {
        // Remove corrupted items
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  private performMaintenance(): void {
    // Run cleanup on initialization
    this.cleanup();
    
    // Schedule periodic cleanup
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Storage event handling for cross-tab synchronization
   */
  public onStorageChange(callback: (key: string, newValue: any, oldValue: any) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key && event.storageArea === localStorage) {
        try {
          const oldValue = event.oldValue ? JSON.parse(event.oldValue) : null;
          const newValue = event.newValue ? JSON.parse(event.newValue) : null;
          callback(event.key, newValue, oldValue);
        } catch {
          // Ignore parsing errors
        }
      }
    };
    
    window.addEventListener('storage', handler);
    
    return () => window.removeEventListener('storage', handler);
  }

  /**
   * Storage statistics
   */
  public getStatistics(): {
    totalItems: number;
    totalSize: number;
    appItems: number;
    sessionItems: number;
    expiredItems: number;
  } {
    let totalItems = 0;
    let totalSize = 0;
    let appItems = 0;
    let sessionItems = 0;
    let expiredItems = 0;
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      const value = localStorage.getItem(key);
      if (!value) continue;
      
      totalItems++;
      totalSize += key.length + value.length;
      
      if (Object.values(STORAGE_KEYS).includes(key as any)) {
        appItems++;
      }
      
      if (key.startsWith('session_')) {
        sessionItems++;
      }
      
      try {
        const entry = JSON.parse(value);
        if (entry.ttl && now - entry.timestamp > entry.ttl) {
          expiredItems++;
        }
      } catch {
        // Not a structured entry
      }
    }
    
    return {
      totalItems,
      totalSize,
      appItems,
      sessionItems,
      expiredItems,
    };
  }
}

// Create singleton instance
export const storageService = new StorageService();

// Export class for testing or custom instances
export { StorageService };