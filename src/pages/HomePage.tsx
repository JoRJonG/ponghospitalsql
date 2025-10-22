import { useEffect, useState } from 'react'
import HeroSlider from '../components/HeroSlider'
import HomeAnnouncements from '../components/HomeAnnouncements'
import LatestActivities from '../components/LatestActivities'
import UnitLinks from '../components/UnitLinks'
import { useRef } from 'react'
import { useHomepageRefresh } from '../contexts/HomepageRefreshContext'

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
    <div className="relative min-h-screen">
      <div className={`transform transition-all duration-700 ease-out ${mounted ? 'animate-fade-in' : 'opacity-0 translate-y-4'}`}>
        <HeroSlider />
      </div>

      <section ref={useReveal<HTMLDivElement>()} className="relative py-8">
        <div className="container-narrow">
          <LatestActivities key={`activities-${refreshKey}`} limit={6} embedded={true} />

          <div className="mt-8">
            <HomeAnnouncements key={`announcements-${refreshKey}`} limit={10} embedded={true} />
          </div>

          <div className="mt-8">
            <UnitLinks embedded={true} />
          </div>
        </div>
      </section>
    </div>
  )
}
