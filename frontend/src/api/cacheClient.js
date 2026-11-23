/**
 * In-Memory Request Deduplication and Stale-While-Revalidate Cache.
 *
 * Provides:
 * 1. Automatic in-flight request deduplication (prevents duplicate requests when components mount).
 * 2. High-performance TTL memory cache for read-only GET endpoints.
 * 3. Cache invalidation on filter change / manual user refresh.
 * 4. Zero third-party dependencies required.
 */

import { apiClient } from './client';

const memoryCache = new Map();
const inFlightRequests = new Map();

// Default TTLs in milliseconds
export const CACHE_TTL = {
  STATIC_REFERENCE: 5 * 60 * 1000, // 5 minutes for departments, sections, shifts
  ANALYTICS: 45 * 1000,            // 45 seconds for analytics & aggregated summaries
  WORKFORCE_LIST: 30 * 1000,       // 30 seconds for employee directory & pagination
};

/**
 * Deterministically serialize query parameters to canonical string key.
 */
function serializeParams(params) {
  if (!params || typeof params !== 'object') return '';
  const cleanEntries = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(cleanEntries).toString();
}

/**
 * Generate unique cache key from URL and parameters.
 */
export function buildCacheKey(url, params = {}) {
  const query = serializeParams(params);
  return query ? `${url}?${query}` : url;
}

/**
 * Inspect whether valid cached data exists synchronously.
 */
export function getCachedData(url, params = {}) {
  const key = buildCacheKey(url, params);
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Execute GET request with deduplication and in-memory caching.
 *
 * @param {string} url - API endpoint path
 * @param {object} config - Axios request config { params, signal, ... }
 * @param {object} options - { ttlMs, forceRefresh, skipCache }
 * @returns {Promise<any>}
 */
export async function cachedGet(url, config = {}, options = {}) {
  const {
    ttlMs = CACHE_TTL.ANALYTICS,
    forceRefresh = false,
    skipCache = false,
  } = options;

  const params = config.params || {};
  const cacheKey = buildCacheKey(url, params);

  // 1. If caching enabled and not forcing refresh, return valid cached data
  if (!skipCache && !forceRefresh) {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  // 2. Separate caller signal from shared request config
  // This ensures that if one caller unmounts and aborts, the shared network fetch continues
  // and populates the cache for other active/subsequent callers without poisoning them with CanceledError.
  const { signal: callerSignal, ...sharedConfig } = config;

  // 3. Initiate or reuse existing in-flight network request
  let sharedPromise = inFlightRequests.get(cacheKey);
  if (!sharedPromise) {
    sharedPromise = (async () => {
      try {
        const response = await apiClient.get(url, sharedConfig);
        const data = response.data;

        // Store in memory cache
        if (!skipCache) {
          memoryCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttlMs,
          });
        }

        return data;
      } finally {
        // Always remove from in-flight registry once settled
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, sharedPromise);
  }

  // 4. If this caller provided an AbortSignal, attach an abort listener to their individual promise
  if (callerSignal) {
    if (callerSignal.aborted) {
      const err = new Error('canceled');
      err.name = 'CanceledError';
      err.code = 'ERR_CANCELED';
      throw err;
    }

    return new Promise((resolve, reject) => {
      let settled = false;

      const onAbort = () => {
        if (settled) return;
        settled = true;
        callerSignal.removeEventListener('abort', onAbort);
        const err = new Error('canceled');
        err.name = 'CanceledError';
        err.code = 'ERR_CANCELED';
        reject(err);
      };

      callerSignal.addEventListener('abort', onAbort);

      sharedPromise
        .then((data) => {
          if (settled) return;
          settled = true;
          callerSignal.removeEventListener('abort', onAbort);
          resolve(data);
        })
        .catch((err) => {
          if (settled) return;
          settled = true;
          callerSignal.removeEventListener('abort', onAbort);
          reject(err);
        });
    });
  }

  return sharedPromise;
}

/**
 * Invalidate cache entries matching a URL prefix or pattern.
 */
export function invalidateCache(pattern = null) {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
}

