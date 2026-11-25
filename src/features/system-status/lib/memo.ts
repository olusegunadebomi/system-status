/**
 * Tiny in-process TTL cache with in-flight coalescing: concurrent callers for
 * the same key share one promise, so visitor traffic never multiplies the
 * number of upstream calls. Failures are cached briefly to avoid hammering a
 * struggling backend.
 */
type Entry = { value?: unknown; error?: unknown; expiresAt: number; inflight?: Promise<unknown> };

const g = globalThis as typeof globalThis & { __golviaMemo?: Map<string, Entry> };
const store = (g.__golviaMemo ??= new Map());

export async function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>, errorTtlMs = 5000): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit?.inflight) return hit.inflight as Promise<T>;
  if (hit && now < hit.expiresAt) {
    if ("error" in hit && hit.error !== undefined) throw hit.error;
    return hit.value as T;
  }
  const inflight = fn().then(
    (value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    },
    (error) => {
      store.set(key, { error, expiresAt: Date.now() + errorTtlMs });
      throw error;
    },
  );
  store.set(key, { ...(hit ?? { expiresAt: 0 }), inflight });
  return inflight;
}
