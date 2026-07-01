import { useEffect, useMemo, useState, useCallback } from 'react'
import { responsiveImageProps, cloudinaryTransform, isCloudinaryUrl, nonCdnResponsiveUrl } from '../utils/image'
import { useSWR } from '../hooks/useSWR'

type Slide = { src: string; alt?: string; caption?: string; href?: string; duration?: number }

type ApiSlide = {
  image?: { url?: string | null } | null
  src?: string | null
  title?: string | null
  caption?: string | null
  href?: string | null
  url?: string | null
  link?: string | null
  duration?: number | string | null
}

const toSlide = (raw: ApiSlide): Slide | null => {
  const imageUrl = typeof raw?.image?.url === 'string' && raw.image.url.trim() ? raw.image.url : undefined
  const directSrc = typeof raw?.src === 'string' && raw.src.trim() ? raw.src : undefined
  const fallbackSrcCandidate = typeof raw?.url === 'string' && raw.url.trim() ? raw.url : undefined
  const linkSrcCandidate = typeof raw?.link === 'string' && raw.link.trim() ? raw.link : undefined
  const src = imageUrl || directSrc || fallbackSrcCandidate || linkSrcCandidate
  if (!src) return null

  const title = typeof raw?.title === 'string' ? raw.title : undefined
  const caption = typeof raw?.caption === 'string' ? raw.caption : title
  const hrefCandidate = typeof raw?.href === 'string' && raw.href.trim() ? raw.href : undefined
  const urlCandidate = typeof raw?.url === 'string' && raw.url.trim() ? raw.url : undefined
  const linkCandidate = typeof raw?.link === 'string' && raw.link.trim() ? raw.link : undefined
  const durationRaw = typeof raw?.duration === 'number' ? raw.duration : Number(raw?.duration)

  return {
    src,
    alt: title || 'slide',
    caption: caption || undefined,
    href: hrefCandidate || urlCandidate || linkCandidate,
    duration: Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined,
  }
}

// No sample data by default; leave empty so the slider stays minimal when no API slides
const fallbackSlides: Slide[] = []

export default function HeroSlider({ slides: provided }: { slides?: Slide[] }) {
  const [idx, setIdx] = useState(0)

  // สร้าง fetcher function ด้วย useCallback เพื่อป้องกันการสร้างใหม่ทุก render
  const slidesFetcher = useCallback(async () => {
    const response = await fetch('/api/slides')
    if (!response.ok) {
      throw new Error('Failed to load slides')
    }
    return response.json()
  }, [])

  // ใช้ useSWR สำหรับโหลด slides จาก API (ถ้าไม่มี provided slides)
  const { data: apiSlides } = useSWR<ApiSlide[]>(
    provided ? null : '/api/slides', // ถ้ามี provided slides ไม่ต้องเรียก API
    slidesFetcher,
    {
      // ข้อมูล slides ไม่ค่อยเปลี่ยน
      staleTime: 300000, // 5 นาที
      cacheTime: 1800000, // 30 นาที
      revalidateOnFocus: false, // ไม่รีเฟรชเมื่อกลับมาที่หน้าต่าง
      revalidateOnReconnect: false, // ไม่รีเฟรชเมื่ออินเทอร์เน็ตกลับมา
    }
  )

  // แปลง API slides เป็น Slide objects
  const slides = useMemo(() => {
    if (provided) return provided
    if (!apiSlides || !Array.isArray(apiSlides)) return fallbackSlides

    const mapped = apiSlides
      .map(item => toSlide(item))
      .filter((slide): slide is Slide => Boolean(slide))

    return mapped.length > 0 ? mapped : fallbackSlides
  }, [provided, apiSlides])

  useEffect(() => {
    if (!slides.length) return
    const currentSlide = slides[idx]
    const slideInterval = (currentSlide?.duration || 5) * 1000 // Convert seconds to milliseconds
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), slideInterval)
    return () => clearInterval(t)
  }, [slides, idx])

  const prev = useCallback(() => setIdx(i => (i - 1 + slides.length) % slides.length), [slides.length])
  const next = useCallback(() => setIdx(i => (i + 1) % slides.length), [slides.length])

  // Precompute tiny background previews once per slides change to avoid calling hooks inside loops
  const bgUrls = useMemo(() => {
    return slides.map(s => {
      if (isCloudinaryUrl(s.src)) {
        return cloudinaryTransform(s.src, { w: 40, h: 20, crop: 'fill', quality: 'auto:eco', format: 'auto' })
      }
      // Fallback: use the original image as background for non-Cloudinary sources
      return s.src ? nonCdnResponsiveUrl(s.src, 40) : undefined
    })
  }, [slides])

  return (
    <div className="w-full">
      <div>
        <div
          className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-auto md:h-[60vh] overflow-hidden bg-slate-50"
          role="region"
          aria-label="สไลด์ภาพโรงพยาบาล"
          aria-roledescription="carousel"
        >
          {slides.map((s, i) => {
            const props = responsiveImageProps(s.src, { widths: [480, 768, 1024, 1440], crop: 'fit', sizes: '100vw' })
            const bg = bgUrls[i]
            return (
              <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {/* Blurred LQIP background behind the main image */}
                {bg ? (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px)', transform: 'scale(1.05)' }}
                  />
                ) : null}
                {/* Single foreground image */}
                <img
                  src={props.src || s.src}
                  srcSet={props.srcSet}
                  sizes={props.sizes}
                  alt={s.alt || 'slide'}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`absolute inset-0 z-10 h-full w-full object-contain object-center ${s.href ? 'cursor-pointer' : ''}`}
                />
                {s.href ? (
                  <a
                    href={s.href}
                    target={/^https?:\/\//i.test(s.href) ? '_blank' : undefined}
                    rel={/^https?:\/\//i.test(s.href) ? 'noopener noreferrer' : undefined}
                    className="absolute inset-0 z-20"
                    aria-label={s.alt || s.caption || 'slide link'}
                  />
                ) : null}
              </div>
            )
          })}

          {/* Prev / Next Navigation Arrows */}
          {slides.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="สไลด์ก่อนหน้า"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
              >
                <i className="fa-solid fa-chevron-left text-sm md:text-base" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="สไลด์ถัดไป"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
              >
                <i className="fa-solid fa-chevron-right text-sm md:text-base" aria-hidden="true" />
              </button>
            </>
          ) : null}

          {/* Caption overlay removed per request */}
          {/* Progress bar — แสดง countdown ของ slide ปัจจุบัน */}
          {slides.length > 1 ? (
            <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/20">
              <div
                key={`progress-${idx}`}
                className="h-full bg-white/70 slide-progress-bar"
                style={{ '--slide-duration': `${(slides[idx]?.duration || 5)}s` } as React.CSSProperties}
              />
            </div>
          ) : null}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                aria-label={`สไลด์${i + 1}${s.alt ? `: ${s.alt}` : ''}`}
                aria-current={i === idx ? 'true' : undefined}
                onClick={() => setIdx(i)}
                className={`h-3 w-3 rounded-full transition-[background-color,transform,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none ${i === idx ? 'bg-white scale-110 shadow-md' : 'bg-white/50 hover:bg-white/80'}`}
                onFocus={() => { /* keep to allow focus-visible CSS to show */ }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
