// Small client-side fetch helper with:
// - in-memory cache (TTL)
// - request de-duplication
// - retry with backoff on transient errors

type CacheEntry<T = any> = { exp: number; data: T }
const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<any>>()

export async function fastFetch<T = any>(input: string, init?: RequestInit & { ttlMs?: number; retries?: number }): Promise<T> {
  const { ttlMs = 10_000, retries = 1, ...opts } = init || {}
  const key = `${opts.method || 'GET'}:${input}`
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.exp > now) return hit.data as T
  if (inflight.has(key)) return inflight.get(key) as Promise<T>

  const task = (async () => {
    let attempt = 0
    let lastErr: any
    while (attempt <= retries) {
      try {
        const r = await fetch(input, opts)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const ct = r.headers.get('content-type') || ''
        const data = ct.includes('application/json') ? await r.json() : (await r.text())
        cache.set(key, { exp: Date.now() + ttlMs, data })
        return data as T
      } catch (e) {
        lastErr = e
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
