
import { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation } from 'swiper/modules'
import { buildApiUrl } from '../utils/api'
import { useSWR } from '../hooks/useSWR'
import { useHomepageRefresh } from '../contexts/useHomepageRefresh'
import { responsiveImageProps } from '../utils/image'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'


// Type definition matches backend response
type PRPoster = {
    _id: number
    title: string
    imageUrl: string
    imageSize: number
    mimeType: string
    displayOrder: number
    isPublished: boolean
    createdAt: string
    updatedAt: string
}

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

        return () => obs.disconnect()
    }, [])
    return ref
}

export default function PRPoster({ embedded = false }: { embedded?: boolean }) {
    const { refreshKey } = useHomepageRefresh()
    const [selectedPoster, setSelectedPoster] = useState<PRPoster | null>(null)
    const revealRef = useReveal<HTMLDivElement>()

    const { data: items, error, isLoading } = useSWR<PRPoster[]>(
        `pr-posters-${refreshKey}`,
        async () => {
            const res = await fetch(buildApiUrl('/api/pr-posters?published=true&limit=10'))
            if (!res.ok) throw new Error('Failed to fetch posters')
            return res.json()
        },
        {
            revalidateOnFocus: false,
            staleTime: 60000 // 1 minute
        }
    )

    // Don't render anything if no items and embedded (Home Page)
    if (!isLoading && (!items || items.length === 0) && embedded) {
        return null
    }

    // Loading skeleton
    if (isLoading) {
        return (
            <section className={`${embedded ? '' : 'py-8 bg-white'}`} ref={revealRef}>
                <div className={embedded ? "" : "app-container relative"}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 sm:gap-0">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">โปสเตอร์ประชาสัมพันธ์</h2>
                            <p className="text-transparent bg-slate-200 rounded animate-pulse text-sm select-none w-64 mt-1">กำลังโหลดข้อมูลโปสเตอร์ประชาสัมพันธ์...</p>
                        </div>
                        <div className="btn btn-outline inline-flex items-center gap-1 invisible">
                            ดูทั้งหมด <span aria-hidden>→</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-4 lg:gap-5 xl:gap-6 overflow-hidden">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`w-full bg-white rounded-xl shadow-sm border border-slate-100 p-2 shrink-0 ${i === 1 ? 'flex flex-col' :
                                i === 2 ? 'hidden sm:flex flex-col' :
                                    'hidden lg:flex flex-col'
                                }`}>
                                <div className="relative aspect-square rounded-lg mb-3 bg-slate-100 animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section
            className={`${embedded ? '' : 'py-8 bg-white'} group/section`}
            ref={revealRef}
        >
            <div className={embedded ? "" : "app-container relative"}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 sm:gap-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">โปสเตอร์ประชาสัมพันธ์</h2>
                        <p className="text-gray-600 text-sm">รวมป้ายประชาสัมพันธ์ข่าวสารและกิจกรรมต่างๆ ของโรงพยาบาล</p>
                    </div>

                    <Link
                        to="/pr-posters"
                        className="btn btn-outline inline-flex items-center gap-1 transition-transform hover:translate-x-0.5 shrink-0 self-start sm:self-auto"
                    >
                        ดูทั้งหมด <span aria-hidden>→</span>
                    </Link>
                </div>

                {/* Content */}
                {error ? (
                    <div className="text-center text-red-500 py-4">ไม่สามารถโหลดข้อมูลได้</div>
                ) : (
                    <div className="relative">
                        {/* Navigation Buttons (Floating) - Custom Swiper Navigation */}
                        <div className="swiper-button-prev-custom absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-600 opacity-0 group-hover/section:opacity-100 transition-opacity duration-300 hover:text-emerald-600 hidden md:flex cursor-pointer">
                            <i className="fa-solid fa-chevron-left" />
                        </div>
                        <div className="swiper-button-next-custom absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-600 opacity-0 group-hover/section:opacity-100 transition-opacity duration-300 hover:text-emerald-600 hidden md:flex cursor-pointer">
                            <i className="fa-solid fa-chevron-right" />
                        </div>

                        {/* Swiper Carousel */}
                        {items && items.length > 0 ? (
                            <div className="relative w-full aspect-square sm:aspect-auto sm:min-h-[350px]"> {/* STRICT MIN-HEIGHT/ASPECT-RATIO: Prevents Swiper from collapsing to 0 height during init reflow, stopping CLS */}
                                <Swiper
                                    modules={[Autoplay, Navigation]}
                                    spaceBetween={16}
                                    slidesPerView={1}
                                    loop={true}
                                    speed={2500} // Custom slow transition speed
                                    autoplay={{
                                        delay: 2000,
                                        disableOnInteraction: false,
                                        pauseOnMouseEnter: true
                                    }}
                                    navigation={{
                                        prevEl: '.swiper-button-prev-custom',
                                        nextEl: '.swiper-button-next-custom'
                                    }}
                                    breakpoints={{
                                        640: {
                                            slidesPerView: 2,
                                            spaceBetween: 16
                                        },
                                        1024: {
                                            slidesPerView: 4,
                                            spaceBetween: 20
                                        },
                                        1280: {
                                            slidesPerView: 4,
                                            spaceBetween: 24
                                        }
                                    }}
                                    className="pr-poster-swiper"
                                >
                                    {items.map((poster) => (
                                        <SwiperSlide key={poster._id}>
                                            <div
                                                className="w-full bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 p-2 flex flex-col cursor-pointer"
                                                onClick={() => setSelectedPoster(poster)}
                                            >
                                                <div className="relative aspect-square overflow-hidden rounded-lg mb-3 bg-slate-100">
                                                    {(() => {
                                                        const { src, srcSet } = responsiveImageProps(buildApiUrl(poster.imageUrl), {
                                                            widths: [200, 320, 480],
                                                            sizes: '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'
                                                        })
                                                        return (
                                                            <img
                                                                src={src}
                                                                srcSet={srcSet}
                                                                alt={poster.title}
                                                                className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                                                                loading="lazy"
                                                                draggable="false"
                                                            />
                                                        )
                                                    })()}
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Lightbox / Modal - Portal */}
            {selectedPoster ? createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in w-screen h-screen top-0 left-0"
                    onClick={() => setSelectedPoster(null)}
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setSelectedPoster(null)}
                        className="absolute top-4 right-4 md:top-8 md:right-8 z-[10000] w-12 h-12 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 group"
                        aria-label="ปิด"
                    >
                        <i className="fa-solid fa-xmark text-2xl md:text-3xl group-hover:rotate-90 transition-transform duration-200" />
                    </button>

                    {/* Image container */}
                    <div
                        className="relative w-full h-full flex items-center justify-center p-4 md:p-8"
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={buildApiUrl(selectedPoster.imageUrl)}
                            alt={selectedPoster.title}
                            width={selectedPoster.imageSize ? Math.sqrt(selectedPoster.imageSize) : 800} // Estimate aspect ratio purely for initial layout reflow prevention
                            height={selectedPoster.imageSize ? Math.sqrt(selectedPoster.imageSize) : 800}
                            className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                </div>,
                document.body
            ) : null}
        </section>
    )
}
