import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fastFetch } from '../utils/fastFetch'
import { responsiveImageProps } from '../utils/image'
import { buildApiUrl } from '../utils/api'
import { useHomepageRefresh } from '../contexts/useHomepageRefresh'

type Activity = {
  _id: string
  title: string
  description?: string
  images?: Array<string | { url: string; publicId?: string }>
  date?: string
  isPublished?: boolean
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
  viewCount?: number
}

export default function LatestActivities({ limit = 6, embedded = false }: { limit?: number, embedded?: boolean }) {
  const [items, setItems] = useState<Activity[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { refreshKey } = useHomepageRefresh()

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setError(null)
    fastFetch<Activity[]>(buildApiUrl('/api/activities?published=true'), { ttlMs: 5_000, retries: 1 })
      .then((list) => {
        // Ensure only currently visible items (exclude future schedules if any slipped through)
        const now = Date.now()
        const visible = (Array.isArray(list)? list: []).filter(a => {
          if (a.isPublished === false) return false
          if (a.publishedAt) {
            const t = new Date(a.publishedAt).getTime()
            if (!isNaN(t) && t > now) return false
          }
          return true
        })
        // Sort by publishedAt desc, then updatedAt, then createdAt, then date
        const ts = (a: Activity) => {
          const cands = [a.publishedAt, a.updatedAt, a.createdAt, a.date]
          for (const x of cands) { const n = x ? new Date(x).getTime() : NaN; if (!isNaN(n)) return n }
          return 0
        }
        const sorted = visible.slice().sort((a,b) => ts(b) - ts(a))
        setItems(sorted.slice(0, limit))
      })
      .catch((thrown: unknown) => {
        if (thrown instanceof DOMException && thrown.name === 'AbortError') return
        setItems([])
        if (thrown instanceof Error) {
          setError(thrown.message || 'เกิดข้อผิดพลาด')
          return
        }
        setError('เกิดข้อผิดพลาด')
      })
    return () => ac.abort()
  }, [limit, refreshKey])

  return embedded ? (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          กิจกรรมล่าสุด
        </h2>
        <p className="text-sm text-gray-600">ติดตามข่าวสารและกิจกรรมต่างๆ ของโรงพยาบาล</p>
      </div>
      {items === null && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="bg-gray-200 aspect-[4/3] w-full" />
              <div className="card-body">
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
      {Array.isArray(items) && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(a => {
            const first = a.images && a.images.length ? a.images[0] : undefined
            const img = typeof first === 'string' ? first : first?.url
              || 'https://images.unsplash.com/photo-1584982751630-89b231fda6b1?q=80&w=800&auto=format&fit=crop'
            const { src, srcSet, sizes } = responsiveImageProps(img, { widths: [320, 480, 640, 800, 1024], crop: 'fill' })
            return (
              <Link to={`/activities/${a._id}`} key={a._id} className="card overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={src}
                    srcSet={srcSet}
                    sizes={sizes}
                    alt={a.title ? `กิจกรรม: ${a.title}` : 'กิจกรรม'}
                    className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-sm">
                    <div className="font-semibold line-clamp-2">{a.title}</div>
                    <div className="flex items-center justify-between">
                      {a.date && <div className="opacity-80">{new Date(a.date).toLocaleDateString()}</div>}
                      {a.viewCount !== undefined && a.viewCount > 0 && (
                        <div className="bg-black/60 px-2 py-1 rounded-full text-xs flex items-center gap-1 font-medium">
                          <i className="fas fa-eye text-xs"></i>
                          {a.viewCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mt-3">{error}</div>
      )}
      {Array.isArray(items) && items.length === 0 && !error && (
        <div className="text-gray-500">ยังไม่มีกิจกรรม</div>
      )}
    </>
  ) : (
    <section className="py-12 bg-white">
      <div className="container-narrow">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">กิจกรรมล่าสุด</h3>
            <p className="text-gray-600 text-sm">ติดตามกิจกรรมและการบริการต่างๆ ของโรงพยาบาล</p>
          </div>
          <Link
            to="/activities"
            className="btn btn-outline inline-flex items-center gap-1 transition-transform hover:translate-x-0.5"
            aria-label="ดูทั้งหมดกิจกรรม"
          >
            ดูทั้งหมด <span aria-hidden>→</span>
          </Link>
        </div>
        {items === null && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="bg-gray-200 aspect-[4/3] w-full" />
                <div className="card-body">
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(items) && items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map(a => {
              const first = a.images && a.images.length ? a.images[0] : undefined
              const img = typeof first === 'string' ? first : first?.url
                || 'https://images.unsplash.com/photo-1584982751630-89b231fda6b1?q=80&w=800&auto=format&fit=crop'
              const { src, srcSet, sizes } = responsiveImageProps(img, { widths: [320, 480, 640, 800, 1024], crop: 'fill' })
              return (
                <Link to={`/activities/${a._id}`} key={a._id} className="card overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={src}
                      srcSet={srcSet}
                      sizes={sizes}
                      alt={a.title ? `กิจกรรม: ${a.title}` : 'กิจกรรม'}
                      className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-sm">
                      <div className="font-semibold line-clamp-2">{a.title}</div>
                      {a.date && <div className="opacity-80">{new Date(a.date).toLocaleDateString()}</div>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mt-3">{error}</div>
        )}
        {Array.isArray(items) && items.length === 0 && !error && (
          <div className="text-gray-500">ยังไม่มีกิจกรรม</div>
        )}
      </div>
    </section>
  )
}
