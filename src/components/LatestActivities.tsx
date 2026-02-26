import { Link } from 'react-router-dom'
import { responsiveImageProps } from '../utils/image'
import { buildApiUrl } from '../utils/api'
import { useHomepageRefresh } from '../contexts/useHomepageRefresh'
import { useSWR } from '../hooks/useSWR'
import logo from '../assets/logo-150x150.png'

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
  const { refreshKey } = useHomepageRefresh()

  // ใช้ useSWR สำหรับ data fetching พร้อม caching
  const { data: items, error: fetchError, isLoading } = useSWR<Activity[]>(
    `activities-${limit}-${refreshKey}`, // cache key ที่ unique
    async () => {
      const response = await fetch(buildApiUrl(`/api/activities?published=true&limit=${limit}`))
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงกิจกรรมได้')
      }
      return response.json()
    },
    {
      staleTime: 10000, // ข้อมูลถือว่าสดภายใน 10 วินาที
      cacheTime: 300000, // เก็บ cache ไว้ 5 นาที
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  const error = fetchError ? (fetchError.message || 'เกิดข้อผิดพลาด') : null

  return embedded ? (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 text-balance">ภาพกิจกรรม</h2>
          <p className="text-gray-600 text-sm">รวมภาพกิจกรรมและโครงการต่างๆ ของโรงพยาบาล</p>
        </div>
        <Link
          to="/activities"
          className="btn btn-outline inline-flex items-center gap-1 transition-transform hover:translate-x-0.5"
          aria-label="ดูทั้งหมดกิจกรรม"
        >
          ดูทั้งหมด <span aria-hidden>→</span>
        </Link>
      </div>
      {isLoading ? (
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
      ) : null}
      {Array.isArray(items) && items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((a, i) => {
            const first = a.images && a.images.length ? a.images[0] : undefined
            const img = typeof first === 'string' ? first : first?.url
              || logo
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
                {/* stagger-item + delay ให้ cards ปรากฏทีละใบ */}
                <article className={`group cursor-pointer stagger-item stagger-delay-${Math.min(i, 11)} bg-white/90 shadow-sm border border-gray-100 p-3 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-[transform,box-shadow] duration-300`}>
                  <div className="overflow-hidden rounded-xl shadow-inner mb-3">
                    <img
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={300}
                      src={src}
                      srcSet={srcSet}
                      sizes={sizes}
                      alt={a.title ? `กิจกรรม: ${a.title}` : 'กิจกรรม'}
                      className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {categoryColor && a.category ? (
                      <span className={`absolute top-3 left-3 ${categoryColor.bg} ${categoryColor.text} px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide shadow-lg`}>
                        {a.category}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                    {a.date ? (
                      <>
                        <span><i className="far fa-calendar mr-1"></i> {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(a.date))}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      </>
                    ) : null}
                    {a.viewCount !== undefined && a.viewCount > 0 ? (
                      <span><i className="far fa-eye mr-1"></i> {a.viewCount} views</span>
                    ) : null}
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-slate-800 leading-snug group-hover:text-emerald-500 transition mb-2">
                    {a.title}
                  </h3>
                  {a.description ? (
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {stripHtml(a.description)}
                    </p>
                  ) : null}

                </article>
              </Link>
            )
          })}
        </div>
      ) : null}
      {error ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mt-3">{error}</div>
      ) : null}
      {Array.isArray(items) && items.length === 0 && !error ? (
        <div className="text-gray-500">ยังไม่มีกิจกรรม</div>
      ) : null}
    </>
  ) : (
    <section className="py-8 bg-white">
      <div className="container-narrow">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-balance">กิจกรรมล่าสุด</h3>
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
        {isLoading ? (
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
        ) : null}
        {Array.isArray(items) && items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map(a => {
              const first = a.images && a.images.length ? a.images[0] : undefined
              const img = typeof first === 'string' ? first : first?.url
                || logo
              const { src, srcSet, sizes } = responsiveImageProps(img, { widths: [320, 480, 640, 800], crop: 'fill', sizes: '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw' })
              return (
                <Link to={`/activities/${a._id}`} key={a._id} className="card overflow-hidden group transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-300 border-0 shadow-lg">
                  <div className="relative">
                    <img
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={300}
                      src={src}
                      srcSet={srcSet}
                      sizes={sizes}
                      alt={a.title ? `กิจกรรม: ${a.title}` : 'กิจกรรม'}
                      className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                      <div className="font-semibold line-clamp-2 text-xs md:text-sm leading-tight mb-1">{a.title}</div>
                      {a.date ? <div className="text-[10px] md:text-xs opacity-90">{new Intl.DateTimeFormat('th-TH').format(new Date(a.date))}</div> : null}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : null}
        {error ? (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mt-3">{error}</div>
        ) : null}
        {Array.isArray(items) && items.length === 0 && !error ? (
          <div className="text-gray-500">ยังไม่มีกิจกรรม</div>
        ) : null}
      </div>
    </section>
  )
}
