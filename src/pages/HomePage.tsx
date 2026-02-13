import { useEffect, useState } from 'react'
import HeroSlider from '../components/HeroSlider'
import HomeAnnouncements from '../components/HomeAnnouncements'
import LatestActivities from '../components/LatestActivities'
import PRPoster from '../components/PRPoster'
import UnitLinks from '../components/UnitLinks'
import { useRef } from 'react'
import { useHomepageRefresh } from '../contexts/useHomepageRefresh'
import SEO from '../components/SEO'

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          el.classList.add('animate-fade-in')
          el.classList.remove('opacity-0', 'translate-y-4')
        }
      })
    }, { threshold: 0.1 })
    el.classList.add('opacity-0', 'translate-y-4', 'transition-[opacity,transform]', 'duration-700', 'ease-out')
    obs.observe(el)

    // Fallback: show element after 1 second if not yet revealed
    const timer = setTimeout(() => {
      if (el && el.classList.contains('opacity-0')) {
        el.classList.add('animate-fade-in')
        el.classList.remove('opacity-0', 'translate-y-4')
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
  const [mounted, setMounted] = useState(false)
  const { refreshKey } = useHomepageRefresh()
  useEffect(() => { setMounted(true) }, [])

  /* scroll-reveal refs สำหรับทุก section */
  const posterRef = useReveal<HTMLDivElement>()
  const announcementsRef = useReveal<HTMLDivElement>()
  const activitiesRef = useReveal<HTMLDivElement>()
  const unitsRef = useReveal<HTMLDivElement>()

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* SEO meta tags สำหรับหน้าแรก — ใช้ชื่อ site เป็น title หลัก */}
      <SEO description="โรงพยาบาลปง จังหวัดพะเยา ให้บริการด้านสุขภาพครบวงจร ตรวจรักษาทั่วไป ฉุกเฉิน 24 ชม. ข่าวสาร กิจกรรม และประกาศจัดซื้อจัดจ้าง" />
      <div className={`transform transition-all duration-700 ease-out ${mounted ? 'animate-fade-in' : 'opacity-0 translate-y-4'}`}>
        <HeroSlider />
      </div>

      {/* PR Poster — wave top + decorative blob */}
      <section ref={posterRef} className="relative py-6 md:py-12 bg-white section-wave-top overflow-hidden">
        {/* Decorative blob สร้าง atmosphere — เบลอหนักจนแทบไม่เห็น */}
        <div className="decorative-blob decorative-blob-emerald w-72 h-72 -top-20 -right-20" />
        <div className="container-narrow relative z-10">
          <PRPoster embedded={true} />
        </div>
      </section>

      {/* ประกาศข่าวสาร — noise overlay + blob */}
      <section ref={announcementsRef} className="relative py-6 md:py-12 bg-slate-50 bg-noise overflow-hidden">
        <div className="decorative-blob decorative-blob-amber w-80 h-80 -bottom-24 -left-24" />
        <div className="container-narrow relative z-10">
          <HomeAnnouncements key={`announcements-${refreshKey}`} limit={6} embedded={true} />
        </div>
      </section>

      {/* ภาพกิจกรรม — wave top + clean bg */}
      <section ref={activitiesRef} className="relative py-6 md:py-12 bg-white section-wave-top overflow-hidden">
        <div className="decorative-blob decorative-blob-emerald w-64 h-64 top-10 -left-16" />
        <div className="container-narrow relative z-10">
          <LatestActivities key={`activities-${refreshKey}`} limit={8} embedded={true} />
        </div>
      </section>

      {/* ลิงก์หน่วยงาน */}
      <section ref={unitsRef} className="relative py-6 md:py-12 bg-slate-50 bg-noise overflow-hidden">
        <div className="container-narrow relative z-10">
          <UnitLinks embedded={true} />
        </div>
      </section>
    </div>
  )
}
