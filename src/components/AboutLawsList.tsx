import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageHeader from './PageHeader'

type DocItem = {
    id: string | number
    title: string
    createdAt: string
    url: string
    source: 'legal' | 'pr'
    category?: string
}

export default function AboutLawsList() {
    const [docs, setDocs] = useState<DocItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)

    useEffect(() => {
        const fetchDocs = async (pageNum: number) => {
            if (pageNum === 1) setLoading(true)
            try {
                const res = await fetch(`/api/legal-ethics?page=${pageNum}&limit=20`)
                const data = await res.json()

                interface RawDocItem {
                    id: string | number;
                    title: string;
                    createdAt?: string;
                    created_at?: string;
                    fileName?: string;
                    category?: string;
                }

                const newDocs: DocItem[] = (data.data || []).map((d: RawDocItem) => ({
                    id: d.id,
                    title: d.title,
                    createdAt: d.createdAt || d.created_at || '',
                    url: `/api/legal-ethics/file/${d.id}/${encodeURIComponent(d.fileName || 'document.pdf')}`,
                    source: 'legal',
                    category: d.category
                }))

                if (pageNum === 1) {
                    setDocs(newDocs)
                } else {
                    setDocs(prev => [...prev, ...newDocs])
                }

                setHasMore(data.pagination ? pageNum < data.pagination.totalPages : false)
            } catch (err) {
                console.error('Fetch error:', err)
                setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
            } finally {
                setLoading(false)
            }
        }
        fetchDocs(page)
    }, [page])

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1)
        }
    }

    const handleOpen = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="space-y-8 min-h-[60vh]">
            <PageHeader
                title="กฎหมายที่เกี่ยวข้องกับการดำเนินงาน"
                subtitle="รวมกฎหมาย มาตรฐานจริยธรรม และแผนปฏิบัติการ"
            />

            {loading && page === 1 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">กำลังค้นหาเอกสาร...</p>
                </div>
            ) : error ? (
                <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100">
                    <i className="fa-solid fa-circle-exclamation text-red-500 text-3xl mb-3" />
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            ) : docs.length === 0 ? (
                <div className="p-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <i className="fa-solid fa-folder-open text-gray-300 text-5xl mb-4" />
                    <p className="text-gray-500 text-lg">ไม่พบข้อมูลเอกสารในขณะนี้</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="grid gap-4">
                        {docs.map((doc, idx) => (
                            <motion.button
                                key={`${doc.source}-${doc.id}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: (idx % 20) * 0.05, duration: 0.4 }}
                                onClick={() => handleOpen(doc.url)}
                                className="group flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left w-full"
                            >
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${doc.source === 'pr' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                        <i className={`fa-solid ${doc.source === 'pr' ? 'fa-shield-halved' : 'fa-scale-balanced'} text-xl`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 md:text-lg">
                                            {doc.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">

                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <i className="fa-regular fa-calendar" />
                                                {new Date(doc.createdAt).toLocaleDateString('th-TH', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                            {doc.category && (
                                                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                                                    {doc.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-4 flex-shrink-0 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <i className="fa-solid fa-arrow-up-right-from-square text-sm" />
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={handleLoadMore}
                                disabled={loading}
                                className="px-8 py-3 bg-white border border-emerald-200 text-emerald-600 font-bold rounded-2xl hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
                                        กำลังโหลด...
                                    </>
                                ) : (
                                    <>
                                        โหลดเพิ่มเติม
                                        <i className="fa-solid fa-chevron-down text-xs" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
