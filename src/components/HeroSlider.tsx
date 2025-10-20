import { useEffect, useMemo, useState } from 'react'
import { responsiveImageProps, cloudinaryTransform, isCloudinaryUrl } from '../utils/image'

type Slide = { src: string; alt?: string; caption?: string; href?: string; duration?: number }

// No sample data by default; leave empty so the slider stays minimal when no API slides
const fallbackSlides: Slide[] = []

export default function HeroSlider({ slides: provided }: { slides?: Slide[] }) {
  const [idx, setIdx] = useState(0)
  const [slides, setSlides] = useState<Slide[]>(provided || [])

  useEffect(() => {
    let stop = false
    async function load() {
      try {
        const r = await fetch('/api/slides')
        if (!stop) {
          if (r.ok) {
            const list = await r.json()
            const mapped: Slide[] = (list || []).map((s: any) => ({
              src: s?.image?.url || s?.src,
              alt: s?.title || 'slide',
              caption: s?.caption || s?.title,
              href: s?.href || s?.url || s?.link,
              duration: s?.duration || 5,
            })).filter((s: Slide) => Boolean(s.src))
            if (mapped.length) setSlides(mapped)
            else if (!provided) setSlides(fallbackSlides)
          } else if (!provided) {
            setSlides(fallbackSlides)
          }
        }
      } catch {
        if (!stop && !provided) setSlides(fallbackSlides)
      }
    }
    if (!provided) load()
    else setSlides(provided)
    return () => { stop = true }
  }, [provided])

  useEffect(() => {
    if (!slides.length) return
    const currentSlide = slides[idx]
    const slideInterval = (currentSlide?.duration || 5) * 1000 // Convert seconds to milliseconds
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), slideInterval)
    return () => clearInterval(t)
  }, [slides, idx])

  // Precompute tiny background previews once per slides change to avoid calling hooks inside loops
  const bgUrls = useMemo(() => {
    return slides.map(s => {
      if (isCloudinaryUrl(s.src)) {
        return cloudinaryTransform(s.src, { w: 40, h: 20, crop: 'fill', quality: 'auto:eco', format: 'auto' })
      }
      // Fallback: use the original image as background for non-Cloudinary sources
      return s.src || undefined
    })
  }, [slides])

  return (
    <div className="md:w-full py-2 md:py-0">
      <div className="md:container-narrow">
        <div className="relative w-full h-[200px] md:h-[70vh] lg:h-[92vh] overflow-hidden bg-white md:bg-transparent rounded-xl md:rounded-none shadow md:shadow-none">
        {slides.map((s, i) => {
          const props = responsiveImageProps(s.src, { widths: [480, 768, 1024, 1440], crop: 'fit', sizes: '100vw' })
          const bg = bgUrls[i]
          return (
            <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              {/* Blurred LQIP background behind the main image */}
              {bg && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 z-0 pointer-events-none"
                  style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px)', transform: 'scale(1.05)' }}
                />
              )}
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
              {s.href && (
                <a
                  href={s.href}
                  target={/^https?:\/\//i.test(s.href) ? '_blank' : undefined}
                  rel={/^https?:\/\//i.test(s.href) ? 'noopener noreferrer' : undefined}
                  className="absolute inset-0 z-20"
                  aria-label={s.alt || s.caption || 'slide link'}
                />
              )}
            </div>
          )
        })}
        {/* Caption overlay removed per request */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`slide ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-3 w-3 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/60 hover:bg-white/80'}`}
              style={{ outline: 'none' }}
              onFocus={()=>{ /* keep to allow focus-visible CSS to show */ }}
            />
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}
