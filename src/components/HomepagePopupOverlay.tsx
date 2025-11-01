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
    const load = async () => {
      setLoading(true)
      try {
        const response = await fastFetch<{ success?: boolean; data?: PopupRecord[] }>(buildApiUrl('/api/popups/active'), {
          ttlMs: 30_000,
          retries: 1,
        })
        const list = Array.isArray(response)
          ? (response as unknown as PopupRecord[])
          : Array.isArray(response?.data)
            ? response.data
            : []
        const dismissMap = loadDismissMap()
        const now = Date.now()
        const candidate = list.find(item => {
          const until = dismissMap[String(item.id)] || 0
          return !until || until < now
        }) || null
        const candidateWithImage = candidate && (candidate.image?.url || candidate.imageUrl ? candidate : null)
        if (mounted) {
          setPopup(candidateWithImage)
        }
      } catch (error) {
        console.error('Failed to fetch homepage popup', error)
        if (mounted) setPopup(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [shouldSuppress, location.key])

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
