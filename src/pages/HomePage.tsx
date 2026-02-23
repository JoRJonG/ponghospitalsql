import { useEffect, useState, useRef } from 'react'
import HeroSlider from '../components/HeroSlider'
import HomeAnnouncements from '../components/HomeAnnouncements'
import LatestActivities from '../components/LatestActivities'
import PRPoster from '../components/PRPoster'
import UnitLinks from '../components/UnitLinks'
import { useHomepageRefresh } from '../contexts/useHomepageRefresh'
import SEO from '../components/SEO'
import { buildApiUrl } from '../utils/api'

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          el.classList.add('animate-fade-in')
          el.classList.remove('opacity-0')
        }
      })
    }, { threshold: 0.1 })
    el.classList.add('opacity-0', 'transition-opacity', 'duration-700', 'ease-out')
    obs.observe(el)

    // Fallback: show element after 1 second if not yet revealed
    const timer = setTimeout(() => {
      if (el && el.classList.contains('opacity-0')) {
        el.classList.add('animate-fade-in')
        el.classList.remove('opacity-0')
      }
    }, 1000)

    return () => {
      obs.disconnect()
      clearTimeout(timer)
    }
  }, [])
  return ref
}

export default function HomePage() {
  const { refreshKey } = useHomepageRefresh()
  const [isHeroSliderVisible, setIsHeroSliderVisible] = useState<boolean | null>(null)

  useEffect(() => {
    // Fetch hero slider visibility mode
    const fetchSliderMode = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/system/hero-slider-mode'))
        const result = await response.json()
        if (result?.success && result?.data?.mode) {
          setIsHeroSliderVisible(result.data.mode === 'show')
        } else {
          setIsHeroSliderVisible(true) // fallback
        }
      } catch (error) {
        console.error('Failed to loading hero slider mode', error)
        setIsHeroSliderVisible(true) // fallback
      }
    }
    fetchSliderMode()
  }, [])

  /* scroll-reveal refs สำหรับทุก section */
  const heroSliderRef = useReveal<HTMLDivElement>()
  const posterRef = useReveal<HTMLDivElement>()
  const announcementsRef = useReveal<HTMLDivElement>()
  const activitiesRef = useReveal<HTMLDivElement>()
  const unitsRef = useReveal<HTMLDivElement>()

  // Deflect rendering entirely until we know the top-level layout state
  // to prevent any possibility of a structural CLS (Layout Shift)
  if (isHeroSliderVisible === null) {
    return <div className="min-h-screen bg-slate-50"></div>
  }

  return (
    <div className="relative min-h-screen bg-slate-50 animate-fade-in">
      {/* SEO meta tags สำหรับหน้าแรก — ใช้ชื่อ site เป็น title หลัก */}
      <SEO description="โรงพยาบาลปง จังหวัดพะเยา ให้บริการด้านสุขภาพครบวงจร ตรวจรักษาทั่วไป ฉุกเฉิน 24 ชม. ข่าวสาร กิจกรรม และประกาศจัดซื้อจัดจ้าง" />

      {isHeroSliderVisible && (
        <div ref={heroSliderRef} className={`transform transition-[opacity,transform] duration-700 ease-out bg-white`}>
          <h1 className="sr-only">โรงพยาบาลปง จังหวัดพะเยา - บริการสุขภาพครบวงจร</h1>
          <HeroSlider />
        </div>
      )}

      {/* PR Poster — เปลี่ยนพื้นหลังเพื่อให้เกิด Contrast ตัดกับ HeroSlider ด้านบนและ Announcements ด้านล่าง */}
      <section ref={posterRef} className={`relative py-8 md:py-16 bg-slate-50 overflow-hidden border-t border-gray-100/50 bg-noise ${isHeroSliderVisible ? 'section-wave-top mt-2' : ''}`}>
        {/* Decorative blob สร้าง atmosphere — เบลอหนักจนแทบไม่เห็น */}
        <div className="decorative-blob decorative-blob-emerald w-72 h-72 -top-20 -right-20 opacity-30" />
        <div className="container-narrow relative z-10">
          {/* Header section for posters */}

          <PRPoster embedded={true} />
        </div>
      </section>

      {/* ประกาศข่าวสาร — wave top + clean bg */}
      <section ref={announcementsRef} className="relative py-6 md:py-12 bg-white section-wave-top overflow-hidden">
        <div className="decorative-blob decorative-blob-amber w-80 h-80 -bottom-24 -left-24" />
        <div className="container-narrow relative z-10">
          <HomeAnnouncements key={`announcements-${refreshKey}`} limit={6} embedded={true} />
        </div>
      </section>

      {/* ภาพกิจกรรม — noise overlay + blob */}
      <section ref={activitiesRef} className="relative py-6 md:py-12 bg-slate-50 bg-noise overflow-hidden border-t border-gray-100/50">
        <div className="decorative-blob decorative-blob-emerald w-64 h-64 top-10 -left-16" />
        <div className="container-narrow relative z-10">
          <LatestActivities key={`activities-${refreshKey}`} limit={8} embedded={true} />
        </div>
      </section>

      {/* ลิงก์หน่วยงาน */}
      <section ref={unitsRef} className="relative py-6 md:py-12 bg-white section-wave-top overflow-hidden">
        <div className="container-narrow relative z-10">
          <UnitLinks embedded={true} />
        </div>
      </section>
    </div>
  )
}
