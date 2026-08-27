import { useState, useEffect } from 'react'
import { formatFileSize, getFileIcon, downloadDocument } from '../utils/documentHelpers'
import { useSWR } from '../hooks/useSWR'
import Swal from 'sweetalert2'
import SEO from '../components/SEO'
import PageHeader from '../components/PageHeader'
import SearchFilterBar from '../components/SearchFilterBar'
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

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setCurrentPage(1) // Reset to page 1 on new search
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const docParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        category: selectedCategory === 'ทั้งหมด' ? '' : selectedCategory,
        search: debouncedSearch,
        isPublished: 'true'
    })
    const docUrl = `/api/documents?${docParams.toString()}`

    const { data: fetchResult, isLoading: isFetchingDocs } = useSWR<{
        data: Document[];
        pagination?: { totalPages: number; total: number; page: number; limit: number };
        length?: number;
    }>(
        docUrl,
        async () => {
            const response = await fetch(docUrl)
            if (!response.ok) throw new Error('Failed to fetch documents')
            return response.json()
        },
        { cacheTime: 300000, staleTime: 60000 }
    )

    useEffect(() => {
        if (fetchResult) {
            if (fetchResult.pagination) {
                setDocuments(fetchResult.data || [])
                setTotalPages(fetchResult.pagination.totalPages || 1)
                setTotalItems(fetchResult.pagination.total || 0)
            } else if (Array.isArray(fetchResult)) {
                // If it returns an array directly
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setDocuments(fetchResult as any)
                setTotalPages(1)
                setTotalItems((fetchResult as Document[]).length || 0)
            }
        }
    }, [fetchResult])

    useEffect(() => {
        setLoading(isFetchingDocs)
    }, [isFetchingDocs])

    const { data: categoryData } = useSWR<string[]>(
        '/api/documents/categories',
        async () => {
            const response = await fetch('/api/documents/categories')
            if (!response.ok) throw new Error('Failed to fetch categories')
            return response.json()
        },
        { cacheTime: 3600000, staleTime: 300000 }
    )

    useEffect(() => {
        if (categoryData) {
            setCategories(['ทั้งหมด', ...categoryData])
        }
    }, [categoryData])

    const handleDownload = async (doc: Document) => {
        setDownloading(doc.id)
        try {
            await downloadDocument(doc.id, doc.fileName)
        } catch {
            Swal.fire({
                icon: 'error',
                title: 'ดาวน์โหลดไม่สำเร็จ',
                text: 'ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง',
                confirmButtonColor: '#dc2626'
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
        <div className="page-wrapper">
            <div className="container-narrow py-8">
                {/* SEO meta tags สำหรับหน้าเอกสารดาวน์โหลด */}
                <SEO
                    title="เอกสารดาวน์โหลด"
                    description="ดาวน์โหลดเอกสาร แบบฟอร์ม ระเบียบ คำสั่ง และเอกสารราชการต่างๆ ของโรงพยาบาลปง จังหวัดพะเยา"
                />
                <PageHeader title="เอกสารดาวน์โหลด" subtitle="เอกสารและแบบฟอร์มต่างๆ ของโรงพยาบาลปง" />

                {/* Search and Category Tabs */}
                <SearchFilterBar
                    searchValue={searchQuery}
                    onSearchChange={(e) => setSearchQuery(e.target.value)}
                    searchPlaceholder="ค้นหาชื่อเอกสาร หรือคำอธิบาย..."
                    summary={!loading && totalItems > 0 ? <>พบ {totalItems} เอกสาร</> : undefined}
                />

                {/* Category Tabs */}
                <div className="flex overflow-x-auto pb-2 mb-6 scrollbar-hide">
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${selectedCategory === cat
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Documents List */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse flex items-start gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                                    <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
                                    <div className="flex gap-4">
                                        <div className="h-3 bg-gray-100 rounded w-16" />
                                        <div className="h-3 bg-gray-100 rounded w-20" />
                                    </div>
                                </div>
                            </div>
                        ))}
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
                            <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-200">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                                            {getFileIcon(doc.mimeType)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1" title={doc.title}>
                                                {doc.title}
                                            </h3>
                                            {doc.description ? (
                                                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                                    {doc.description}
                                                </p>
                                            ) : null}
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

                {/* Pagination */}
                {!loading && totalItems > 0 ? (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={itemsPerPage}
                        onPageChange={setCurrentPage}
                        itemLabel="เอกสาร"
                    />
                ) : null}
            </div>
        </div>
    )
}
