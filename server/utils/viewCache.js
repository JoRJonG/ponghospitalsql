// Shared view cache for preventing duplicate view counting across all content types
// This prevents counting multiple views from the same IP within a time window

export const viewCache = new Map()
export const VIEW_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour cooldown

// Cleanup old cache entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  const cutoff = now - VIEW_COOLDOWN_MS
  for (const [key, timestamp] of viewCache.entries()) {
    if (timestamp < cutoff) {
      viewCache.delete(key)
    }
  }
}, 30 * 60 * 1000) // Clean up every 30 minutes