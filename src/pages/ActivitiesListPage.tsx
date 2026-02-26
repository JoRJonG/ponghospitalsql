
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { responsiveImageProps } from '../utils/image'
import { useSWR } from '../hooks/useSWR'
import logo from '../assets/logo-150x150.png'
import SEO from '../components/SEO'
import PageHeader from '../components/PageHeader'
import SearchFilterBar from '../components/SearchFilterBar'
import Pagination from '../components/Pagination'

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
}

// Helper to update URL search params
const updateSearchParams = (searchParams: URLSearchParams, key: string, value: string | null, setSearchParams: (sp: URLSearchParams, options?: { replace: boolean }) => void) => {
  const sp = new URLSearchParams(searchParams)
  if (value && value !== '1' && value !== 'all') {
    sp.set(key, value)
  } else {
    sp.delete(key)
  }
  setSearchParams(sp, { replace: true })
}

export default function ActivitiesListPage() {
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const pageSize = 12
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Get filter/search/sort/page state from URL
  const searchQuery = searchParams.get('q') || ''
  const sortBy = (searchParams.get('sort') as 'newest' | 'oldest') || 'newest'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  // Fetcher function handles both data and total count
  const activitiesFetcher = async () => {
    const url = new URL('/api/activities', window.location.origin)
    url.searchParams.set('published', 'true')
    url.searchParams.set('page', String(page))
    url.searchParams.set('limit', String(pageSize))
    url.searchParams.set('sort', sortBy)

    if (searchQuery) url.searchParams.set('q', searchQuery)

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(res.statusText)

    const total = parseInt(res.headers.get('X-Total-Count') || '0', 10)
    const items = await res.json()
    return { items, total }
  }

  const { data, error: swrError, isLoading } = useSWR(
    `/api/activities?page=${page}&limit=${pageSize}&sort=${sortBy}&q=${searchQuery}`,
    activitiesFetcher,
    {
      revalidateOnFocus: false
    }
  )

  useEffect(() => {
    setLoading(isLoading)
  }, [isLoading])

  useEffect(() => {
    if (data) {
      setItems(data.items)
      setTotalCount(data.total)
      setTotalPages(Math.ceil(data.total / pageSize) || 1)
    }
  }, [data, pageSize])

  useEffect(() => {
    if (swrError) {
      setItems([])
      setError(swrError.message || 'เกิดข้อผิดพลาด')
      setLoading(false)
    }
  }, [swrError])

  // --- Handlers ---

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    updateSearchParams(searchParams, 'q', newQuery || null, setSearchParams)
    updateSearchParams(searchParams, 'page', null, setSearchParams) // Reset to page 1
  }, [searchParams, setSearchParams])

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as 'newest' | 'oldest'
    updateSearchParams(searchParams, 'sort', newSort === 'newest' ? null : newSort, setSearchParams)
    updateSearchParams(searchParams, 'page', null, setSearchParams)
  }, [searchParams, setSearchParams])

  const gotoPage = useCallback((p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages)
    updateSearchParams(searchParams, 'page', clamped === 1 ? null : String(clamped), setSearchParams)
  }, [searchParams, setSearchParams, totalPages])

  return (
    <div className="page-wrapper">
      <div className="container-narrow py-8">
        {/* SEO meta tags สำหรับหน้ากิจกรรม */}
        <SEO
          title="ภาพกิจกรรม"
          description="ภาพกิจกรรมและข่าวสารกิจกรรมล่าสุดของโรงพยาบาลปง อำเภอปง จังหวัดพะเยา การบริการชุมชน และกิจกรรมส่งเสริมสุขภาพ"
        />
        <PageHeader title="กิจกรรมทั้งหมด" />

        {/* Search and Filter Controls */}
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="ค้นหากิจกรรม..."
          filters={
            <div className="sm:w-40">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="newest">ใหม่ล่าสุด</option>
                <option value="oldest">เก่าที่สุด</option>
              </select>
            </div>
          }
          summary={!loading ? <>พบ {totalCount} กิจกรรม {searchQuery && `สำหรับ "${searchQuery}"`}</> : undefined}
        />

        {loading && (
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
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 mt-1">
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
          </>
        )}

        {!loading && items.length > 0 && (
          <>
            {/* Mobile: list style */}
            <div className="md:hidden space-y-3">
              {items.map(a => {
                const first = a.images && a.images.length ? a.images[0] : undefined
                const img = typeof first === 'string' ? first : first?.url
                  || logo
                const { src, srcSet, sizes } = responsiveImageProps(img, { widths: [320, 480, 640, 800], crop: 'fill' })
                return (
                  <Link to={`/activities/${a._id}`} key={a._id} className="block bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200">
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
                        <div className="font-semibold text-gray-800 line-clamp-2">{a.title}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          {a.date && <div>{new Date(a.date).toLocaleDateString()}</div>}
                          {a.viewCount !== undefined && <div className="flex items-center gap-1"><i className="fas fa-eye text-xs"></i> {a.viewCount}</div>}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            {/* Desktop/tablet: grid cards */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6">
              {items.map(a => {
                const first = a.images && a.images.length ? a.images[0] : undefined
                const img = typeof first === 'string' ? first : first?.url
                  || logo
                const { src, srcSet, sizes } = responsiveImageProps(img, { widths: [320, 480, 640, 800, 1024], crop: 'fill' })
                return (
                  <Link to={`/activities/${a._id}`} key={a._id} className="group block">
                    <article className="bg-white/90 shadow-sm border border-gray-100 p-3 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-[transform,box-shadow] duration-300">
                      <div className="overflow-hidden rounded-xl shadow-inner mb-3">
                        <img
                          loading="lazy"
                          decoding="async"
                          src={src}
                          srcSet={srcSet}
                          sizes={sizes}
                          alt={a.title ? `กิจกรรม: ${a.title}` : 'กิจกรรม'}
                          className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-105"
                        />
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
                      <h3 className="text-sm md:text-base font-semibold text-slate-800 leading-snug group-hover:text-emerald-500 transition-colors duration-200 mb-2">
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
          </>
        )}

        {/* Pagination */}
        {!loading && !error && totalCount > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={gotoPage}
            itemLabel="กิจกรรม"
          />
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4 mt-3">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            {searchQuery ? `ไม่พบกิจกรรมที่ตรงกับการค้นหา "${searchQuery}"` : 'ยังไม่มีกิจกรรม'}
          </div>
        )}
      </div>
    </div>
  )
}
