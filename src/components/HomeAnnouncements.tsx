import { useState } from 'react'
import { Link } from 'react-router-dom'
import { generateSlug } from '../utils/slugify'
import { useSWR } from '../hooks/useSWR'
import { useHomepageRefresh } from '../contexts/useHomepageRefresh'

const stripHtml = (html?: string) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export type Announcement = {
  _id: string
  title: string
  category: 'สมัครงาน' | 'ประชาสัมพันธ์' | 'ประกาศ' | 'ประกาศจัดซื้อจัดจ้าง'
  content?: string
  publishedAt?: string
  viewCount?: number
}

// categoryToPath intentionally omitted here; preview/share uses server-side preview routes

const tabs = [
  { key: 'ทั้งหมด', icon: 'fa-list' },
  { key: 'สมัครงาน', icon: 'fa-briefcase' },
  { key: 'ประชาสัมพันธ์', icon: 'fa-bullhorn' },
  { key: 'ประกาศ', icon: 'fa-scroll' },
  { key: 'ประกาศจัดซื้อจัดจ้าง', icon: 'fa-shopping-cart' },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function HomeAnnouncements({ limit = 10, embedded = false }: { limit?: number; embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabKey>('ทั้งหมด')

  const { refreshKey } = useHomepageRefresh()
  
  // สร้าง cache key ที่ unique สำหรับแต่ละ tab
  const categoryQuery = activeTab === 'ทั้งหมด' ? '' : `&category=${encodeURIComponent(activeTab)}`
  const cacheKey = `/api/announcements?limit=${limit}${categoryQuery}&_r=${refreshKey}`

  // ใช้ useSWR สำหรับ data fetching พร้อม caching
  const { data: items, error: fetchError, isLoading } = useSWR<Announcement[]>(
    cacheKey,
    async () => {
      const response = await fetch(cacheKey)
      if (!response.ok) {
        let message = 'ไม่สามารถดึงประกาศล่าสุดได้'
        try {
          const data = await response.json() as { error?: string }
          if (data?.error) message = data.error
        } catch (parseError) {
          console.warn('[HomeAnnouncements] parse error response failed', parseError)
        }
        throw new Error(message)
      }
      return response.json() as Promise<Announcement[]>
    },
    {
      // ข้อมูลถือว่าสดภายใน 30 วินาที
      staleTime: 30000,
      // เก็บ cache ไว้ 5 นาที
      cacheTime: 300000,
      // ไม่ต้อง revalidate เมื่อ focus window
      revalidateOnFocus: false,
      keepPreviousData: true
    }
  )

  const error = fetchError?.message || null


  const isNew = (a: Announcement) => {
    if (!a.publishedAt) return false
    const diff = Date.now() - new Date(a.publishedAt).getTime()
    return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000
  }

  // No client-side filtering needed anymore
  const filtered = items

  // Badge classes per category (use pill style for procurement)
  const badgeClass: Record<Announcement['category'], string> = {
    'ประกาศจัดซื้อจัดจ้าง': 'bg-blue-50 text-blue-700 border border-blue-200',
    'สมัครงาน': 'bg-emerald-100 text-emerald-700',
    'ประชาสัมพันธ์': 'bg-purple-100 text-purple-700',
    'ประกาศ': 'bg-slate-100 text-slate-700',
  }

  if (embedded) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 text-balance">ข่าวประชาสัมพันธ์ และประกาศจัดซื้อ</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              ติดตามข้อมูลข่าวสารการจัดซื้อจัดจ้าง การรับสมัครงาน และประกาศสำคัญต่างๆ จากโรงพยาบาลได้ที่นี่
            </p>
            <Link
              to="/announcements"
              className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 rounded text-slate-700 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-500 transition font-medium text-sm w-full md:w-auto"
            >
              ดูประกาศทั้งหมด
            </Link>
          </div>

          <div className="hidden lg:flex flex-col gap-2">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                className={`text-left px-4 py-3 border-l-4 transition-colors rounded-r focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none ${activeTab === t.key
                  ? 'bg-white border-emerald-500 shadow-sm font-semibold text-emerald-800'
                  : 'border-transparent hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 hover:text-emerald-500'
                  }`}
              >
                {t.key}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: limit }).map((_, i) => (
                <div key={i} className="block bg-white p-5 rounded-2xl shadow-sm border border-slate-100 animate-pulse">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-6 w-24 bg-slate-200 rounded-full" />
                    <div className="h-4 w-16 bg-slate-200 rounded" />
                  </div>
                  <div className="h-6 w-3/4 bg-slate-200 rounded mb-1" />
                  <div className="h-4 w-1/2 bg-slate-200 rounded" />
                  <div className="mt-2 h-6">&nbsp;</div>
                </div>
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-3">{error}</div>
          ) : null}

          {Array.isArray(filtered) && filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((a, i) => {
                const categoryColors: Record<Announcement['category'], { label: string }> = {
                  'ประกาศจัดซื้อจัดจ้าง': { label: 'จัดซื้อจัดจ้าง' },
                  'สมัครงาน': { label: 'รับสมัครงาน' },
                  'ประชาสัมพันธ์': { label: 'ประชาสัมพันธ์' },
                  'ประกาศ': { label: 'ประกาศ' },
                }
                const colors = categoryColors[a.category] || categoryColors['ประกาศ']

                return (
                  <Link
                    to={`/announcement/${generateSlug(a._id, a.title)}`}
                    key={a._id}
                    className={
                      `block bg-white/90 shadow-sm border border-gray-100 p-5 rounded-2xl transition-[transform,box-shadow] duration-300 group relative overflow-hidden stagger-item stagger-delay-${Math.min(i, 11)} ` +
                      `hover:shadow-lg hover:-translate-y-1`
                    }
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass[a.category] || 'bg-slate-100 text-slate-700'} group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors duration-200`}>
                            {colors.label}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {a.publishedAt ? new Intl.DateTimeFormat('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }).format(new Date(a.publishedAt)).replace(/\./g, '').replace('พ.ย', 'พ.ย.') : ''}
                          </span>
                          {a.viewCount !== undefined && a.viewCount > 0 ? (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="text-slate-400 text-xs flex items-center gap-1">
                                <i className="far fa-eye"></i> {a.viewCount}
                              </span>
                            </>
                          ) : null}
                          {isNew(a) ? (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                              ใหม่
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-sm md:text-base font-semibold text-slate-800 transition">
                          <span className="group-hover:text-emerald-500 transition-colors duration-200">{a.title}</span>
                        </h3>
                        {a.content ? (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{stripHtml(a.content)}</p>
                        ) : null}
                        <div className="mt-2">&nbsp;</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : null}

          {Array.isArray(filtered) && filtered.length === 0 && !error ? (
            <div className="text-slate-500">ยังไม่มีประกาศ</div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <section className={`py-8 ${embedded ? '' : 'bg-gray-50'}`}>
      <div className={embedded ? "" : "container-narrow"}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 text-balance">ประกาศล่าสุด</h2>
            <p className="text-gray-600 text-sm">ติดตามข่าวสารและประกาศสำคัญจากโรงพยาบาล</p>
          </div>
          <Link
            to="/announcements"
            className="btn btn-outline inline-flex items-center gap-1 transition-transform hover:translate-x-0.5"
            aria-label="ดูทั้งหมดประกาศ"
          >
            ดูทั้งหมด <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mb-6" role="tablist" aria-label="แถบกรองประกาศ">
          <div className="relative z-10 rounded-3xl bg-white/90 shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 gap-2 px-3 py-3 sm:flex sm:flex-nowrap sm:gap-2">
              {tabs.map(t => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.key}
                  aria-controls={`panel-${t.key}`}
                  onClick={() => setActiveTab(t.key)}
                  className={`inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none ${activeTab === t.key
                    ? 'bg-green-600 text-white shadow'
                    : 'bg-transparent text-gray-600 hover:text-emerald-500 hover:bg-emerald-50'
                    }`}
                >
                  <i className={`fa-solid ${t.icon}`} aria-hidden="true"></i>
                  <span className="sm:text-left">{t.key}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="block w-full bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 md:py-4 md:px-6 animate-pulse">
                <div className="flex items-start gap-3 md:gap-5">
                  <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-100" />
                  <div className="flex-1">
                    <div className="h-6 w-32 bg-gray-200 rounded-full mb-1" />
                    <div className="h-6 w-3/4 bg-gray-200 rounded" />
                    <div className="h-4 w-1/2 bg-gray-200 rounded mt-1" />
                    <div className="mt-2 h-6">&nbsp;</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-3">{error}</div>
        ) : null}

        {Array.isArray(filtered) && filtered.length > 0 ? (
          <div className="space-y-3" id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
            {filtered.map(a => {
              // Color and icon by category
              const categoryStyles: Record<string, { badge: string; icon: string; iconColor: string; }> = {
                'ประกาศจัดซื้อจัดจ้าง': { badge: 'bg-blue-100 text-blue-700', icon: 'fa-shopping-cart', iconColor: 'text-blue-400' },
                'สมัครงาน': { badge: 'bg-emerald-100 text-emerald-700', icon: 'fa-briefcase', iconColor: 'text-emerald-400' },
                'ประชาสัมพันธ์': { badge: 'bg-purple-100 text-purple-700', icon: 'fa-bullhorn', iconColor: 'text-purple-400' },
                'ประกาศ': { badge: 'bg-slate-100 text-slate-700', icon: 'fa-scroll', iconColor: 'text-slate-400' },
              }
              const style = categoryStyles[a.category] || categoryStyles['ประกาศ']
              return (
                <Link
                  to={`/announcement/${generateSlug(a._id, a.title)}`}
                  key={a._id}
                  className="block w-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 px-4 py-3 md:py-4 md:px-6 group hover:-translate-y-1 hover:border-emerald-300"
                >
                  <div className="flex items-start gap-3 md:gap-5">
                    {/* Icon */}
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-50 border border-gray-100">
                      <i className={`fa-solid ${style.icon} ${style.iconColor} text-lg md:text-xl`}></i>
                    </div>
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass[a.category] || style.badge} group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors duration-200`}>{a.category}</span>
                        {isNew(a) ? (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                            ใหม่
                          </span>
                        ) : null}
                        <span className="text-gray-400 text-xs">
                          <i className="fa-regular fa-calendar mr-1" />
                          {a.publishedAt ? new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(a.publishedAt)) : ''}
                        </span>
                        {a.viewCount !== undefined && a.viewCount > 0 ? (
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <i className="fa-regular fa-eye" /> {a.viewCount}
                          </span>
                        ) : null}
                      </div>
                      <div className="font-semibold text-gray-900 text-sm md:text-base group-hover:text-emerald-500 transition line-clamp-2">{a.title}</div>
                      {a.content ? <div className="text-xs text-gray-600 mt-1 line-clamp-1">{stripHtml(a.content)}</div> : null}
                      <div className="mt-2">&nbsp;</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : null}

        {Array.isArray(filtered) && filtered.length === 0 && !error ? (
          <div className="text-gray-500">
            {activeTab === 'ทั้งหมด' ? 'ยังไม่มีประกาศ' : `ยังไม่มีประกาศในหมวด${activeTab}`}
          </div>
        ) : null}
      </div>
    </section>
  )
}
