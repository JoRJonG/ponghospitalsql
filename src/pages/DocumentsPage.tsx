import { useState, useEffect, useCallback } from 'react'
import { formatFileSize, getFileIcon, downloadDocument } from '../utils/documentHelpers'
import Swal from 'sweetalert2'
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

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด')
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState<number | null>(null)

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [itemsPerPage] = useState(20)

    useEffect(() => {
        fetchCategories()
    }, [])

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setCurrentPage(1) // Reset to page 1 on new search
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])



    const fetchDocuments = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                category: selectedCategory === 'ทั้งหมด' ? '' : selectedCategory,
                search: debouncedSearch,
                isPublished: 'true' // Force published only for public view
            })

            const response = await fetch(`/api/documents?${params.toString()}`)
            if (response.ok) {
                const result = await response.json()
                if (result.pagination) {
                    setDocuments(result.data)
                    setTotalPages(result.pagination.totalPages)
                    setTotalItems(result.pagination.total)
                } else {
                    // Fallback
                    setDocuments(result)
                    setTotalItems(result.length)
                }
            }
        } catch (error) {
            console.error('Error fetching documents:', error)
        } finally {
            setLoading(false)
        }
    }, [currentPage, itemsPerPage, selectedCategory, debouncedSearch])

    // Fetch documents when params change
    useEffect(() => {
        fetchDocuments()
    }, [fetchDocuments])

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/documents/categories')
            if (response.ok) {
                const data = await response.json()
                setCategories(['ทั้งหมด', ...data])
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }

    const handleDownload = async (doc: Document) => {
        setDownloading(doc.id)
        try {
            await downloadDocument(doc.id, doc.fileName)
        } catch {
            Swal.fire({
                icon: 'error',
                title: 'ดาวน์โหลดไม่สำเร็จ',
                text: 'ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง',
                confirmButtonColor: '#d33'
            })
        } finally {
            setDownloading(null)
        }
    }

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category)
        setCurrentPage(1) // Reset to page 1
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container-narrow">
                {/* SEO meta tags สำหรับหน้าเอกสารดาวน์โหลด */}
                <SEO
                    title="เอกสารดาวน์โหลด"
                    description="ดาวน์โหลดเอกสาร แบบฟอร์ม ระเบียบ คำสั่ง และเอกสารราชการต่างๆ ของโรงพยาบาลปง จังหวัดพะเยา"
                />
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">เอกสารดาวน์โหลด</h1>
                    <p className="text-gray-600">เอกสารและแบบฟอร์มต่างๆ ของโรงพยาบาลปง</p>
                </div>

                {/* Search and Tabs Container */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    {/* Search */}
                    <div className="mb-6">
                        <div className="relative">
                            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อเอกสาร หรือคำอธิบาย..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                        <div className="flex gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => handleCategoryChange(cat)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                                        ? 'bg-green-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Documents List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-regular fa-folder-open text-2xl text-gray-400"></i>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">ไม่พบเอกสาร</h3>
                        <p className="text-gray-500">ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่นดูนะครับ</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {documents.map(doc => (
                            <div key={doc.id} className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border hover:border-emerald-100">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                                            {getFileIcon(doc.mimeType)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1" title={doc.title}>
                                                {doc.title}
                                            </h3>
                                            {doc.description && (
                                                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                                    {doc.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                                                <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded">
                                                    <i className="fa-regular fa-folder text-xs"></i>
                                                    {doc.category}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <i className="fa-regular fa-file text-xs"></i>
                                                    {formatFileSize(doc.fileSize)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <i className="fa-solid fa-download text-xs"></i>
                                                    {doc.downloadCount} ครั้ง
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <i className="fa-regular fa-clock text-xs"></i>
                                                    {new Date(doc.createdAt).toLocaleDateString('th-TH')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(doc)}
                                        disabled={downloading === doc.id}
                                        className="flex-shrink-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {downloading === doc.id ? (
                                            <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
                                        ) : (
                                            <i className="fa-solid fa-download"></i>
                                        )}
                                        <span className="hidden sm:inline">ดาวน์โหลด</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="mt-8 flex justify-center items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = currentPage;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-all ${currentPage === pageNum
                                            ? 'bg-green-600 text-white shadow-md'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                )}

                {/* Footer Info */}
                {!loading && totalItems > 0 && (
                    <div className="text-center mt-4 text-sm text-gray-500">
                        แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} จากทั้งหมด {totalItems} รายการ
                    </div>
                )}
            </div>
        </div>
    )
}
