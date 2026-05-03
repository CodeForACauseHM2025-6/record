// Process-local TTL cache for decrypted page payloads. Plaintext sits in process memory only —
// never on disk, never in Redis, never anywhere we'd have to encrypt-at-rest separately. Cleared
// by dashboard mutations that affect the homepage (publish/unpublish/layout edits/article changes).
//
// Why this exists: the homepage fans out to ~30 KMS Decrypt calls per cold render (one per
// encrypted row). Without this cache, every visitor pays that cost. With it, the first visitor
// after any publish event pays it; everyone else for the next TTL window gets free reads.

type Entry<T> = { data: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60_000; // 5 minutes

function evictExpired() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expiresAt <= now) store.delete(k);
  }
}

// Get-or-fetch: returns the cached value if fresh, otherwise calls `loader()` and caches the result.
// Concurrent callers for the same key while a load is in flight all share the same promise so we
// don't trigger multiple parallel decryptions for the same page.
const inflight = new Map<string, Promise<unknown>>();

export async function getOrLoad<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  evictExpired();
  const hit = store.get(key);
  if (hit) return hit.data as T;

  const flight = inflight.get(key);
  if (flight) return flight as Promise<T>;

  const p = loader()
    .then((data) => {
      store.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, p);
  return p;
}

// Targeted invalidation. Pass a prefix to clear all keys that start with it (e.g. "homepage:" to
// drop every homepage-page entry on a single publish action).
export function invalidate(keyOrPrefix: string, prefix = false): void {
  if (!prefix) {
    store.delete(keyOrPrefix);
    return;
  }
  for (const k of store.keys()) {
    if (k.startsWith(keyOrPrefix)) store.delete(k);
  }
}

export function clearAll(): void {
  store.clear();
}

// Test-only hook for inspecting the cache shape.
export function _size(): number {
  return store.size;
}

// Convenience: invalidate every page-cache entry whose key starts with "homepage:". Use this
// from any dashboard mutation that already calls revalidatePath("/") so the in-memory cache
// stays consistent with Next's render cache.
export function invalidateHomepage(): void {
  invalidate("homepage:", true);
}
