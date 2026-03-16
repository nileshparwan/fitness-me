interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    if (now - entry.lastRefill > windowMs * 2) {
      store.delete(key);
    }
  }
}

/**
 * Token-bucket rate limiter with in-memory store.
 * Returns { success: boolean, remaining: number }.
 */
export function rateLimit(
  key: string,
  maxTokens: number,
  windowMs: number
): { success: boolean; remaining: number } {
  cleanup(windowMs);

  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { tokens: maxTokens - 1, lastRefill: now });
    return { success: true, remaining: maxTokens - 1 };
  }

  const elapsed = now - entry.lastRefill;
  const refillRate = maxTokens / windowMs;
  const refilled = Math.min(maxTokens, entry.tokens + elapsed * refillRate);

  if (refilled < 1) {
    return { success: false, remaining: 0 };
  }

  entry.tokens = refilled - 1;
  entry.lastRefill = now;
  return { success: true, remaining: Math.floor(entry.tokens) };
}
