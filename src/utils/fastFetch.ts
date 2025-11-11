// Small client-side fetch helper with:
// - in-memory cache (TTL)
// - request de-duplication
// - retry with backoff on transient errors

type CacheEntry<T> = { exp: number; data: T }
const cache = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

type FastFetchInit = RequestInit & { ttlMs?: number; retries?: number }

export async function fastFetch<T>(input: string, init?: FastFetchInit): Promise<T> {
  const { ttlMs = 10_000, retries = 1, ...opts } = init || {}
  const key = `${opts.method || 'GET'}:${input}`
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.exp > now) return hit.data as T
  if (inflight.has(key)) return inflight.get(key) as Promise<T>

  const task: Promise<T> = (async () => {
    let attempt = 0
    let lastErr: unknown
    while (attempt <= retries) {
      try {
        const r = await fetch(input, opts)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const ct = r.headers.get('content-type') || ''
        const data = ct.includes('application/json') ? await r.json() : await r.text()
        cache.set(key, { exp: Date.now() + ttlMs, data })
        return data as T
      } catch (error) {
        lastErr = error
        if (attempt === retries) break
        await new Promise(res => setTimeout(res, 200 * Math.pow(2, attempt)))
      }
      attempt++
    }
    throw lastErr
  })()

  inflight.set(key, task)
  try {
    return await task
  } finally {
    inflight.delete(key)
  }
}

export function invalidateCache(prefix: string) {
  for (const k of Array.from(cache.keys())) {
    if (k.includes(prefix)) cache.delete(k)
  }
}
