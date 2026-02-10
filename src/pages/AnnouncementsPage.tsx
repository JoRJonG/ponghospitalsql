
import { NavLink, Routes, Route, Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useSWR } from '../hooks/useSWR'



const stripHtml = (html?: string) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

type Announcement = {
  _id: string
  title: string
  category: 'สมัครงาน' | 'ประชาสัมพันธ์' | 'ประกาศ' | 'ประกาศจัดซื้อจัดจ้าง'
  content?: string
  publishedAt?: string
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

function List({ category }: { category?: Announcement['category'] }) {
  // State for raw items fetched from the API
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // URL and Pagination State
  const [searchParams, setSearchParams] = useSearchParams()
  const pageSize = 10
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Get filter/search/sort/page state from URL
  const searchQuery = searchParams.get('q') || ''
  const urlCategory = category || (searchParams.get('cat') as Announcement['category'] | 'all' || 'all')
  const sortBy = (searchParams.get('sort') as 'newest' | 'oldest') || 'newest'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  // คำนวณ effectiveCategory ก่อน (ใช้ category prop ถ้ามี มิฉะนั้นใช้ urlCategory)
  const effectiveCategory = category || urlCategory

  // Fetcher for announcements
  const fetcher = useCallback(async () => {
    const url = new URL('/api/announcements', window.location.origin)
    url.searchParams.set('page', String(page))
    url.searchParams.set('limit', String(pageSize))
    url.searchParams.set('sort', sortBy)

    if (searchQuery) url.searchParams.set('q', searchQuery)

    if (effectiveCategory && effectiveCategory !== 'all') {
      url.searchParams.set('category', effectiveCategory)
    }

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(res.statusText)

    const total = parseInt(res.headers.get('X-Total-Count') || '0', 10)
    const items = await res.json()
    return { items, total }
  }, [page, pageSize, sortBy, searchQuery, effectiveCategory])

  // สร้าง cache key ที่ unique สำหรับแต่ละ category
  const cacheKey = `/api/announcements?page=${page}&limit=${pageSize}&sort=${sortBy}&cat=${effectiveCategory}&q=${searchQuery}`

  const { data, error: swrError, isLoading, mutate } = useSWR(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      staleTime: 0, // ไม่ใช้ stale time เพื่อให้ fetch ใหม่ทุกครั้งที่ key เปลี่ยน
    }
  )

  // Force revalidate เมื่อ category เปลี่ยน
  useEffect(() => {
    mutate()
  }, [category, mutate])

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
      setError(swrError.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
      setLoading(false)
    }
  }, [swrError])

  // --- Handlers ---

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    const sp = new URLSearchParams(searchParams)

    // อัปเดตค่าค้นหา
    if (newQuery) {
      sp.set('q', newQuery)
    } else {
      sp.delete('q')
    }

    // รีเซ็ตกลับไปหน้า 1
    sp.delete('page')

    setSearchParams(sp, { replace: true })
  }, [searchParams, setSearchParams])

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value
    const sp = new URLSearchParams(searchParams)

    // อัปเดตหมวดหมู่
    if (newCategory && newCategory !== 'all') {
      sp.set('cat', newCategory)
    } else {
      sp.delete('cat')
    }

    // รีเซ็ตกลับไปหน้า 1
    sp.delete('page')

    setSearchParams(sp, { replace: true })
  }, [searchParams, setSearchParams])

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as 'newest' | 'oldest'
    const sp = new URLSearchParams(searchParams)

    // อัปเดตการเรียงลำดับ
    if (newSort === 'newest') {
      sp.delete('sort')
    } else {
      sp.set('sort', newSort)
    }

    // รีเซ็ตกลับไปหน้า 1
    sp.delete('page')

    setSearchParams(sp, { replace: true })
  }, [searchParams, setSearchParams])

  const gotoPage = useCallback((p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages)
    updateSearchParams(searchParams, 'page', clamped === 1 ? null : String(clamped), setSearchParams)
  }, [searchParams, setSearchParams, totalPages])


  // Badge classes per category to match HomeAnnouncements
  const badgeClass: Record<Announcement['category'], string> = {
    'ประกาศจัดซื้อจัดจ้าง': 'bg-blue-50 text-blue-700 border border-blue-200',
    'สมัครงาน': 'bg-emerald-100 text-emerald-700',
    'ประชาสัมพันธ์': 'bg-purple-100 text-purple-700',
    'ประกาศ': 'bg-slate-100 text-slate-700',
  }

  const isNew = useCallback((a: Announcement) => {
    if (!a.publishedAt) return false
    const diff = Date.now() - new Date(a.publishedAt).getTime()
    return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000 // ภายใน 3 วัน
  }, [])

  const isCategoryRoute = !!category

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="ค้นหาประกาศ..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Category Filter - Only enabled on the 'All' tab */}
          <div className="sm:w-48">
            <select
              value={isCategoryRoute ? category : urlCategory}
              onChange={handleCategoryChange}
              disabled={isCategoryRoute}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${isCategoryRoute ? 'bg-gray-100 text-gray-500' : ''}`}
            >
              <option value="all">ทุกหมวดหมู่</option>
              <option value="ประชาสัมพันธ์">ประชาสัมพันธ์</option>
              <option value="ประกาศ">ประกาศ</option>
              <option value="ประกาศจัดซื้อจัดจ้าง">ประกาศจัดซื้อจัดจ้าง</option>
              <option value="สมัครงาน">สมัครงาน</option>
            </select>
          </div>

          {/* Sort Options */}
          <div className="sm:w-32">
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="oldest">เก่าที่สุด</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        {!loading && (
          <div className="text-sm text-gray-600">
            พบ {totalCount} รายการ {searchQuery && `สำหรับ "${searchQuery}"`}
          </div>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-lg shadow-sm overflow-hidden animate-pulse">
                <div className="h-3 w-40 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="border border-red-200 bg-red-50/80 backdrop-blur-sm text-red-700 rounded-lg p-3">
            {error}
          </div>
        )}
        {!loading && items.map(a => (
          <Link
            to={`/announcement/${a._id}`}
            key={a._id}
            className={
              `block bg-white p-4 rounded-lg shadow-sm border border-slate-100 transition-all duration-300 group relative overflow-hidden ` +
              `hover:border-emerald-400 hover:bg-gradient-to-br hover:from-emerald-50/30 hover:to-teal-50/30 hover:shadow-xl hover:-translate-y-1`
            }
          >
            <div className="card-body">
              <div className="text-sm text-gray-500 flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass[a.category] || 'bg-slate-100 text-slate-700'} group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors duration-200`}>{a.category}</span>
                <span>{a.publishedAt ?
                  new Date(a.publishedAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }).replace(/\./g, '').replace('พ.ย', 'พ.ย.') : ''}
                </span>
                {a.viewCount !== undefined && (
                  <>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1"><i className="fas fa-eye text-xs"></i> {a.viewCount}</span>
                  </>
                )}
                {isNew(a) && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                    ใหม่
                  </span>
                )}
              </div>
              <div className="font-semibold text-gray-800 text-base mb-1 group-hover:text-emerald-500 transition-colors duration-200">{a.title}</div>
              {a.content && <p className="text-xs text-gray-500 line-clamp-2">{stripHtml(a.content)}</p>}
            </div>
          </Link>
        ))}
        {!loading && !error && items.length === 0 && <div className="text-gray-500 text-center py-8">ไม่พบประกาศ</div>}

        {!loading && !error && totalCount > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-white/30">
            <div className="text-sm text-gray-600">
              แสดง {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} จาก {totalCount} รายการ (หน้า {page} จาก {totalPages})
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-outline"
                onClick={() => gotoPage(page - 1)}
                disabled={page <= 1}
                aria-label="หน้าก่อนหน้า"
              >
                ก่อนหน้า
              </button>
              <button
                className="btn btn-outline"
                onClick={() => gotoPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="หน้าถัดไป"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AnnouncementsPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return (
    <div className="relative min-h-screen">
      <div
        className={`container-narrow py-8 transform transition-all duration-500 ease-out will-change-auto ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">ประกาศ</h1>
        </div>
        <div className="mb-6">
          <div className="relative rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
            <div className="grid grid-cols-2 gap-2 px-3 py-3 text-sm sm:flex sm:flex-nowrap sm:gap-2">
              <NavLink
                to="/announcements"
                end
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full transition-all ${isActive
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <i className="fa-solid fa-list" aria-hidden="true" />
                ทั้งหมด
              </NavLink>
              <NavLink
                to="/announcements/jobs"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full transition-all ${isActive
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <i className="fa-solid fa-briefcase" aria-hidden="true" />
                สมัครงาน
              </NavLink>
              <NavLink
                to="/announcements/news"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full transition-all ${isActive
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <i className="fa-solid fa-bullhorn" aria-hidden="true" />
                ประชาสัมพันธ์
              </NavLink>
              <NavLink
                to="/announcements/notices"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full transition-all ${isActive
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <i className="fa-solid fa-scroll" aria-hidden="true" />
                ประกาศ
              </NavLink>
              <NavLink
                to="/announcements/procurement"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full transition-all ${isActive
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <i className="fa-solid fa-shopping-cart" aria-hidden="true" />
                ประกาศจัดซื้อจัดจ้าง
              </NavLink>
            </div>
          </div>
        </div>
        <Routes>
          <Route index element={<List />} />
          <Route path="jobs" element={<List category="สมัครงาน" />} />
          <Route path="news" element={<List category="ประชาสัมพันธ์" />} />
          <Route path="notices" element={<List category="ประกาศ" />} />
          <Route path="procurement" element={<List category="ประกาศจัดซื้อจัดจ้าง" />} />
        </Routes>
      </div>
    </div>
  )
}