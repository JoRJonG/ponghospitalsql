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
    el.classList.add('opacity-0', 'translate-y-4', 'transition-all', 'duration-700', 'ease-out')
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

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* SEO meta tags สำหรับหน้าแรก — ใช้ชื่อ site เป็น title หลัก */}
      <SEO description="โรงพยาบาลปง จังหวัดพะเยา ให้บริการด้านสุขภาพครบวงจร ตรวจรักษาทั่วไป ฉุกเฉิน 24 ชม. ข่าวสาร กิจกรรม และประกาศจัดซื้อจัดจ้าง" />
      <div className={`transform transition-all duration-700 ease-out ${mounted ? 'animate-fade-in' : 'opacity-0 translate-y-4'}`}>
        <HeroSlider />
      </div>

      <section className="py-6 md:py-12 bg-white">
        <div className="container-narrow">
          <PRPoster embedded={true} />
        </div>
      </section>

      <section ref={useReveal<HTMLDivElement>()} className="py-6 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-narrow">
          <HomeAnnouncements key={`announcements-${refreshKey}`} limit={6} embedded={true} />
        </div>
      </section>

      <section className="py-6 md:py-12 bg-white border-t border-slate-200">
        <div className="container-narrow">
          <LatestActivities key={`activities-${refreshKey}`} limit={8} embedded={true} />
        </div>
      </section>

      <section className="py-6 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-narrow">
          <UnitLinks embedded={true} />
        </div>
      </section>
    </div>
  )
}
