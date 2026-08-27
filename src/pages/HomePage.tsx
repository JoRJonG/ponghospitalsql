import { useEffect, useRef, lazy, Suspense } from 'react'
import SEO from '../components/SEO'
// useHomepageRefresh hook no longer directly used in HomePage rendering
import { buildApiUrl } from '../utils/api'
import { useSWR } from '../hooks/useSWR'

import HeroSlider from '../components/HeroSlider'

const HomeAnnouncements = lazy(() => import('../components/HomeAnnouncements'))
const LatestActivities = lazy(() => import('../components/LatestActivities'))
const PRPoster = lazy(() => import('../components/PRPoster'))
const UnitLinks = lazy(() => import('../components/UnitLinks'))

const SectionSkeleton = () => (
  <div className="w-full animate-pulse space-y-6 opacity-50">
    <div className="h-8 bg-slate-200 rounded w-1/3"></div>
    <div className="h-64 bg-slate-200 rounded-2xl w-full"></div>
  </div>
)

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

      {/* โปสเตอร์ประชาสัมพันธ์ */}
      <section ref={posterRef} className={`relative py-8 md:py-12 bg-slate-50 overflow-hidden ${isHeroSliderVisible ? 'mt-2' : ''}`}>
        <div className="container-professional relative z-10">
          <Suspense fallback={<SectionSkeleton />}>
            <PRPoster embedded={true} />
          </Suspense>
        </div>
      </section>

      {/* ประกาศข่าวสาร */}
      <section ref={announcementsRef} className="relative py-8 md:py-12 bg-white overflow-hidden">
        <div className="container-professional relative z-10">
          <Suspense fallback={<SectionSkeleton />}>
            <HomeAnnouncements limit={6} embedded={true} />
          </Suspense>
        </div>
      </section>

      {/* ภาพกิจกรรม */}
      <section ref={activitiesRef} className="relative py-8 md:py-12 bg-slate-50 overflow-hidden">
        <div className="container-professional relative z-10">
          <Suspense fallback={<SectionSkeleton />}>
            <LatestActivities limit={8} embedded={true} darkHeader={false} />
          </Suspense>
        </div>
      </section>

      {/* ลิงก์หน่วยงาน */}
      <section ref={unitsRef} className="relative py-8 md:py-12 bg-white overflow-hidden">
        <div className="container-professional relative z-10">
          <Suspense fallback={<SectionSkeleton />}>
            <UnitLinks embedded={true} />
          </Suspense>
        </div>
      </section>
    </div>
  )
}
