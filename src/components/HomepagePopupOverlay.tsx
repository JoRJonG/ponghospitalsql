import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { buildApiUrl } from '../utils/api'
import { fastFetch } from '../utils/fastFetch'

const DAY_MS = 86_400_000

type DismissMap = Record<string, number>

const dismissCache: DismissMap = {}

type PopupRecord = {
  id: number
  title: string
  body: string
  startAt: string | null
  endAt: string | null
  dismissForDays: number
  isActive: boolean
  ctaLabel?: string
  ctaUrl?: string
  imageUrl?: string
  image?: {
    url: string
    mimeType?: string | null
    size?: number | null
    fileName?: string | null
  } | null
}

function loadDismissMap(): DismissMap {
  return { ...dismissCache }
}

function saveDismissMap(map: DismissMap) {
  Object.keys(dismissCache).forEach(key => {
    if (!(key in map)) {
      delete dismissCache[key]
    }
  })
  Object.entries(map).forEach(([key, value]) => {
    dismissCache[key] = value
  })
}

function useBodyLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [locked])
}

const parseLocal = (s?: string | null) => {
  if (!s) return null
  // Accept several formats: 'YYYY-MM-DDTHH:mm', 'YYYY-MM-DD HH:mm:ss', ISO
  const t = String(s).trim()
  const m1 = t.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (m1) {
    const year = Number(m1[1])
    const month = Number(m1[2]) - 1
    const day = Number(m1[3])
    const hour = Number(m1[4])
    const minute = Number(m1[5])
    const second = Number(m1[6] || 0)
    const d = new Date(year, month, day, hour, minute, second, 0)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m2 = t.match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (m2) {
    const year = Number(m2[1])
    const month = Number(m2[2]) - 1
    const day = Number(m2[3])
    const hour = Number(m2[4])
    const minute = Number(m2[5])
    const second = Number(m2[6] || 0)
    const d = new Date(year, month, day, hour, minute, second, 0)
    return Number.isNaN(d.getTime()) ? null : d
  }
  // If the string contains a timezone (Z or +hh:mm/-hh:mm) or milliseconds,
  // strip them and try to parse the plain local datetime so admin-entered
  // values that were accidentally serialized with timezone are treated
  // as wall-clock local times.
  const stripped = t.replace(/\.\d+/, '').replace(/(Z|[+-]\d{2}:?\d{2})$/, '')
  const m3 = stripped.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (m3) {
    const year = Number(m3[1])
    const month = Number(m3[2]) - 1
    const day = Number(m3[3])
    const hour = Number(m3[4])
    const minute = Number(m3[5])
    const second = Number(m3[6] || 0)
    const d = new Date(year, month, day, hour, minute, second, 0)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const parsed = new Date(t)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function HomepagePopupOverlay() {
  const location = useLocation()
  const [popup, setPopup] = useState<PopupRecord | null>(null)
  const [loading, setLoading] = useState(false)

  const shouldSuppress = useMemo(() => {
    const path = location.pathname || ''
    if (path.startsWith('/admin')) return true
    if (path.startsWith('/login')) return true
    return false
  }, [location.pathname])

  useBodyLock(Boolean(popup))

  useEffect(() => {
    if (shouldSuppress) {
      setPopup(null)
      return
    }
    let mounted = true
    let expiryTimer: ReturnType<typeof setTimeout> | null = null
    let lastFetchAt = 0
    let failureCount = 0
    let failureCooldownUntil = 0
    let forceRefreshInProgress = false
    // Poll less frequently to reduce request volume. Keep client TTL longer than poll. 

    const load = async (forceRefresh = false) => {
      setLoading(true)
      const nowTs = Date.now()
      // Respect global failure cooldown (set when server returns 429 or repeated errors)
      if (nowTs < failureCooldownUntil) return
      // simple debounce: avoid firing repeated requests in quick succession
      if (!forceRefresh && nowTs - lastFetchAt < 3000) {
        // skip this fetch
        return
      }
      // Safety: prevent forceRefresh from looping infinitely if called rapidly
      if (forceRefresh && nowTs - lastFetchAt < 2000) {
        // console.warn('[HomepagePopupOverlay] suppressing rapid forceRefresh')
        return
      }
      // If a forceRefresh is already in progress, avoid starting another
      if (forceRefresh && forceRefreshInProgress) return
      lastFetchAt = nowTs
      if (forceRefresh) forceRefreshInProgress = true
      try {
        // If forceRefresh is true, bypass client TTL and append a cache-busting
        // query param so both client cache and server micro-cache are bypassed
        let url = buildApiUrl('/api/popups/active', { preferBackend: true })
        const fetchOpts = { ttlMs: 300_000, retries: 1 } // 5 minutes TTL
        if (forceRefresh) {
          const sep = url.includes('?') ? '&' : '?'
          url = `${url}${sep}_=${Date.now()}`
          fetchOpts.ttlMs = 0
        }
        const response = await fastFetch<{ success?: boolean; data?: PopupRecord[] }>(url, fetchOpts)
        const list = Array.isArray(response)
          ? (response as unknown as PopupRecord[])
          : Array.isArray(response?.data)
            ? response.data
            : []
        // Debug: log raw list for troubleshooting
        try {
          if (console.debug) console.debug('[HomepagePopupOverlay] fetched popups', list)
        } catch { /* empty */ }
        const dismissMap = loadDismissMap()
        const now = Date.now()
        const candidate = list.find(item => {
          // Parse start/end conservatively: if a date exists but fails to parse,
          // treat it as not-started / expired to avoid showing incorrectly.
          const startDate = item.startAt ? parseLocal(item.startAt) : null
          const endDate = item.endAt ? parseLocal(item.endAt) : null
          const startOk = !item.startAt ? true : (startDate ? startDate.getTime() <= now : false)
          const endOk = !item.endAt ? true : (endDate ? endDate.getTime() >= now : false)
          if (!startOk || !endOk) return false
          const until = dismissMap[String(item.id)] || 0
          return !until || until < now
        }) || null
        const candidateWithImage = candidate && (candidate.image?.url || candidate.imageUrl ? candidate : null)
        // Debug: log candidate parsing results

        if (mounted) {
          setPopup(candidateWithImage)
          // Clear previous expiry timer
          if (expiryTimer) { clearTimeout(expiryTimer); expiryTimer = null }
          // If popup has an endAt, schedule auto-dismiss when it expires
          if (candidateWithImage && candidateWithImage.endAt) {
            const endDate = parseLocal(candidateWithImage.endAt)
            if (endDate) {
              const ms = endDate.getTime() - Date.now()
              if (ms > 0) {
                // clear previous expiryTimer then set a new one
                if (expiryTimer) { clearTimeout(expiryTimer); expiryTimer = null }
                expiryTimer = setTimeout(() => {
                  // re-run load to refresh state and bypass caches so we
                  // immediately pick up the DB change when endAt passes
                  load(true).catch(() => { })
                }, ms + 1000) // add 1s buffer
              } else {
                // already past end — hide immediately
                setPopup(null)
              }
            } else {
              // unparseable end date — hide to be safe
              setPopup(null)
            }
          }
        }
      } catch (error) {
        // detect HTTP 429 from fastFetch error message
        try {
          const msg = error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error)
          if (/HTTP\s*429/.test(msg)) {
            // set a short cooldown to avoid hammering the server
            failureCooldownUntil = Date.now() + 60_000 // 1 minute
          }
        } catch { /* empty */ }

        failureCount = Math.min(10, failureCount + 1)
        if (failureCount >= 3) {
          failureCooldownUntil = Math.max(failureCooldownUntil, Date.now() + 30_000) // extra cooldown
        }

        console.error('Failed to fetch homepage popup', error)
        if (mounted) setPopup(null)
      } finally {
        // clear the forceRefresh flag and reset loading
        forceRefreshInProgress = false
        if (mounted) setLoading(false)
      }
    }

    // initial load
    load()

    return () => {
      mounted = false

      if (expiryTimer) clearTimeout(expiryTimer)
    }
  }, [shouldSuppress])

  // Strict expiry check: ensure popup closes immediately when endAt is reached
  useEffect(() => {
    if (!popup || !popup.endAt) return

    const checkExpiry = () => {
      const endDate = parseLocal(popup.endAt)
      if (endDate && Date.now() > endDate.getTime()) {
        setPopup(null)
      }
    }

    // Check every second
    const timer = setInterval(checkExpiry, 1000)
    return () => clearInterval(timer)
  }, [popup])

  if (loading && !popup) {
    return null
  }

  if (!popup) return null

  const handleDismiss = () => {
    const dismissForDays = Number.isFinite(popup.dismissForDays) ? Math.max(0, popup.dismissForDays) : 1
    const until = dismissForDays > 0 ? Date.now() + dismissForDays * DAY_MS : Date.now()
    const map = loadDismissMap()
    map[String(popup.id)] = until
    saveDismissMap(map)
    setPopup(null)
  }

  const handleOpenCta = () => {
    if (!popup.ctaUrl) return
    window.open(popup.ctaUrl, '_blank', 'noopener,noreferrer')
    handleDismiss()
  }

  const imageSrc = (popup.image?.url || popup.imageUrl || '').trim()

  if (!imageSrc) {
    return null
  }

  const handleImageError = () => {
    setPopup(null)
  }

  const imageIsClickable = Boolean(popup.ctaUrl)

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="relative inline-flex max-h-[90vh] max-w-[90vw]">
        <button
          aria-label="ปิดป๊อปอัป"
          onClick={handleDismiss}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white shadow-lg transition hover:bg-black/80"
        >
          ✕
        </button>
        <img
          src={imageSrc}
          alt="ป๊อปอัปหน้าหลัก"
          className={`block max-h-[90vh] max-w-[90vw] rounded-3xl object-contain shadow-2xl ${imageIsClickable ? 'cursor-pointer' : ''}`}
          onClick={imageIsClickable ? handleOpenCta : undefined}
          onError={handleImageError}
        />
      </div>
    </div>
  )
}

export default HomepagePopupOverlay
