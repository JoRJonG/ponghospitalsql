import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fastFetch } from '../utils/fastFetch'
import { responsiveImageProps } from '../utils/image'
import { buildApiUrl } from '../utils/api'
import { useHomepageRefresh } from '../contexts/useHomepageRefresh'

const stripHtml = (html?: string) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

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
  category?: 'HEALTH CARE' | 'MEETING' | 'DONATION' | 'SERVICE' | string
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
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-bold text-emerald-600 tracking-widest uppercase mb-1">Our Activities</h3>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-800">ภาพกิจกรรม</h2>
        </div>
        <Link
          to="/activities"
          className="text-slate-500 hover:text-emerald-600 transition text-sm font-medium mt-4 md:mt-0 group"
          aria-label="ดูทั้งหมดกิจกรรม"
        >
          ดูทั้งหมด <i className="fa-solid fa-arrow-right ml-1 group-hover:translate-x-1 transition"></i>
        </Link>
      </div>
            {items === null && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <article key={i} className="group animate-pulse">
              <div className="overflow-hidden rounded-lg shadow-sm mb-4 relative h-48">
                <div className="bg-slate-200 w-full h-full" />
              </div>
              <div className="h-4 w-full bg-slate-200 rounded" />
            </article>
          ))}
        </div>
      )}
      {Array.isArray(items) && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map(a => {
            const first = a.images && a.images.length ? a.images[0] : undefined
            const img = typeof first === 'string' ? first : first?.url
              || 'https://images.unsplash.com/photo-1584982751630-89b231fda6b1?q=80&w=800&auto=format&fit=crop'
            const { src, srcSet, sizes } = responsiveImageProps(img, { widths: [320, 480, 640, 800, 1024], crop: 'fill' })
            
            const categoryColors: Record<string, { bg: string; text: string }> = {
              'HEALTH CARE': { bg: 'bg-teal-500', text: 'text-white' },
              'MEETING': { bg: 'bg-blue-500', text: 'text-white' },
              'DONATION': { bg: 'bg-red-500', text: 'text-white' },
              'SERVICE': { bg: 'bg-purple-500', text: 'text-white' },
            }
            const categoryColor = a.category ? categoryColors[a.category] || { bg: 'bg-slate-500', text: 'text-white' } : null
            
            return (
              <Link to={`/activities/${a._id}`} key={a._id}>
                <article className="group cursor-pointer">
                    <div className="overflow-hidden rounded-lg shadow-sm mb-3">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={src}
                      srcSet={srcSet}
                      sizes={sizes}
                      alt={a.title ? `กิจกรรม: ${a.title}` : 'กิจกรรม'}
                        className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {categoryColor && a.category && (
                      <span className={`absolute top-3 left-3 ${categoryColor.bg} ${categoryColor.text} px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide shadow-lg`}>
                        {a.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                    {a.date && (
                      <>
                        <span><i className="far fa-calendar mr-1"></i> {new Date(a.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      </>
                    )}
                    {a.viewCount !== undefined && a.viewCount > 0 && (
                      <span><i className="far fa-eye mr-1"></i> {a.viewCount} views</span>
                    )}
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-800 leading-snug group-hover:text-emerald-700 transition mb-2">
                    {a.title}
                  </h3>
                  {a.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {stripHtml(a.description)}
                    </p>
                  )}
                  
                </article>
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
    <section className="py-8 bg-white">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="bg-gray-200 aspect-[4/3] w-full rounded-lg" />
                <div className="card-body p-4">
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(items) && items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map(a => {
              const first = a.images && a.images.length ? a.images[0] : undefined
              const img = typeof first === 'string' ? first : first?.url
                || 'https://images.unsplash.com/photo-1584982751630-89b231fda6b1?q=80&w=800&auto=format&fit=crop'
              const { src, srcSet, sizes } = responsiveImageProps(img, { widths: [320, 480, 640, 800, 1024], crop: 'fill' })
              return (
                <Link to={`/activities/${a._id}`} key={a._id} className="card overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-0 shadow-lg">
                  <div className="relative">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={src}
                      srcSet={srcSet}
                      sizes={sizes}
                      alt={a.title ? `กิจกรรม: ${a.title}` : 'กิจกรรม'}
                      className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                      <div className="font-semibold line-clamp-2 text-sm leading-tight mb-1">{a.title}</div>
                      {a.date && <div className="text-xs opacity-90">{new Date(a.date).toLocaleDateString('th-TH')}</div>}
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
