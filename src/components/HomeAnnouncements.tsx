import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

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
  const [items, setItems] = useState<Announcement[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('ทั้งหมด')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setError(null)
    fetch('/api/announcements', { signal: ac.signal })
      .then(async response => {
        if (!response.ok) {
          let message = 'ไม่สามารถดึงประกาศล่าสุดได้'
          try {
            const data = await response.json() as { error?: string }
            if (data?.error) message = data.error
          } catch (parseError) {
            console.warn('[HomeAnnouncements] parse error response failed', parseError)
          }
          const err = Object.assign(new Error(message), { status: response.status })
          throw err
        }
        return response.json() as Promise<Announcement[]>
      })
      .then(list => setItems(list.slice(0, limit)))
      .catch((thrown: unknown) => {
        if (thrown instanceof DOMException && thrown.name === 'AbortError') {
          return
        }
        if (thrown instanceof Error) {
          setItems([])
          setError(thrown.message || 'เกิดข้อผิดพลาด')
          return
        }
        setItems([])
        setError('เกิดข้อผิดพลาด')
      })
    return () => ac.abort()
  }, [limit])

  const isNew = (a: Announcement) => {
    if (!a.publishedAt) return false
    const diff = Date.now() - new Date(a.publishedAt).getTime()
    return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000
  }

  const filtered = activeTab === 'ทั้งหมด'
    ? items?.slice(0, limit) || null
    : items?.filter(i => i.category === activeTab).slice(0, limit) || null

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
            <h3 className="text-xs font-bold text-emerald-600 tracking-widest uppercase mb-1">News Update</h3>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">ข่าวประชาสัมพันธ์ <br />และประกาศจัดซื้อ</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              ติดตามข้อมูลข่าวสารการจัดซื้อจัดจ้าง การรับสมัครงาน และประกาศสำคัญต่างๆ จากโรงพยาบาลได้ที่นี่
            </p>
            <Link
              to="/announcements"
              className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 rounded text-slate-700 hover:bg-white hover:border-emerald-500 hover:text-emerald-700 transition font-medium text-sm w-full md:w-auto"
            >
              ดูประกาศทั้งหมด
            </Link>
          </div>

          <div className="hidden lg:flex flex-col gap-2">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                className={`text-left px-4 py-3 border-l-4 transition rounded-r ${
                  activeTab === t.key
                    ? 'bg-white border-emerald-500 shadow-sm font-semibold text-emerald-800'
                    : 'border-transparent hover:bg-white hover:border-slate-300 text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.key}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">

        {items === null && (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="block bg-white p-4 rounded-lg shadow-sm border border-slate-100 animate-pulse">
                <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
                <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-1/2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-3">{error}</div>
        )}

        {Array.isArray(filtered) && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map(a => {
              const categoryColors: Record<Announcement['category'], { label: string }> = {
                'ประกาศจัดซื้อจัดจ้าง': { label: 'จัดซื้อจัดจ้าง' },
                'สมัครงาน': { label: 'รับสมัครงาน' },
                'ประชาสัมพันธ์': { label: 'ประชาสัมพันธ์' },
                'ประกาศ': { label: 'ประกาศ' },
              }
              const colors = categoryColors[a.category] || categoryColors['ประกาศ']
              
              return (
                <Link
                  to={`/announcement/${a._id}`}
                  key={a._id}
                  className={
                    `block bg-white p-4 rounded-lg shadow-sm border border-slate-100 transition group relative overflow-hidden ` +
                    `hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-lg`
                  }
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass[a.category] || 'bg-slate-100 text-slate-700'} group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors duration-200`}>
                          {colors.label}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }).replace(/\./g, '').replace('พ.ย', 'พ.ย.') : ''}
                        </span>
                        {a.viewCount !== undefined && a.viewCount > 0 && (
                          <>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="text-slate-400 text-xs flex items-center gap-1">
                              <i className="far fa-eye"></i> {a.viewCount}
                            </span>
                          </>
                        )}
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
                      <h3 className="text-base font-semibold text-slate-800 transition">
                        <span className="group-hover:text-emerald-700 transition-colors duration-200">{a.title}</span>
                      </h3>
                      {a.content && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{stripHtml(a.content)}</p>
                      )}
                      <div className="mt-2">&nbsp;</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {Array.isArray(filtered) && filtered.length === 0 && !error && (
          <div className="text-slate-500">ยังไม่มีประกาศ</div>
        )}
        </div>
      </div>
    )
  }

  return (
    <section className="py-8 bg-gray-50">
      <div className="container-narrow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold">ประกาศล่าสุด</h3>
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
          <div className="relative z-10 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-md shadow-sm">
            <div className="grid grid-cols-2 gap-2 px-3 py-3 sm:flex sm:flex-nowrap sm:gap-2">
              {tabs.map(t => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={activeTab === t.key}
                  aria-controls={`panel-${t.key}`}
                  onClick={() => setActiveTab(t.key)}
                  className={`inline-flex items-center gap-2 w-full justify-center sm:w-auto sm:flex-none sm:justify-start px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === t.key
                      ? 'bg-green-600 text-white shadow'
                      : 'bg-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <i className={`fa-solid ${t.icon}`} aria-hidden="true"></i>
                  <span className="sm:text-left">{t.key}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {items === null && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card">
                <div className="card-body animate-pulse">
                  <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-3">{error}</div>
        )}

        {Array.isArray(filtered) && filtered.length > 0 && (
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
                  to={`/announcement/${a._id}`}
                  key={a._id}
                  className="block w-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 px-4 py-3 md:py-4 md:px-6 group"
                >
                  <div className="flex items-start gap-3 md:gap-5">
                    {/* Icon */}
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-50 border border-gray-100">
                      <i className={`fa-solid ${style.icon} ${style.iconColor} text-lg md:text-xl`}></i>
                    </div>
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass[a.category] || style.badge} group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors duration-200`}>{a.category}</span>
                        {isNew(a) && (
                          <span className="chip-new ml-1">
                            <span className="dot-pulse">
                              <span className="dot-pulse__ping" />
                              <span className="dot-pulse__dot" />
                            </span>
                            ใหม่
                          </span>
                        )}
                        <span className="text-gray-400 text-xs">
                          <i className="fa-regular fa-calendar mr-1" />
                          {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </span>
                        {a.viewCount !== undefined && a.viewCount > 0 && (
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <i className="fa-regular fa-eye" /> {a.viewCount}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-gray-900 text-sm md:text-base group-hover:text-emerald-700 transition line-clamp-2">{a.title}</div>
                      {a.content && <div className="text-xs text-gray-600 mt-1 line-clamp-1">{stripHtml(a.content)}</div>}
                        <div className="mt-2">&nbsp;</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {Array.isArray(filtered) && filtered.length === 0 && !error && (
          <div className="text-gray-500">
            {activeTab === 'ทั้งหมด' ? 'ยังไม่มีประกาศ' : `ยังไม่มีประกาศในหมวด${activeTab}`}
          </div>
        )}
      </div>
    </section>
  )
}
