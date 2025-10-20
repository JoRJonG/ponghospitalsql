// Tiny in-memory micro-cache for GET endpoints
// Not for long-term caching; helps absorb rapid refreshes.

const store = new Map()
const MAX_ENTRIES = Number(process.env.MICROCACHE_MAX_ENTRIES || 500)
let touched = 0

function keyFrom(req) {
  const url = req.originalUrl || req.url || ''
  const vary = req.user ? 'authed' : 'anon'
  return `${vary}:${url}`
}

export function microCache(ttlMs = 10_000) {
  return function (req, res, next) {
    if (req.method !== 'GET') return next()
    const key = keyFrom(req)
    const now = Date.now()
    const hit = store.get(key)
    if (hit && hit.exp > now) {
      res.setHeader('X-Micro-Cache', 'HIT')
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
      return res.status(hit.status).type(hit.type).send(hit.body)
    }
    const originalJson = res.json.bind(res)
    const originalSend = res.send.bind(res)
    const cacheAndSend = (body, isJson) => {
      try {
        const type = isJson ? 'application/json; charset=utf-8' : (res.getHeader('Content-Type') || 'application/json')
        store.set(key, { body, exp: now + ttlMs, status: res.statusCode || 200, type, ts: Date.now() })
        res.setHeader('X-Micro-Cache', 'MISS')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
        // Occasionally sweep expired entries and cap size
        if (++touched % 50 === 0) {
          const now2 = Date.now()
          for (const [k, v] of store) {
            if (v.exp <= now2) store.delete(k)
          }
          if (store.size > MAX_ENTRIES) {
            const arr = Array.from(store.entries())
            arr.sort((a,b) => a[1].exp - b[1].exp)
            const removeCount = store.size - MAX_ENTRIES
            for (let i=0; i<removeCount; i++) store.delete(arr[i][0])
          }
        }
      } catch {}
      return isJson ? originalJson(body) : originalSend(body)
    }
    res.json = (obj) => cacheAndSend(obj, true)
    res.send = (chunk) => cacheAndSend(chunk, false)
    next()
  }
}

export function purgeCachePrefix(prefix) {
  for (const k of Array.from(store.keys())) {
    if (k.includes(prefix)) store.delete(k)
  }
}

export function purgeAllCache() {
  store.clear()
}

export default { microCache, purgeCachePrefix, purgeAllCache }
