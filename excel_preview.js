/**
 * excelCache.js
 * sessionStorage-based cache for Excel/PDF processing results.
 * Cache lives for the browser tab's lifetime and is cleared on tab close.
 */

const CACHE_PREFIX = 'ceramic_cache_';

/**
 * Build a stable cache key from one or more file descriptors + optional extras.
 * @param  {...(File|string|number)} parts
 */
export function buildCacheKey(...parts) {
  const segments = parts.map((p) => {
    if (p instanceof File) return `${p.name}:${p.size}`;
    return String(p ?? '');
  });
  return CACHE_PREFIX + segments.join('|');
}

/** Store a value under key. Value must be JSON-serialisable. */
export function cacheSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch (e) {
    console.warn('excelCache: write failed', e);
  }
}

/** Retrieve a cached value, or null on miss. */
export function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).value;
  } catch {
    return null;
  }
}

/** Delete a single cache entry. */
export function cacheDel(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

/** Wipe every entry written by this app. */
export function cacheClear() {
  try {
    const keysToRemove = Object.keys(sessionStorage).filter((k) =>
      k.startsWith(CACHE_PREFIX)
    );
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

/** Number of entries currently cached. */
export function cacheSize() {
  try {
    return Object.keys(sessionStorage).filter((k) =>
      k.startsWith(CACHE_PREFIX)
    ).length;
  } catch {
    return 0;
  }
}
