import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fastFetch } from '../utils/fastFetch'
import { responsiveImageProps } from '../utils/image'
import { useHomepageRefresh } from '../contexts/HomepageRefreshContext'

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
}

export default function ActivitiesListPage() {
  const [items, setItems] = useState<Activity[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 6
  const { refreshKey } = useHomepageRefresh()
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setError(null)
    fastFetch<Activity[]>('/api/activities?published=true', { ttlMs: 15_000, retries: 1 })
      .then((list) => {
        const now = Date.now()
        const visible = (Array.isArray(list)? list: []).filter(a => {
          if (a.isPublished === false) return false
          if (a.publishedAt) {
            const t = new Date(a.publishedAt).getTime()
            if (!isNaN(t) && t > now) return false
          }
          return true
        })
        const ts = (a: Activity) => {
          const cands = [a.publishedAt, a.updatedAt, a.createdAt, a.date]
          for (const x of cands) { const n = x ? new Date(x).getTime() : NaN; if (!isNaN(n)) return n }
          return 0
        }
        const sorted = visible.slice().sort((a,b) => ts(b) - ts(a))
        setItems(sorted)
      })
      .catch((e) => { if (e.name !== 'AbortError') { setItems([]); setError(e?.message || 'เกิดข้อผิดพลาด') } })
    return () => ac.abort()
  }, [refreshKey])

  // Filter and search items
  const filterItems = (items: Activity[]) => {
    let filtered = items

    // Search by title and description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.description && item.description.toLowerCase().includes(query))
      )
    }

    // Sort items
    filtered.sort((a, b) => {
      const ts = (activity: Activity) => {
        const cands = [activity.publishedAt, activity.updatedAt, activity.createdAt, activity.date]
        for (const x of cands) { const n = x ? new Date(x).getTime() : NaN; if (!isNaN(n)) return n }
        return 0
      }
      return sortBy === 'newest' ? ts(b) - ts(a) : ts(a) - ts(b)
    })

    return filtered
  }

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return []
    return filterItems(items)
  }, [items, searchQuery, sortBy])

  // Clamp page when items change
  const pageCount = useMemo(() => Math.max(1, Math.ceil(filteredItems.length / perPage)), [filteredItems.length])
  useEffect(() => {
    setPage(p => Math.min(Math.max(1, p), pageCount))
  }, [pageCount])

  const pagedItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filteredItems.slice(start, start + perPage)
  }, [filteredItems, page])

  return (
    <div className="container-narrow py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">กิจกรรมทั้งหมด</h1>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="ค้นหากิจกรรม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
          
          {/* Sort Options */}
          <div className="sm:w-40">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="oldest">เก่าที่สุด</option>
            </select>
          </div>
        </div>
        
        {/* Results Summary */}
        {Array.isArray(items) && (
          <div className="text-sm text-gray-600">
            พบ {filteredItems.length} กิจกรรม {searchQuery && `สำหรับ "${searchQuery}"`}
          </div>
        )}
      </div>

      {items === null && (
        <>
          {/* Mobile skeleton: list style */}
          <div className="md:hidden space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="flex gap-3 p-3">
                  <div className="h-24 w-32 bg-gray-200 rounded" />
                  <div className="flex-1 py-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop/tablet skeleton: grid cards */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4 mt-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="bg-gray-200 aspect-[4/3] w-full" />
                <div className="card-body">
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {Array.isArray(items) && filteredItems.length > 0 && (
        <>
          {/* Mobile: list style */}
          <div className="md:hidden space-y-3">
            {pagedItems.map(a => {
              const first = a.images && a.images.length ? a.images[0] : undefined
              const img = typeof first === 'string' ? first : first?.url
                || 'https://images.unsplash.com/photo-1584982751630-89b231fda6b1?q=80&w=800&auto=format&fit=crop'
              const { src, srcSet, sizes } = responsiveImageProps(img, { widths: [320, 480, 640, 800], crop: 'fill' })
              return (
                <Link to={`/activities/${a._id}`} key={a._id} className="block bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={src}
                      srcSet={srcSet}
                      sizes={sizes}
                      alt={a.title ? `กิจกรรม: ${a.title}` : 'กิจกรรม'}
                      className="h-24 w-32 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0 py-1">
                      <div className="font-semibold text-gray-900 line-clamp-2">{a.title}</div>
                      {a.date && <div className="text-xs text-gray-600 mt-1">{new Date(a.date).toLocaleDateString()}</div>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          {/* Desktop/tablet: grid cards */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedItems.map(a => {
              const first = a.images && a.images.length ? a.images[0] : undefined
              const img = typeof first === 'string' ? first : first?.url
                || 'https://images.unsplash.com/photo-1584982751630-89b231fda6b1?q=80&w=800&auto=format&fit=crop'
              const { src, srcSet, sizes } = responsiveImageProps(img, { widths: [320, 480, 640, 800, 1024], crop: 'fill' })
              return (
                <Link to={`/activities/${a._id}`} key={a._id} className="card overflow-hidden group">
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
        </>
      )}
      {Array.isArray(items) && filteredItems.length > 0 && pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="btn btn-outline" aria-label="หน้าก่อนหน้า" disabled={page <= 1} onClick={()=>setPage(p=>Math.max(1, p-1))}>ก่อนหน้า</button>
          <div>หน้า {page} / {pageCount}</div>
          <button className="btn btn-outline" aria-label="หน้าถัดไป" disabled={page >= pageCount} onClick={()=>setPage(p=>Math.min(pageCount, p+1))}>ถัดไป</button>
        </div>
      )}
      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mt-3">{error}</div>
      )}
      {Array.isArray(items) && items.length === 0 && !error && (
        <div className="text-gray-500 text-center py-8">ยังไม่มีกิจกรรม</div>
      )}
      {Array.isArray(items) && filteredItems.length === 0 && items.length > 0 && (
        <div className="text-gray-500 text-center py-8">
          ไม่พบกิจกรรมที่ตรงกับการค้นหา "{searchQuery}"
        </div>
      )}
    </div>
  )
}
