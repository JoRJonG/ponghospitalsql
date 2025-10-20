import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { sanitize } from '../utils/sanitize'
import { fastFetch } from '../utils/fastFetch'
import { responsiveImageProps } from '../utils/image'

type Activity = {
  _id: string
  title: string
  description?: string
  images?: Array<string | { url: string; publicId?: string }>
  date?: string
  viewCount?: number
}

export default function ActivityDetailPage() {
  const { id } = useParams()
  const [item, setItem] = useState<Activity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchDeltaX = useRef<number>(0)

  const images = useMemo(() => {
    const arr = (item?.images || []).map((im) => (typeof im === 'string' ? im : im?.url)).filter(Boolean) as string[]
    return arr
  }, [item])

  useEffect(() => {
    if (!id) return
    setError(null)
    setItem(null)
    fastFetch<Activity>(`/api/activities/${id}`, { ttlMs: 60_000, retries: 1 })
      .then((data) => {
        setItem(data)
        // Increment view count
        fetch(`/api/activities/${id}/view`, { method: 'POST' }).catch(console.error)
      })
      .catch((e) => setError(e?.message || 'เกิดข้อผิดพลาด'))
  }, [id])

  // Keyboard navigation when lightbox is open
  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      else if (e.key === 'ArrowRight') setCurrent((i) => (i + 1) % images.length)
      else if (e.key === 'ArrowLeft') setCurrent((i) => (i - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, images.length])

  const openAt = (idx: number) => {
    setCurrent(idx)
    setLightboxOpen(true)
  }
  const next = () => setCurrent((i) => (i + 1) % images.length)
  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length)

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }
  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current == null) return
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current
  }
  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    const threshold = 50
    if (touchDeltaX.current > threshold) prev()
    else if (touchDeltaX.current < -threshold) next()
    touchStartX.current = null
    touchDeltaX.current = 0
  }

  return (
    <div className="container-narrow py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">รายละเอียดกิจกรรม</h1>
  <Link to="/activities" className="text-sm text-green-700 hover:underline">กลับไปดูกิจกรรมทั้งหมด</Link>
      </div>

      {!item && !error && (
        <div className="space-y-3">
          <div className="h-8 w-2/3 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-1/3 bg-gray-200 animate-pulse rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-gray-200 aspect-[4/3] animate-pulse rounded" />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3">{error}</div>
      )}

      {item && (
        <article className="space-y-4">
          <h2 className="text-xl font-semibold">{item.title}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {item.date && <div>{new Date(item.date).toLocaleDateString()}</div>}
            {item.viewCount !== undefined && <div className="flex items-center gap-1"><i className="fas fa-eye"></i> {item.viewCount} ครั้ง</div>}
          </div>
          {item.description && (
            <div className="prose max-w-none" dangerouslySetInnerHTML={sanitize(item.description)} />
          )}
          {/* Images gallery */}
          {Array.isArray(item.images) && item.images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {item.images.map((im, idx) => {
                const src = typeof im === 'string' ? im : im?.url
                if (!src) return null
                const { src: rsrc, srcSet, sizes } = responsiveImageProps(src, { widths: [480, 640, 800, 1024, 1280], crop: 'fill' })
                return (
                  <img
                    key={idx}
                    src={rsrc}
                    srcSet={srcSet}
                    sizes={sizes}
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={600}
                    alt={`${item.title} ${idx + 1}`}
                    className="w-full aspect-[4/3] object-cover rounded cursor-zoom-in"
                    onClick={() => openAt(idx)}
                  />
                )
              })}
            </div>
          )}
        </article>
      )}

      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={(e) => {
            // close if click on backdrop (not on controls)
            if (e.target === e.currentTarget) setLightboxOpen(false)
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <div className="text-sm opacity-80">{current + 1} / {images.length}</div>
            <button aria-label="ปิด" className="btn btn-outline text-white border-white/40" onClick={() => setLightboxOpen(false)}>
              ปิด
            </button>
          </div>
          <div className="relative flex-1 flex items-center justify-center select-none" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <button
              aria-label="ก่อนหน้า"
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-3"
              onClick={(e) => { e.stopPropagation(); prev() }}
            >
              ‹
            </button>
            <img
              {...responsiveImageProps(images[current], { widths: [640, 800, 1024, 1440, 1920], sizes: '100vw', crop: 'fit' })}
              src={images[current]}
              alt={`image ${current + 1}`}
              loading="eager"
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
            <button
              aria-label="ถัดไป"
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-3"
              onClick={(e) => { e.stopPropagation(); next() }}
            >
              ›
            </button>
          </div>
          <div className="px-4 py-3 flex gap-2 overflow-x-auto">
            {images.map((src, i) => (
              <button key={i} className={`h-14 w-20 flex-shrink-0 rounded overflow-hidden ring-2 ${i===current? 'ring-white':'ring-transparent'}`} onClick={(e)=>{ e.stopPropagation(); setCurrent(i) }}>
                <img
                  {...responsiveImageProps(src, { widths: [160, 240, 320], crop: 'fill' })}
                  src={src}
                  loading="lazy"
                  decoding="async"
                  width={200}
                  height={140}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
