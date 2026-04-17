import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SEO from '../components/SEO'
import Pagination from '../components/Pagination'

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

interface ITSection {
    id: string
    name: string
    shortName: string
    icon: string
    color: string
    bg: string
    border: string
    fullName: string
}

// IT Center Sections Metadata - Hoisted outside component
const IT_SECTIONS: ITSection[] = [
    { id: 'Cybersecurity', name: 'Cybersecurity Data Matrix', shortName: 'Cybersec', icon: 'fa-shield-halved', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', fullName: 'Cybersecurity Technical Assessment Matrix' },
    { id: 'ระเบียบการใช้งานระบบสารสนเทศ', name: 'ระเบียบการใช้งาน IT', shortName: 'ระเบียบ', icon: 'fa-file-shield', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', fullName: 'ระเบียบการใช้งานระบบสารสนเทศ' },
    { id: 'ระบบประเมินมาตรฐานระบบบริการสุขภาพ', name: 'มาตรฐานบริการสุขภาพ', shortName: 'มาตรฐาน', icon: 'fa-laptop-medical', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', fullName: 'ระบบประเมินมาตรฐานระบบบริการสุขภาพ' },
    { id: 'ระบบประเมินโรงพยาบาลอัจฉริยะ (Smart hospital)', name: 'Smart Hospital (ประเมิน)', shortName: 'Smart Hosp', icon: 'fa-microchip', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', fullName: 'ระบบประเมินโรงพยาบาลอัจฉริยะ (Smart hospital)' },
    { id: 'คู่มือระบบสารสนเทศ', name: 'คู่มือการใช้งานต่างๆ', shortName: 'คู่มือ IT', icon: 'fa-book-atlas', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', fullName: 'คู่มือต่างๆ (IT Manuals)' },
]

// Helper function for indentation based on numbering (e.g. 9.1.1)
const getIndentLevel = (title: string): number => {
    if (!title) return 0;
    
    // ค้นหาตัวเลขลำดับด้านหน้าถึงแม้ว่าจะไม่มีการเว้นวรรค
    const match = title.match(/^(\d+(?:\.\d+)*)/);
    if (!match) return 0;
    
    const parts = match[1].split('.');
    return Math.max(0, parts.length - 1);
};

const DocumentCard = memo(({ doc, ui, onOpen, baseDepth = 0 }: { doc: Document; ui: typeof IT_SECTIONS[0] | undefined; onOpen: (id: number, fileName: string) => void; baseDepth?: number }) => {
    const rawDepth = getIndentLevel(doc.title);
    const depth = Math.max(0, rawDepth - baseDepth);
    const isChild = depth > 0;
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full flex items-stretch"
        >
            {isChild && (
                <div 
                    className={`shrink-0 flex items-center justify-end ${
                        depth === 1 ? 'w-8 sm:w-16 md:w-24' : 
                        depth === 2 ? 'w-16 sm:w-32 md:w-48' : 
                        'w-24 sm:w-40 md:w-64'
                    }`}
                />
            )}
            
            <motion.button
                whileHover={doc.fileName ? { y: -3 } : {}}
                onClick={() => doc.fileName && onOpen(doc.id, doc.fileName)}
                className={`flex-1 group flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all text-left ${doc.fileName ? 'hover:shadow-md hover:border-emerald-200 cursor-pointer' : 'opacity-70 cursor-not-allowed grayscale-[0.5]'}`}
            >
                <div className={`${isChild ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-12 h-12 sm:w-14 sm:h-14'} rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${ui?.bg || 'bg-slate-50'} ${ui?.color || 'text-slate-600'}`}>
                    <i className={`fa-solid ${ui?.icon || 'fa-file-pdf'} ${isChild ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`} />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                    <h3 className={`font-bold transition-colors break-words text-left mb-1 ${
                        isChild ? 'text-[15px] sm:text-base' : 'text-base sm:text-lg'
                    } ${doc.fileName ? 'text-gray-900 group-hover:text-emerald-700' : 'text-gray-500'}`}>
                        {doc.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <i className="fa-regular fa-calendar" />
                            {new Date(doc.createdAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <i className="fa-solid fa-eye" />
                            {doc.downloadCount} ครั้ง
                        </span>
                    </div>
                </div>
                <div className={`hidden sm:flex flex-shrink-0 ${isChild ? 'w-6 h-6' : 'w-8 h-8'} rounded-full items-center justify-center transition-all ${doc.fileName ? 'bg-slate-50 text-slate-300 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-slate-50 text-slate-200'}`}>
                    <i className={`fa-solid ${doc.fileName ? 'fa-arrow-up-right-from-square text-[10px] sm:text-xs' : 'fa-hourglass-start text-[10px]'}`} />
                </div>
            </motion.button>
        </motion.div>
    );
});

DocumentCard.displayName = 'DocumentCard'

export default function ITCenterPage() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Filters & Pagination state
    const [activeTab, setActiveTab] = useState(IT_SECTIONS[0].id)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const itemsPerPage = 20

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setCurrentPage(1) // Reset to first page when searching
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const fetchDocuments = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                category: debouncedSearch ? '' : activeTab,
                search: debouncedSearch,
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                isPublished: 'true'
            })

            const res = await fetch(`/api/it-center?${params.toString()}`)
            if (!res.ok) throw new Error('Fetch failed')
            const result = await res.json()
            
            setDocuments(result.data || [])
            if (result.pagination) {
                setTotalPages(result.pagination.totalPages)
                setTotalItems(result.pagination.total)
            } else {
                setTotalPages(1)
                setTotalItems(result.data?.length || 0)
            }
        } catch (err) {
            console.error('Fetch IT docs error:', err)
            setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
        } finally {
            setLoading(false)
        }
    }, [activeTab, currentPage, debouncedSearch])

    useEffect(() => {
        fetchDocuments()
    }, [fetchDocuments])

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId)
        setCurrentPage(1) // Reset to first page when changing tab
        setSearchQuery('')
    }

    const handleOpen = useMemo(() => (id: number, fileName: string) => {
        const url = `/api/it-center/view/${id}/${encodeURIComponent(fileName)}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }, [])

    return (
        <div className="page-wrapper pb-20">
            <SEO
                title="ศูนย์คอมพิวเตอร์ (IT)"
                description="ศูนย์คอมพิวเตอร์ (IT) โรงพยาบาลปง - เข้าดูเอกสาร คู่มือ และระเบียบปฏิบัติด้านสารสนเทศ"
            />

            <div className="space-y-6">
                {/* Tech Banner Section */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl border border-emerald-500/10"
                >
                    <div className="absolute inset-0 z-0">
                        <img 
                            src="/it-center-bg.png" 
                            alt="Background" 
                            className="w-full h-full object-cover opacity-40 mix-blend-luminosity scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
                    </div>

                    <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                        <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center shadow-2xl">
                            <i className="fa-solid fa-fingerprint text-2xl text-emerald-400"></i>
                            <span className="text-[6px] font-black tracking-[0.2em] text-emerald-300/50 mt-0.5 uppercase">Secure</span>
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2 tracking-tight">ศูนย์คอมพิวเตอร์ <span className="text-emerald-400 font-light">(IT)</span></h2>
                            <p className="text-slate-300 text-sm md:text-base max-w-2xl font-light leading-relaxed">
                                แหล่งรวบรวมข้อมูล มาตรฐาน และแนวทางปฏิบัติงานด้านเทคโนโลยีสารสนเทศ โรงพยาบาลปง
                            </p>
                        </div>
                    </div>

                    <div className="relative px-6 md:px-8 pb-6 md:pb-8 text-center md:text-left">
                        <div className="relative max-w-2xl inline-block w-full">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50"></i>
                            <input 
                                type="text"
                                placeholder="ค้นหาเอกสาร IT (ชื่อไฟล์, รายละเอียด...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white/10 transition-all text-sm"
                            />
                        </div>
                    </div>
                </motion.div>

                {!debouncedSearch && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                        className="flex flex-wrap justify-center md:justify-start gap-3 py-2 scrollbar-hide overflow-x-auto"
                    >
                        {IT_SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => handleTabChange(section.id)}
                                className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap ${
                                    activeTab === section.id 
                                    ? `bg-slate-900 text-white shadow-xl shadow-slate-200` 
                                    : `bg-white text-slate-500 border border-slate-100 hover:border-emerald-200 hover:text-emerald-700`
                                }`}
                            >
                                <i className={`fa-solid ${section.icon} ${activeTab === section.id ? 'text-emerald-400' : 'text-slate-300'}`}></i>
                                <span className="hidden sm:inline">{section.name}</span>
                                <span className="sm:hidden">{section.shortName}</span>
                            </button>
                        ))}
                    </motion.div>
                )}

                {loading ? (
                    <div className="flex flex-col gap-6 py-20 justify-center items-center">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin"></div>
                            <i className="fa-solid fa-bolt absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 text-xl"></i>
                        </div>
                        <p className="font-bold text-slate-400 tracking-widest uppercase text-xs">Fetching Data...</p>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center bg-rose-50 rounded-[2rem] border border-rose-100 max-w-lg mx-auto">
                        <i className="fa-solid fa-circle-exclamation text-rose-500 text-4xl mb-4" />
                        <h3 className="text-xl font-bold text-rose-900 mb-2">Connection Error</h3>
                        <p className="text-rose-600/70 font-medium">{error}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {!debouncedSearch && (
                            <motion.div 
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="flex items-center gap-4 py-2 px-4 border-l-4 border-emerald-500 bg-emerald-50/30 rounded-r-2xl"
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${IT_SECTIONS.find(s => s.id === activeTab)?.bg} ${IT_SECTIONS.find(s => s.id === activeTab)?.color}`}>
                                    <i className={`fa-solid ${IT_SECTIONS.find(s => s.id === activeTab)?.icon} text-xl`}></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                        {IT_SECTIONS.find(s => s.id === activeTab)?.fullName || activeTab}
                                    </h3>
                                </div>
                            </motion.div>
                        )}

                        {debouncedSearch && (
                            <div className="flex items-center gap-3 text-slate-400 font-bold px-4">
                                <i className="fa-solid fa-filter text-emerald-500"></i>
                                {totalItems > 0 
                                    ? `พบ "${debouncedSearch}" จำนวน ${totalItems} รายการ`
                                    : `ไม่พบเอกสารที่เกี่ยวข้องกับ "${debouncedSearch}"`
                                }
                            </div>
                        )}

                        <motion.div 
                            layout
                            className="grid grid-cols-1 gap-4"
                        >
                            <AnimatePresence mode="popLayout">
                                {(() => {
                                    const baseDepth = documents.length > 0 ? Math.min(...documents.map(d => getIndentLevel(d.title))) : 0;
                                    return documents.map(doc => {
                                        const sectionUi = IT_SECTIONS.find(s => s.id === doc.category)
                                        return (
                                            <DocumentCard 
                                                key={doc.id} 
                                                doc={doc} 
                                                ui={sectionUi} 
                                                onOpen={handleOpen}
                                                baseDepth={baseDepth}
                                            />
                                        )
                                    })
                                })()}
                            </AnimatePresence>
                        </motion.div>

                        {totalItems === 0 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="py-20 text-center"
                            >
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <i className="fa-solid fa-folder-open text-4xl text-slate-200"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">ไม่มีข้อมูลเอกสาร</h3>
                                <p className="text-slate-400">ยังไม่มีการเพิ่มไฟล์ในหมวดหมู่นี้</p>
                            </motion.div>
                        )}

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            pageSize={itemsPerPage}
                            onPageChange={(page) => {
                                setCurrentPage(page)
                                window.scrollTo({ top: 300, behavior: 'smooth' })
                            }}
                            itemLabel="เอกสาร"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
