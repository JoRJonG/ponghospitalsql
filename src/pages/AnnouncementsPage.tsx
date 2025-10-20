import { NavLink, Routes, Route, Link, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react' // Added useCallback, useMemo
import { useAuth } from '../auth/AuthContext.tsx'
import { fastFetch } from '../utils/fastFetch'

const stripHtml = (html?: string) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

type Announcement = {
  _id: string
  title: string
  category: 'สมัครงาน' | 'ประชาสัมพันธ์' | 'ประกาศ'
  content?: string
  publishedAt?: string
}

// Simple in-memory cache per category/all to speed up tab switching
// We'll rename the 'all' key to an empty string to be cleaner in fetch logic, 
// but use 'all' for the UI/URL.
const cache = new Map<string, Announcement[]>()

// Helper to update URL search params
const updateSearchParams = (searchParams: URLSearchParams, key: string, value: string | null, setSearchParams: (sp: URLSearchParams, options?: { replace: boolean }) => void) => {
  const sp = new URLSearchParams(searchParams)
  if (value && value !== '1' && value !== 'all') { // Don't include defaults in URL
    sp.set(key, value)
  } else {
    sp.delete(key)
  }
  setSearchParams(sp, { replace: true })
}

function List({ category }: { category?: Announcement['category'] }) {
  // Determine the key for cache and API fetch
  const cacheKey = category || ''
  
  // State for raw items fetched from the API
  const [items, setItems] = useState<Announcement[]>(() => cache.get(cacheKey) || [])
  const [loading, setLoading] = useState(items.length === 0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  
  // URL and Pagination State
  const [searchParams, setSearchParams] = useSearchParams()
  const pageSize = 10
  
  // Get filter/search/sort/page state from URL
  const searchQuery = searchParams.get('q') || ''
  // Use the prop 'category' for category-specific routes, otherwise use URL 'cat' param
  const urlCategory = category || (searchParams.get('cat') as Announcement['category'] | 'all' || 'all')
  const sortBy = (searchParams.get('sort') as 'newest' | 'oldest') || 'newest'
  const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  
  // Note: Only the page needs local state to be managed/clamped later, 
  // the rest (q, cat, sort) are controlled by the URL/prop.
  const [page, setPage] = useState<number>(pageFromUrl)

  // --- Data Fetching Effect ---
  useEffect(() => {
    // If we're on a category-specific route (e.g., /announcements/jobs), 
    // we only fetch that category's data. If we're on the main route (/announcements), 
    // we fetch 'all' (empty string key).
    const cached = cache.get(cacheKey)
    if (cached) {
      setItems(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setError(null)
    
    const url = new URL('/api/announcements', window.location.origin)
    // Send the category prop as a query param for the API fetch
    if (category) url.searchParams.set('category', category)
    
    fastFetch<Announcement[]>(url.toString(), { ttlMs: 15_000, retries: 1 })
      .then((data) => { cache.set(cacheKey, data); setItems(data) })
      .catch((e) => { if (e.name !== 'AbortError') { setItems([]); setError(e?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล') } })
      .finally(() => { if (!ac.signal.aborted) setLoading(false) })

    return () => ac.abort()
  }, [cacheKey, category])

  // --- Filter/Search/Sort Logic (Memoized) ---
  const filteredItems = useMemo(() => {
    let filtered = items
    
    // 1. Filter by URL Category (Only applies on the main route if a 'cat' param is set)
    // The 'category' prop already filters the fetched 'items' state if it's set.
    // This only applies if we're on the 'all' route (category is undefined) AND a filter is applied via URL.
    if (!category && urlCategory !== 'all') {
      filtered = filtered.filter(item => item.category === urlCategory)
    }

    // 2. Search by title and content
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) || 
        stripHtml(item.content).toLowerCase().includes(query)
      )
    }

    // 3. Sort items
    // Create a copy for sorting to avoid mutating the state/cache array
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.publishedAt || 0).getTime()
      const dateB = new Date(b.publishedAt || 0).getTime()
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })

    return sorted
  }, [items, searchQuery, urlCategory, sortBy, category])

  // --- Page Synchronization and Clamping Effect ---
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize) || 1)
    let nextPage = Math.min(Math.max(1, pageFromUrl), totalPages)
    
    // Check if the page needs to be clamped (e.g., search results decreased pages)
    if (nextPage !== page || pageFromUrl !== nextPage) {
      setPage(nextPage)
      // Ensure URL reflects clamped page
      updateSearchParams(searchParams, 'page', nextPage === 1 ? null : String(nextPage), setSearchParams)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems.length, pageFromUrl]) // Re-run when search/filter/sort changes (via filteredItems.length) or URL page changes

  // --- Handlers for Search/Filter/Sort/Page Change ---
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    // Update URL, which will trigger the filtering/sorting logic
    updateSearchParams(searchParams, 'q', newQuery || null, setSearchParams)
    setPage(1) // Reset to page 1 on new search
  }, [searchParams, setSearchParams])

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value
    // Update URL, which will trigger the filtering/sorting logic
    updateSearchParams(searchParams, 'cat', newCategory === 'all' ? null : newCategory, setSearchParams)
    setPage(1) // Reset to page 1 on new filter
  }, [searchParams, setSearchParams])

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as 'newest' | 'oldest'
    // Update URL, which will trigger the sorting logic
    updateSearchParams(searchParams, 'sort', newSort === 'newest' ? null : newSort, setSearchParams)
    setPage(1) // Reset to page 1 on new sort
  }, [searchParams, setSearchParams])
  
  const gotoPage = useCallback((p: number) => {
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize) || 1)
    const clamped = Math.min(Math.max(1, p), totalPages)
    
    // Update URL, which will automatically update the local 'page' state via the useEffect
    updateSearchParams(searchParams, 'page', clamped === 1 ? null : String(clamped), setSearchParams)
  }, [searchParams, setSearchParams, filteredItems.length])

  // --- Pagination Slice ---
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize) || 1)
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const pageItems = filteredItems.slice(start, end)
  
  // --- Newness Check ---
  const isNew = useCallback((a: Announcement) => {
    if (!a.publishedAt) return false
    const diff = Date.now() - new Date(a.publishedAt).getTime()
    return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000 // ภายใน 3 วัน
  }, [])

  // Check if we are on a category-specific route
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
              disabled={isCategoryRoute} // Disable on category routes
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${isCategoryRoute ? 'bg-gray-100 text-gray-500' : ''}`}
              title={isCategoryRoute ? 'เปลี่ยนหมวดหมู่ได้ที่แถบด้านบน' : 'กรองตามหมวดหมู่'}
            >
              <option value="all">ทุกหมวดหมู่</option>
              <option value="ประชาสัมพันธ์">ประชาสัมพันธ์</option>
              <option value="ประกาศ">ประกาศ</option>
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
            พบ {filteredItems.length} รายการ {searchQuery && `สำหรับ "${searchQuery}"`}
          </div>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
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
      {!loading && pageItems.map(a => (
        <Link
          to={`/announcement/${a._id}`}
          key={a._id}
          className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-sm block transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-white/95"
        >
          <div className="card-body">
            <div className="text-sm text-gray-500 flex flex-wrap items-center gap-2 mb-1">
              <span className="badge blue">{a.category}</span>
              <span>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ''}</span>
              {isNew(a) && (
                <span className="chip-new">
                  <span className="dot-pulse">
                    <span className="dot-pulse__ping" />
                    <span className="dot-pulse__dot" />
                  </span>
                  ใหม่
                </span>
              )}
            </div>
            <div className="font-semibold text-gray-800">{a.title}</div>
            {a.content && <p className="text-sm text-gray-600 line-clamp-2">{stripHtml(a.content)}</p>}
          </div>
        </Link>
      ))}
      {!loading && !error && items.length === 0 && <div className="text-gray-500 text-center py-8">ยังไม่มีประกาศ</div>}
      {!loading && !error && filteredItems.length === 0 && items.length > 0 && (
        <div className="text-gray-500 text-center py-8">
          ไม่พบประกาศที่ตรงกับการค้นหา "{searchQuery}"
        </div>
      )}
      {!loading && !error && filteredItems.length > 0 && ( // Changed from > pageSize to > 0 to show pagination info even on one page
        <div className="flex items-center justify-between pt-4 border-t border-white/30">
          <div className="text-sm text-gray-600">
            แสดง {start + 1}-{Math.min(end, filteredItems.length)} จาก {filteredItems.length} รายการ (หน้า {page} จาก {totalPages})
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
  const { isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return (
    <div className="relative min-h-screen">
      <div
        className={`container-narrow py-8 transform transition-all duration-500 ease-out will-change-auto ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">ประกาศ</h1>
        {isAuthenticated && <Link to="/admin" className="btn btn-primary">เพิ่มประกาศ</Link>}
      </div>
      <div className="mb-6">
        <div className="relative rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="grid grid-cols-2 gap-2 px-3 py-3 text-sm sm:flex sm:flex-nowrap sm:gap-2">
            <NavLink
              to="/announcements"
              end
              className={({ isActive }) =>
                `inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full transition-all ${
                  isActive
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
                `inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full transition-all ${
                  isActive
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
                `inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full transition-all ${
                  isActive
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
                `inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              <i className="fa-solid fa-scroll" aria-hidden="true" />
              ประกาศ
            </NavLink>
          </div>
        </div>
      </div>
      <Routes>
        <Route index element={<List />} />
        {/* Pass the Thai category string as the prop */}
        <Route path="jobs" element={<List category="สมัครงาน" />} /> 
        <Route path="news" element={<List category="ประชาสัมพันธ์" />} />
        <Route path="notices" element={<List category="ประกาศ" />} />
      </Routes>
      </div>
    </div>
  )
}