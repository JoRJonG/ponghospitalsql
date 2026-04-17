import { useState, useEffect, useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import SEO from '../components/SEO'

interface Document {
    id: number
    title: string
    description: string
    category: string
    fileName: string
    mimeType: string
    fileSize: number
    downloadCount: number
    createdAt: string
}

// IT Center Sections Metadata - Hoisted outside component
const IT_SECTIONS = [
    { id: 'Cybersecurity', name: 'Cybersecurity Technical Assessment Matrix', icon: 'fa-shield-halved', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    { id: 'ระเบียบการใช้งานระบบสารสนเทศ', name: 'ระเบียบการใช้งานระบบสารสนเทศ', icon: 'fa-file-shield', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { id: 'ระบบประเมินมาตรฐานระบบบริการสุขภาพ', name: 'ระบบประเมินมาตรฐานระบบบริการสุขภาพ', icon: 'fa-laptop-medical', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { id: 'คู่มือระบบสารสนเทศ', name: 'คู่มือต่างๆ (IT)', icon: 'fa-book-atlas', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
]

// [rerender-memo] Extracted and memoized child component
const DocumentCard = memo(({ doc, ui, onOpen }: { doc: Document; ui: typeof IT_SECTIONS[0]; onOpen: (id: number, fileName: string) => void }) => (
    <motion.button
        key={doc.id}
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3 }}
        onClick={() => onOpen(doc.id, doc.fileName)}
        className="group flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left w-full"
    >
        <div className="flex items-start gap-4 flex-1">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${ui.bg} ${ui.color}`}>
                <i className={`fa-solid ${ui.icon} text-xl`} />
            </div>
            <div>
                <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors md:text-lg">
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
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        <i className="fa-solid fa-eye" />
                        เข้าชม {doc.downloadCount} ครั้ง
                    </span>
                </div>
            </div>
        </div>
        <div className="ml-4 flex-shrink-0 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <i className="fa-solid fa-arrow-up-right-from-square text-sm" />
        </div>
    </motion.button>
))

DocumentCard.displayName = 'DocumentCard'

export default function ITCenterPage() {
    const [allDocs, setAllDocs] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        const fetchAllITDocs = async () => {
            setLoading(true)
            try {
                // Fetch all IT documents from the new isolated API
                const res = await fetch(`/api/it-center?limit=20&isPublished=true`)
                if (!res.ok) throw new Error('Fetch failed')
                const data = await res.json()
                if (isMounted) setAllDocs(data.data || [])
            } catch (err) {
                console.error('Fetch all IT docs error:', err)
                if (isMounted) setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchAllITDocs()
        return () => { isMounted = false }
    }, [])

    // Group documents by category
    const groupedDocs = useMemo(() => {
        const groups: Record<string, Document[]> = {}
        allDocs.forEach(doc => {
            if (!groups[doc.category]) {
                groups[doc.category] = []
            }
            groups[doc.category].push(doc)
        })
        return groups
    }, [allDocs])

    // Use memoized handleOpen to keep DocumentCard stable
    const handleOpen = useMemo(() => (id: number, fileName: string) => {
        const url = `/api/it-center/view/${id}/${encodeURIComponent(fileName)}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }, [])

    return (
        <div className="page-wrapper pb-12">
            <SEO
                title="ศูนย์คอมพิวเตอร์ (IT)"
                description="ศูนย์คอมพิวเตอร์ (IT) โรงพยาบาลปง - เข้าดูเอกสาร คู่มือ และระเบียบปฏิบัติด้านสารสนเทศ"
            />

            <div className="space-y-10">
                {/* Tech Banner Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl border border-emerald-500/20"
                >
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"></div>
                    <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-24 h-24 shrink-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shadow-lg">
                            <i className="fa-solid fa-server text-4xl text-emerald-400"></i>
                            <span className="text-[10px] font-bold tracking-widest text-emerald-200 mt-1">V. 2026</span>
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-3">ศูนย์คอมพิวเตอร์ (IT)</h2>
                            <p className="text-slate-300 text-lg md:text-xl max-w-2xl font-light leading-relaxed">
                                มุ่งเน้นการให้บริการและพัฒนาเทคโนโลยีสารสนเทศที่มีประสิทธิภาพ เพื่อความมั่นคงปลอดภัยและพร้อมใช้ของข้อมูลสุขภาพโรงพยาบาลปง
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* [rendering-conditional-render] Use ternary instead of && */}
                {loading ? (
                    <div className="flex flex-col gap-6 py-12 justify-center items-center text-emerald-600">
                        <i className="fa-solid fa-circle-notch fa-spin text-4xl"></i>
                        <p className="animate-pulse font-medium">กำลังเตรียมข้อมูลเอกสาร...</p>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100">
                        <i className="fa-solid fa-circle-exclamation text-red-500 text-3xl mb-3" />
                        <p className="text-red-700 font-medium">{error}</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {IT_SECTIONS.map((section, sIdx) => {
                            const sectionDocs = groupedDocs[section.id] || []
                            return (
                                <motion.section
                                    key={section.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: sIdx * 0.1 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.bg} ${section.color}`}>
                                            <i className={`fa-solid ${section.icon} text-lg`} />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-800">{section.name}</h2>
                                        <span className="ml-auto text-sm font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                                            {sectionDocs.length} รายการ
                                        </span>
                                    </div>

                                    {sectionDocs.length === 0 ? (
                                        <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-400 italic">
                                            ยังไม่มีเอกสารในหมวดหมู่นี้
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {sectionDocs.map(doc => (
                                                <DocumentCard key={doc.id} doc={doc} ui={section} onOpen={handleOpen} />
                                            ))}
                                        </div>
                                    )}
                                </motion.section>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
