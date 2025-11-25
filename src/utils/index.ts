/**
 * Utility Functions
 * Enterprise-level utility library with comprehensive functionality
 */

import { STORAGE_KEYS, APP_CONFIG } from '../constants';
import type { ValidationRule, ValidationResult, SortConfig } from '../types';

// String Utilities
export const string = {
  /**
   * Generates a random alphanumeric string of specified length
   */
  generateId: (length: number = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  },

  /**
   * Generates a room code with specified format
   */
  generateRoomCode: (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: APP_CONFIG.ROOM_CODE_LENGTH }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  },

  /**
   * Capitalizes the first letter of each word
   */
  toTitleCase: (str: string): string => {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  /**
   * Truncates text with ellipsis
   */
  truncate: (str: string, maxLength: number, suffix: string = '...'): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Slugifies a string for URL-safe usage
   */
  slugify: (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  /**
   * Validates room code format
   */
  isValidRoomCode: (code: string): boolean => {
    const regex = new RegExp(`^[A-Z0-9]{${APP_CONFIG.ROOM_CODE_LENGTH}}$`);
    return regex.test(code);
  },

  /**
   * Sanitizes HTML content
   */
  sanitize: (html: string): string => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },

  /**
   * Extracts initials from a name
   */
  getInitials: (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },
};

// Array Utilities
export const array = {
  /**
   * Removes duplicates from array based on key function
   */
  uniqueBy: <T>(arr: T[], keyFn: (item: T) => any): T[] => {
    const seen = new Set();
    return arr.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  /**
   * Groups array items by key function
   */
  groupBy: <T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> => {
    return arr.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * Sorts array by multiple criteria
   */
  sortBy: <T>(arr: T[], ...sortConfigs: SortConfig<keyof T>[]): T[] => {
    return [...arr].sort((a, b) => {
      for (const config of sortConfigs) {
        const aVal = a[config.field];
        const bVal = b[config.field];
        
        if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  },

  /**
   * Shuffles array in place
   */
  shuffle: <T>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  /**
   * Chunks array into smaller arrays
   */
  chunk: <T>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Finds differences between two arrays
   */
  diff: <T>(arr1: T[], arr2: T[], keyFn?: (item: T) => any): { added: T[], removed: T[], common: T[] } => {
    const getKey = keyFn || ((item: T) => item);
    const set1 = new Set(arr1.map(getKey));
    const set2 = new Set(arr2.map(getKey));
    
    return {
      added: arr2.filter(item => !set1.has(getKey(item))),
      removed: arr1.filter(item => !set2.has(getKey(item))),
      common: arr1.filter(item => set2.has(getKey(item))),
    };
  },
};

// Object Utilities
export const object = {
  /**
   * Deep clones an object
   */
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => object.deepClone(item)) as any;
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = object.deepClone(obj[key]);
      }
    }
    return cloned;
  },

  /**
   * Merges objects deeply
   */
  deepMerge: <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T => {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (object.isObject(target) && object.isObject(source)) {
      for (const key in source) {
        if (object.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          object.deepMerge(target[key], source[key] as any);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    
    return object.deepMerge(target, ...sources);
  },

  /**
   * Checks if value is a plain object
   */
  isObject: (obj: any): obj is Record<string, any> => {
    return obj !== null && typeof obj === 'object' && obj.constructor === Object;
  },

  /**
   * Gets nested property value safely
   */
  get: <T>(obj: any, path: string, defaultValue?: T): T => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return defaultValue as T;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : defaultValue as T;
  },

  /**
   * Sets nested property value
   */
  set: (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;
    
    for (const key of keys) {
      if (!(key in current) || !object.isObject(current[key])) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
  },

  /**
   * Omits keys from object
   */
  omit: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  },

  /**
   * Picks keys from object
   */
  pick: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },
};

// Date Utilities
export const date = {
  /**
   * Formats date to readable string
   */
  format: (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    }).format(date);
  },

  /**
   * Gets relative time string
   */
  getRelativeTime: (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  },

  /**
   * Checks if date is today
   */
  isToday: (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  },

  /**
   * Adds time to date
   */
  addTime: (date: Date, amount: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): Date => {
    const result = new Date(date);
    const multipliers = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
    result.setTime(result.getTime() + amount * multipliers[unit]);
    return result;
  },

  /**
   * Gets time difference in specified unit
   */
  diff: (date1: Date, date2: Date, unit: 'seconds' | 'minutes' | 'hours' | 'days'): number => {
    const diff = Math.abs(date1.getTime() - date2.getTime());
    const divisors = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
    return Math.floor(diff / divisors[unit]);
  },
};

// Local Storage Utilities
export const storage = {
  /**
   * Safely gets item from localStorage with JSON parsing
   */
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch {
      return defaultValue ?? null;
    }
  },

  /**
   * Safely sets item in localStorage with JSON serialization
   */
  set: <T>(key: string, value: T): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Removes item from localStorage
   */
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },

  /**
   * Clears all app-related items from localStorage
   */
  clear: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },

  /**
   * Checks if localStorage is available
   */
  isAvailable: (): boolean => {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
};

