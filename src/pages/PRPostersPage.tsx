import { useState } from 'react'
import { useSWR } from '../hooks/useSWR'
import { createPortal } from 'react-dom'
import { buildApiUrl } from '../utils/api'
import SEO from '../components/SEO'

type PRPoster = {
    _id: string | number
    title: string
    imageUrl: string
    image?: { url?: string }
    displayOrder: number
    isPublished: boolean
}

export default function PRPostersPage() {
    const [selectedPoster, setSelectedPoster] = useState<PRPoster | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20
    const { data: postersData, error: swrError, isLoading } = useSWR(
        '/api/pr-posters',
        async () => {
            const res = await fetch('/api/pr-posters')
            if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้')
            return res.json()
        }
    )

    const posters: PRPoster[] = postersData || []
    const loading = isLoading
    const error = swrError ? swrError.message : null

    const totalPages = Math.ceil(posters.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentPosters = posters.slice(startIndex, startIndex + itemsPerPage)

    const goToPage = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <div className="page-wrapper pb-16">
            <SEO
                title="โปสเตอร์ประชาสัมพันธ์"
                description="โปสเตอร์ประชาสัมพันธ์ ข่าวสาร และสื่อสุขภาพจากโรงพยาบาลปง จังหวัดพะเยา สำหรับประชาชนในพื้นที่"
            />

            <div className="container-professional py-10 space-y-8">

                {/* Header */}
                <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">โปสเตอร์ประชาสัมพันธ์</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            สื่อประชาสัมพันธ์และโปสเตอร์ประกาศจากโรงพยาบาลปง
                        </p>
                    </div>
                    {!loading && posters.length > 0 ? (
                        <span className="text-sm text-slate-400 whitespace-nowrap shrink-0">
                            {posters.length} รายการ
                        </span>
                    ) : null}
                </div>

                {/* Loading Skeleton */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden animate-pulse">
                                <div className="aspect-square bg-slate-200" />
                                <div className="p-3">
                                    <div className="h-3.5 bg-slate-200 rounded w-4/5 mb-1.5" />
                                    <div className="h-3 bg-slate-100 rounded w-3/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {/* Error */}
                {error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <i className="fa-solid fa-circle-exclamation text-3xl text-red-400 mb-3" />
                        <p className="text-red-700 font-medium">{error}</p>
                    </div>
                ) : null}

                {/* Empty State */}
                {!loading && !error && posters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <i className="fa-regular fa-image text-3xl text-slate-300" />
                        </div>
                        <p className="text-slate-500">ยังไม่มีโปสเตอร์ประชาสัมพันธ์ในขณะนี้</p>
                    </div>
                ) : null}

                {/* Grid */}
                {!loading && !error && currentPosters.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                            {currentPosters.map((poster) => (
                                <button
                                    key={poster._id}
                                    type="button"
                                    onClick={() => setSelectedPoster(poster)}
                                    className="group text-left bg-white rounded-xl border border-slate-100 overflow-hidden hover:border-emerald-200 hover:shadow-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none"
                                >
                                    <div className="aspect-square bg-slate-50 overflow-hidden">
                                        <img
                                            src={buildApiUrl(poster.imageUrl || poster.image?.url || '')}
                                            alt={poster.title}
                                            className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
                                            loading="lazy"
                                            draggable="false"
                                        />
                                    </div>
                                    {poster.title ? (
                                        <div className="px-3 py-2.5">
                                            <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                                                {poster.title}
                                            </p>
                                        </div>
                                    ) : null}
                                </button>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 ? (
                            <div className="flex justify-center items-center gap-2 pt-4">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="w-9 h-9 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                    aria-label="หน้าก่อนหน้า"
                                >
                                    <i className="fa-solid fa-chevron-left text-xs" />
                                </button>

                                <div className="flex gap-1.5">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        const isVisible =
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        const isEllipsis =
                                            page === currentPage - 2 || page === currentPage + 2

                                        if (!isVisible && !isEllipsis) return null
                                        if (isEllipsis) return (
                                            <span key={page} className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm">…</span>
                                        )
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page)}
                                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    })}
                                </div>

                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="w-9 h-9 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                    aria-label="หน้าถัดไป"
                                >
                                    <i className="fa-solid fa-chevron-right text-xs" />
                                </button>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </div>

            {/* Lightbox via Portal */}
            {selectedPoster ? createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/92 backdrop-blur-md animate-fade-in"
                    onClick={() => setSelectedPoster(null)}
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                >
                    <button
                        onClick={() => setSelectedPoster(null)}
                        className="absolute top-4 right-4 md:top-6 md:right-6 z-10 w-11 h-11 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105"
                        aria-label="ปิด"
                    >
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>

                    <div
                        className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-10 gap-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={buildApiUrl(selectedPoster.imageUrl)}
                            alt={selectedPoster.title}
                            className="max-w-[95vw] max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        {selectedPoster.title ? (
                            <p className="text-white/80 text-sm text-center max-w-lg">
                                {selectedPoster.title}
                            </p>
                        ) : null}
                    </div>
                </div>,
                document.body
            ) : null}
        </div>
    )
}
