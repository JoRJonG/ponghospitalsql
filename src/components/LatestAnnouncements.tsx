import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
}

type HttpError = Error & { status?: number }

const categoryToPath: Record<Announcement['category'], string> = {
  'สมัครงาน': '/announcements/jobs',
  'ประชาสัมพันธ์': '/announcements/news',
  'ประกาศ': '/announcements/notices',
  'ประกาศจัดซื้อจัดจ้าง': '/announcements/procurement',
}

export default function LatestAnnouncements({ limit = 5, embedded = false }: { limit?: number, embedded?: boolean }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<Announcement[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setError(null)
    fetch('/api/announcements', { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) {
          let message = 'ไม่สามารถดึงประกาศล่าสุดได้'
          try {
            const data = await r.json() as { error?: string }
            if (typeof data?.error === 'string') message = data.error
          } catch (jsonError) {
            console.error('Failed to parse announcements response', jsonError)
          }
          const err: HttpError = new Error(message)
          err.status = r.status
          throw err
        }
        return r.json()
      })
      .then((list: Announcement[]) => setItems(list.slice(0, limit)))
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
  }, [limit])

  const isNew = (a: Announcement) => {
    if (!a.publishedAt) return false
    const diff = Date.now() - new Date(a.publishedAt).getTime()
    return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000 // ภายใน 3 วัน
  }

  return embedded ? (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          ประกาศล่าสุด
        </h2>
        <p className="text-sm text-gray-600">ข่าวสารและประกาศสำคัญจากโรงพยาบาล</p>
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
      {Array.isArray(items) && items.length > 0 && (
        <div className="space-y-3">
          {items.map(a => (
            <Link
              to={`/announcement/${a._id}`}
              key={a._id}
              className="card block transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="card-body">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <span className="badge blue">{a.category}</span>
                  <span className="text-sm text-gray-500">{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ''}</span>
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
                <div className="text-base font-semibold text-gray-800">{a.title}</div>
                {a.content && <div className="text-sm text-gray-600 line-clamp-2">{stripHtml(a.content)}</div>}
                <div className="mt-3">
                  <button
                    type="button"
                    className="text-green-700 hover:underline inline-flex items-center gap-1"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigate(categoryToPath[a.category])
                    }}
                  >
                    ดูหมวดนี้ →
                  </button>
                  
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {Array.isArray(items) && items.length === 0 && !error && (
        <div className="text-gray-500">ยังไม่มีประกาศ</div>
      )}
    </>
  ) : (
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
      {Array.isArray(items) && items.length > 0 && (
        <div className="space-y-3">
          {items.map(a => (
            <Link
              to={`/announcement/${a._id}`}
              key={a._id}
              className="card block transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="card-body">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <span className="badge blue">{a.category}</span>
                  <span className="text-gray-500">{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ''}</span>
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
                {a.content && <div className="text-sm text-gray-600 line-clamp-2">{stripHtml(a.content)}</div>}
                <div className="mt-3">
                  <button
                    type="button"
                    className="text-green-700 hover:underline inline-flex items-center gap-1"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigate(categoryToPath[a.category])
                    }}
                  >
                    ดูหมวดนี้ →
                  </button>
                  
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {Array.isArray(items) && items.length === 0 && !error && (
        <div className="text-gray-500">ยังไม่มีประกาศ</div>
      )}
      </div>
    </section>
  )
}
