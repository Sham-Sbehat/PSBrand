/**
 * Utility functions for caching data in localStorage/sessionStorage
 * Helps reduce API calls and improve performance
 */

const CACHE_PREFIX = 'psbrand_cache_';
const CACHE_EXPIRY_PREFIX = 'psbrand_cache_expiry_';
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes default

/**
 * Set cached data with expiration
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @param {boolean} useSessionStorage - Use sessionStorage instead of localStorage
 */
export const setCache = (key, data, ttl = DEFAULT_CACHE_TTL, useSessionStorage = false) => {
  try {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
    
    const expiryTime = Date.now() + ttl;
    
    storage.setItem(cacheKey, JSON.stringify(data));
    storage.setItem(expiryKey, expiryTime.toString());
  } catch (error) {
    // If storage is full, clear old cache entries
    if (error.name === 'QuotaExceededError') {
      clearExpiredCache();
    }
  }
};

/**
 * Get cached data if not expired
 * @param {string} key - Cache key
 * @param {boolean} useSessionStorage - Use sessionStorage instead of localStorage
 * @returns {any|null} Cached data or null if expired/not found
 */
export const getCache = (key, useSessionStorage = false) => {
  try {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
    
    const cachedData = storage.getItem(cacheKey);
    const expiryTime = storage.getItem(expiryKey);
    
    if (!cachedData || !expiryTime) {
      return null;
    }
    
    // Check if cache is expired
    if (Date.now() > parseInt(expiryTime, 10)) {
      // Remove expired cache
      storage.removeItem(cacheKey);
      storage.removeItem(expiryKey);
      return null;
    }
    
    return JSON.parse(cachedData);
  } catch (error) {
    return null;
  }
};

/**
 * Clear specific cache entry
 * @param {string} key - Cache key
 * @param {boolean} useSessionStorage - Use sessionStorage instead of localStorage
 */
export const clearCache = (key, useSessionStorage = false) => {
  try {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
    
    storage.removeItem(cacheKey);
    storage.removeItem(expiryKey);
  } catch (error) {
  }
};

/**
 * Clear all expired cache entries
 */
export const clearExpiredCache = () => {
  try {
    const storages = [localStorage, sessionStorage];
    
    storages.forEach(storage => {
      const keysToRemove = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(CACHE_EXPIRY_PREFIX)) {
          const expiryTime = parseInt(storage.getItem(key), 10);
          if (Date.now() > expiryTime) {
            // Extract the original key
            const originalKey = key.replace(CACHE_EXPIRY_PREFIX, '');
            keysToRemove.push(originalKey);
          }
        }
      }
      
      keysToRemove.forEach(originalKey => {
        clearCache(originalKey, storage === sessionStorage);
      });
    });
  } catch (error) {
  }
};

/**
 * Clear all cache entries
 */
export const clearAllCache = () => {
  try {
    const storages = [localStorage, sessionStorage];
    
    storages.forEach(storage => {
      const keysToRemove = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && (key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_PREFIX))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => storage.removeItem(key));
    });
  } catch (error) {
  }
};

/**
 * Cache keys constants
 */
export const CACHE_KEYS = {
  ORDERS: 'orders',
  ORDERS_BY_DATE: 'orders_by_date',
  CITIES: 'cities',
  AREAS: 'areas',
  EMPLOYEES: 'employees',
  CLIENTS: 'clients',
  CATEGORIES: 'categories',
  SOURCES: 'sources',
};

