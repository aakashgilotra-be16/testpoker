/**
 * Services Index
 * Central export point for all application services
 */

// Export individual services
export { socketService, SocketService } from './socketService';
export { apiService, ApiService } from './apiService';
export { storageService, StorageService } from './storageService';

// Export service types
export type { ConnectionStatus } from './socketService';

// Service registry for dependency injection (if needed)
export const services = {
  socket: () => import('./socketService').then(m => m.socketService),
  api: () => import('./apiService').then(m => m.apiService),
  storage: () => import('./storageService').then(m => m.storageService),
} as const;

// Service health checker
export const checkServiceHealth = async (): Promise<{
  socket: boolean;
  api: boolean;
  storage: boolean;
  overall: boolean;
}> => {
  const { socketService } = await import('./socketService');
  const { apiService } = await import('./apiService');
  const { storageService } = await import('./storageService');

  const results = {
    socket: socketService.isConnected(),
    api: false,
    storage: storageService.isAvailable(),
    overall: false,
  };

  // Check API health
  try {
    const healthResponse = await apiService.healthCheck();
    results.api = healthResponse.success;
  } catch {
    results.api = false;
  }

  results.overall = results.socket && results.api && results.storage;
  
  return results;
};