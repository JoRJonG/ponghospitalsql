import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { buildApiUrl } from '../utils/api'
import SEO from '../components/SEO'

type PRPoster = {
    _id: string | number
    title: string
    imageUrl: string
    displayOrder: number
    isPublished: boolean
}

export default function PRPostersPage() {
    const [posters, setPosters] = useState<PRPoster[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedPoster, setSelectedPoster] = useState<PRPoster | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20

    useEffect(() => {
        // โหลดโปสเตอร์ทั้งหมดที่เผยแพร่แล้ว
        fetch('/api/pr-posters')
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    throw new Error(data.error || 'ไม่สามารถโหลดข้อมูลได้')
                }
                return res.json()
            })
            .then((data: PRPoster[]) => {
                setPosters(data)
                setLoading(false)
            })
            .catch((err) => {
                console.error('Error loading PR posters:', err)
                setError(err.message)
                setLoading(false)
            })
    }, [])

    // คำนวณ pagination
    const totalPages = Math.ceil(posters.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentPosters = posters.slice(startIndex, endIndex)

    // เปลี่ยนหน้า
    const goToPage = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <i className="fa-solid fa-spinner fa-spin text-4xl text-emerald-600 mb-4" />
                    <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="card bg-red-50 border-red-200">
                <div className="card-body text-center">
                    <i className="fa-solid fa-exclamation-circle text-4xl text-red-600 mb-4" />
                    <p className="text-red-800">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container-narrow py-8">
            <div className="space-y-8">
                {/* SEO meta tags สำหรับหน้าโปสเตอร์ประชาสัมพันธ์ */}
                <SEO
                    title="โปสเตอร์ประชาสัมพันธ์"
                    description="โปสเตอร์ประชาสัมพันธ์ ข่าวสาร และสื่อสุขภาพจากโรงพยาบาลปง จังหวัดพะเยา สำหรับประชาชนในพื้นที่"
                />
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
                        <i className="fa-solid fa-image text-emerald-600 mr-3" />
                        โปสเตอร์ประชาสัมพันธ์
                    </h1>
                    <p className="text-slate-600">
                        ทั้งหมด {posters.length} รายการ
                        {totalPages > 1 && ` • หน้า ${currentPage} จาก ${totalPages}`}
                    </p>
                </motion.div>

                {/* Grid Gallery */}
                {posters.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="card text-center py-12"
                    >
                        <div className="card-body">
                            <i className="fa-solid fa-image text-6xl text-gray-300 mb-4" />
                            <p className="text-gray-600 text-lg">ยังไม่มีโปสเตอร์ประชาสัมพันธ์</p>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {currentPosters.map((poster, index) => (
                                <motion.div
                                    key={poster._id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4, delay: index * 0.05 }}
                                    className="group cursor-pointer"
                                    onClick={() => setSelectedPoster(poster)}
                                >
                                    <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
                                        {/* Image Container */}
                                        <div className="relative aspect-square overflow-hidden bg-slate-100">
                                            <img
                                                src={buildApiUrl(poster.imageUrl)}
                                                alt={poster.title}
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                draggable="false"
                                            />
                                            {/* Overlay on hover */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                                                <i className="fa-solid fa-search-plus text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="flex justify-center items-center gap-2 mt-8"
                            >
                                {/* Previous Button */}
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <i className="fa-solid fa-chevron-left" />
                                </button>

                                {/* Page Numbers */}
                                <div className="flex gap-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        // แสดงหน้าแรก, หน้าสุดท้าย, หน้าปัจจุบัน และหน้าใกล้เคียง
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => goToPage(page)}
                                                    className={`px-4 py-2 rounded-lg transition-colors ${currentPage === page
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            )
                                        } else if (
                                            page === currentPage - 2 ||
                                            page === currentPage + 2
                                        ) {
                                            return <span key={page} className="px-2 py-2 text-slate-400">...</span>
                                        }
                                        return null
                                    })}
                                </div>

                                {/* Next Button */}
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <i className="fa-solid fa-chevron-right" />
                                </button>
                            </motion.div>
                        )}
                    </>
                )}

                {/* Lightbox / Modal */}
                {selectedPoster && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
                        onClick={() => setSelectedPoster(null)}
                    >
                        {/* Close button - ปุ่มปิดขนาดใหญ่และชัดเจน */}
                        <button
                            onClick={() => setSelectedPoster(null)}
                            className="absolute top-4 right-4 md:top-8 md:right-8 z-10 w-12 h-12 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 group"
                            aria-label="ปิด"
                        >
                            <i className="fa-solid fa-xmark text-2xl md:text-3xl group-hover:rotate-90 transition-transform duration-200" />
                        </button>

                        {/* Image container - รูปอยู่กลางจอ */}
                        <div
                            className="relative w-full h-full flex items-center justify-center p-4 md:p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            <img
                                src={buildApiUrl(selectedPoster.imageUrl)}
                                alt={selectedPoster.title}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
