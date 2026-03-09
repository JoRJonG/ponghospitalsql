import { useState, useEffect, lazy, Suspense } from 'react'

const PdfViewer = lazy(() => import('./PdfViewer'))

type Document = {
    _id: string
    id?: number
    title: string
    description?: string
    category: string
    filePath: string
    fileName: string
    fileSize: number
    downloadCount: number
    createdAt: string
    isPublished: boolean
    // fallback for MySQL snake_case responses
    created_at?: string
    file_size?: number
    download_count?: number
    file_name?: string
}

type Props = {
    title: string
    category: string
    apiEndpoint?: string
}

export default function DocumentCategoryView({ category, apiEndpoint = '/api/documents' }: Props) {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // PDF Viewer States
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
    const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
    const [loadingPdf, setLoadingPdf] = useState(false)
    const [pdfError, setPdfError] = useState<string | null>(null)

    useEffect(() => {
        const fetchDocuments = async () => {
            setLoading(true)
            try {
                const url = `${apiEndpoint}?category=${encodeURIComponent(category)}&limit=100`
                const res = await fetch(url)
                if (!res.ok) throw new Error('Failed to fetch documents')
                const data = await res.json()
                setDocuments(data.data || data.documents || [])
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setLoading(false)
            }
        }

        fetchDocuments()
    }, [category, apiEndpoint])

    // Load PDF when selected
    useEffect(() => {
        if (!selectedDoc) {
            setPdfData(null)
            return
        }

        const docId = selectedDoc.id || selectedDoc._id
        setPdfData(null)
        setLoadingPdf(true)
        setPdfError(null)

        const controller = new AbortController()
        const baseEndpoint = apiEndpoint.split('?')[0] // Remove query params if any

        // API Endpoint สำหรับเปิดดูไฟล์
        let viewUrl = `${baseEndpoint}/file/${docId}`

        // ถ้าเป็น /api/legal-ethics มันจะใช้ /file/:id สำหรับพรีวิว
        if (baseEndpoint.includes('/pr-plans')) {
            viewUrl = `${baseEndpoint}/${docId}/view`
        }

        fetch(viewUrl, { signal: controller.signal })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Failed to load PDF (${res.status})`)
                }
                const buffer = await res.arrayBuffer()
                setPdfData(buffer)
                setLoadingPdf(false)
            })
            .catch((err) => {
                if (err.name === 'AbortError') return
                console.error('Error loading PDF data:', err)
                setPdfError('ไม่สามารถโหลดไฟล์เอกสารได้')
                setLoadingPdf(false)
            })

        return () => {
            controller.abort()
        }
    }, [selectedDoc, apiEndpoint])

    // Auto select first document
    useEffect(() => {
        if (documents.length > 0 && !selectedDoc) {
            setSelectedDoc(documents[0])
        }
    }, [documents, selectedDoc])


    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <div className="space-y-6 animate-fade-in relative">
            {loading ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>กำลังโหลดข้อมูล...</p>
                </div>
            ) : error ? (
                <div className="p-8 text-center text-red-500 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <i className="fa-solid fa-exclamation-circle text-2xl mb-2"></i>
                    <p>{error}</p>
                </div>
            ) : documents.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100 border-dashed">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-folder-open text-2xl text-gray-400"></i>
                    </div>
                    <p className="text-lg">ยังไม่มีเอกสารเผยแพร่ในขณะนี้</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar List */}
                    {documents.length > 1 && (
                        <div className="lg:col-span-1 space-y-2">
                            <h3 className="font-semibold text-gray-700 mb-3 px-1">รายการเอกสาร</h3>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                {documents.map((doc) => {
                                    const docId = doc.id || doc._id
                                    const isSelected = selectedDoc && (selectedDoc.id || selectedDoc._id) === docId
                                    return (
                                        <button
                                            key={docId}
                                            onClick={() => setSelectedDoc(doc)}
                                            className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${isSelected
                                                ? 'bg-emerald-50 text-emerald-800 font-medium border-l-[3px] border-l-emerald-500'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-l-transparent'
                                                }`}
                                        >
                                            <div className="text-sm line-clamp-2 leading-relaxed">{doc.title}</div>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                                <span><i className="fa-regular fa-calendar mr-1"></i>{formatDate(doc.createdAt || doc.created_at || '')}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Main Content Area (PDF Viewer) */}
                    <div className={documents.length > 1 ? 'lg:col-span-3' : 'lg:col-span-4'}>
                        {selectedDoc && (
                            <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
                                {selectedDoc.description && (
                                    <div className="px-6 py-4 prose max-w-none text-gray-700 bg-gray-50/50 border-b border-gray-100">
                                        <div dangerouslySetInnerHTML={{ __html: selectedDoc.description }} />
                                    </div>
                                )}

                                {/* PDF Viewer Container */}
                                <div className="p-6">
                                    <div className="bg-gray-100 rounded-lg border border-gray-200 overflow-hidden min-h-[500px] flex flex-col relative w-full">
                                        {loadingPdf && (
                                            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                <div className="flex flex-col items-center">
                                                    <i className="fa-solid fa-spinner fa-spin text-3xl text-emerald-500 mb-2" />
                                                    <span className="text-gray-600 text-sm animate-pulse">กำลังโหลดเอกสาร...</span>
                                                </div>
                                            </div>
                                        )}

                                        {pdfError && (
                                            <div className="flex-1 flex items-center justify-center p-8 text-center bg-white">
                                                <div className="text-red-500 max-w-sm">
                                                    <i className="fa-regular fa-circle-xmark text-4xl mb-2" />
                                                    <h3 className="font-bold text-gray-900 mb-1">เกิดข้อผิดพลาด</h3>
                                                    <p className="text-gray-600 text-sm mb-4">{pdfError}</p>
                                                    <button
                                                        onClick={() => window.location.reload()}
                                                        className="mt-2 text-sm underline text-gray-600 hover:text-gray-900"
                                                    >
                                                        ลองใหม่อีกครั้ง
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!pdfError && pdfData && (
                                            <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8"><i className="fa-solid fa-spinner fa-spin text-3xl text-gray-300" /></div>}>
                                                <PdfViewer
                                                    data={pdfData}
                                                    className="w-full"
                                                    onError={(err) => setPdfError(err)}
                                                />
                                            </Suspense>
                                        )}
                                    </div>
                                </div>
                            </article>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