// Validation Utilities
export const validation = {
  /**
   * Validates value against rules
   */
  validate: <T>(value: T, rules: ValidationRule<T>): string | null => {
    if (rules.required && (value == null || value === '')) {
      return rules.message || 'This field is required';
    }

    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        return rules.message || `Minimum length is ${rules.minLength}`;
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return rules.message || `Maximum length is ${rules.maxLength}`;
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        return rules.message || 'Invalid format';
      }
    }

    if (rules.custom) {
      const result = rules.custom(value);
      if (typeof result === 'string') return result;
      if (!result) return rules.message || 'Invalid value';
    }

    return null;
  },

  /**
   * Validates object against schema
   */
  validateObject: <T extends Record<string, any>>(
    obj: T,
    schema: Record<keyof T, ValidationRule>
  ): ValidationResult => {
    const errors: Record<string, string> = {};
    
    for (const [key, rules] of Object.entries(schema)) {
      const error = validation.validate(obj[key], rules);
      if (error) errors[key] = error;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Common validation patterns
   */
  patterns: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/,
    phone: /^\+?[\d\s\-\(\)]+$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    roomCode: new RegExp(`^[A-Z0-9]{${APP_CONFIG.ROOM_CODE_LENGTH}}$`),
  },
};

// Performance Utilities
export const performance = {
  /**
   * Debounces function calls
   */
  debounce: <T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  /**
   * Throttles function calls
   */
  throttle: <T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  },

  /**
   * Creates a memoized version of a function
   */
  memoize: <T extends (...args: any[]) => any>(func: T): T => {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  /**
   * Measures function execution time
   */
  measure: <T>(name: string, func: () => T): T => {
    const start = Date.now();
    const result = func();
    const end = Date.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  },
};

// Math Utilities
export const math = {
  /**
   * Calculates statistical measures for voting
   */
  calculateStats: (values: number[]): {
    mean: number;
    median: number;
    mode: number;
    variance: number;
    standardDeviation: number;
  } => {
    if (values.length === 0) {
      return { mean: 0, median: 0, mode: 0, variance: 0, standardDeviation: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // Calculate mode
    const frequency: Record<number, number> = {};
    values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
    const mode = Number(Object.keys(frequency).reduce((a, b) => 
      frequency[Number(a)] > frequency[Number(b)] ? a : b
    ));

    // Calculate variance and standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return { mean, median, mode, variance, standardDeviation };
  },

  /**
   * Rounds number to specified decimal places
   */
  round: (num: number, decimals: number = 2): number => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  /**
   * Clamps number between min and max
   */
  clamp: (num: number, min: number, max: number): number => {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Maps value from one range to another
   */
  map: (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  },

  /**
   * Generates random number between min and max
   */
  random: (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  },

  /**
   * Generates random integer between min and max (inclusive)
   */
  randomInt: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
};

// DOM Utilities
export const dom = {
  /**
   * Safely queries DOM element
   */
  query: <T extends Element>(selector: string, parent?: Document | Element): T | null => {
    return (parent || document).querySelector<T>(selector);
  },

  /**
   * Safely queries multiple DOM elements
   */
  queryAll: <T extends Element>(selector: string, parent?: Document | Element): T[] => {
    return Array.from((parent || document).querySelectorAll<T>(selector));
  },

  /**
   * Adds event listener with automatic cleanup
   */
  on: <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): () => void => {
    element.addEventListener(event, handler, options);
    return () => element.removeEventListener(event, handler);
  },

  /**
   * Checks if element is visible in viewport
   */
  isInViewport: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Scrolls element into view smoothly
   */
  scrollIntoView: (element: HTMLElement, options?: ScrollIntoViewOptions): void => {
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest', ...options });
  },

  /**
   * Copies text to clipboard
   */
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  },
};

// URL Utilities
export const url = {
  /**
   * Gets current URL parameters
   */
  getParams: (): URLSearchParams => {
    return new URLSearchParams(window.location.search);
  },

  /**
   * Gets specific URL parameter
   */
  getParam: (name: string): string | null => {
    return url.getParams().get(name);
  },

  /**
   * Sets URL parameter without page reload
   */
  setParam: (name: string, value: string): void => {
    const params = url.getParams();
    params.set(name, value);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  },

  /**
   * Removes URL parameter without page reload
   */
  removeParam: (name: string): void => {
    const params = url.getParams();
    params.delete(name);
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  },

  /**
   * Builds URL with parameters
   */
  build: (base: string, params: Record<string, string>): string => {
    const url = new URL(base, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  },
};

// Export all utilities
export const utils = {
  string,
  array,
  object,
  date,
  storage,
  validation,
  performance,
  math,
  dom,
  url,
};

// Default export
export default utils;