import { useEffect, useRef } from 'react'
import SEO from '../components/SEO'
// useHomepageRefresh hook no longer directly used in HomePage rendering
import { buildApiUrl } from '../utils/api'
import { useSWR } from '../hooks/useSWR'

import HeroSlider from '../components/HeroSlider'
import HomeAnnouncements from '../components/HomeAnnouncements'
import LatestActivities from '../components/LatestActivities'
import PRPoster from '../components/PRPoster'
import UnitLinks from '../components/UnitLinks'

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

  const { data: sliderData, error: sliderError } = useSWR<{ success: boolean; data?: { mode: string } }>(
    buildApiUrl('/api/system/hero-slider-mode'),
    async () => {
      const response = await fetch(buildApiUrl('/api/system/hero-slider-mode'))
      return response.json()
    },
    { revalidateOnFocus: false, staleTime: 300000, cacheTime: 1800000 }
  )

  const isHeroSliderVisible = sliderError ? true : sliderData ? (sliderData.success && sliderData.data?.mode === 'show') : null

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

      {isHeroSliderVisible ? (
        <div ref={heroSliderRef} className={`transform transition-[opacity,transform] duration-700 ease-out bg-white`}>
          <h1 className="sr-only">โรงพยาบาลปง จังหวัดพะเยา - บริการสุขภาพครบวงจร</h1>
          <HeroSlider />
        </div>
      ) : null}

      {/* PR Poster */}
      <section ref={posterRef} className={`relative py-8 md:py-16 bg-gray-100 overflow-hidden border-t border-gray-100/50 ${isHeroSliderVisible ? 'section-wave-top mt-2' : ''}`}>
        <div className="decorative-blob animate-blob decorative-blob-emerald w-72 h-72 -top-20 -right-20 opacity-30" />
        <div className="container-narrow relative z-10 min-h-[400px]">
          <PRPoster embedded={true} />
        </div>
      </section>

      {/* ประกาศข่าวสาร — ลบ section-wave-top ออก เพราะ overflow-hidden clip wave อยู่แล้ว ทำให้ CLS */}
      <section ref={announcementsRef} className="relative py-6 md:py-12 bg-white overflow-hidden">
        <div className="decorative-blob animate-blob animation-delay-2000 decorative-blob-amber w-80 h-80 -bottom-24 -left-24" />
        <div className="container-narrow relative z-10 min-h-[500px] lg:min-h-[700px]">
          <HomeAnnouncements limit={6} embedded={true} />
        </div>
      </section>

      {/* ภาพกิจกรรม */}
      <section ref={activitiesRef} className="relative py-6 md:py-12 bg-gray-100 overflow-hidden border-t border-gray-100/50">
        <div className="decorative-blob animate-blob animation-delay-4000 decorative-blob-emerald w-64 h-64 top-10 -left-16" />
        <div className="container-narrow relative z-10 min-h-[500px]">
          <LatestActivities limit={8} embedded={true} />
        </div>
      </section>

      {/* ลิงก์หน่วยงาน — ลบ section-wave-top ออก เพราะ overflow-hidden clip wave อยู่แล้ว */}
      <section ref={unitsRef} className="relative py-6 md:py-12 bg-white overflow-hidden">
        <div className="container-narrow relative z-10">
          <UnitLinks embedded={true} />
        </div>
      </section>
    </div>
  )
}
