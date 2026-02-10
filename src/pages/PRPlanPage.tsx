import { useState, useEffect } from 'react'
import { useSWR } from '../hooks/useSWR'
import PdfViewer from '../components/PdfViewer'
import { sanitize } from '../utils/sanitize'

type PRPlan = {
    _id: string
    id: string
    title: string
    description?: string
    fileName?: string
    fileSize?: number
    viewCount?: number
    downloadCount?: number
    displayOrder?: number
    isPublished?: boolean
    createdAt?: string
    updatedAt?: string
    filePath?: string
}

export default function PRPlanPage() {
    const [selectedPlan, setSelectedPlan] = useState<PRPlan | null>(null)
    const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
    const [loadingPdf, setLoadingPdf] = useState(false)
    const [pdfError, setPdfError] = useState<string | null>(null)

    // Fetch list of published plans
    const fetcher = async () => {
        const res = await fetch('/api/pr-plans?isPublished=true')
        if (!res.ok) throw new Error('Failed to fetch PR plans')
        const data = await res.json()
        return data.data || []
    }

    const { data: plans = [], error: swrError, isLoading: loadingList } = useSWR('/api/pr-plans?isPublished=true', fetcher, {
        revalidateOnFocus: false,
        refreshInterval: 0
    })

    // Helper to get ID
    const getPlanId = (p: PRPlan) => p.id || p._id

    // Auto-select first plan
    useEffect(() => {
        if (plans.length > 0 && !selectedPlan) {
            setSelectedPlan(plans[0])
        }
    }, [plans, selectedPlan])

    // Load PDF as ArrayBuffer when selectedPlan changes
    useEffect(() => {
        if (!selectedPlan) {
            setPdfData(null)
            return
        }

        const planId = getPlanId(selectedPlan)
        // Clear previous data
        setPdfData(null)
        setLoadingPdf(true)
        setPdfError(null)

        const controller = new AbortController()

        fetch(`/api/pr-plans/${planId}/view`, { signal: controller.signal })
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
    }, [selectedPlan])

    const error = swrError ? (swrError.message || 'เกิดข้อผิดพลาด') : null

    return (
        <div className="container-narrow py-8 min-h-screen">
            {loadingList && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400 mb-3" />
                    <p className="text-gray-500">กำลังโหลดรายการ...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                    <i className="fa-solid fa-circle-exclamation text-xl" />
                    <span>{error}</span>
                </div>
            )}

            {!loadingList && !error && plans.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <i className="fa-regular fa-folder-open text-4xl text-gray-300 mb-3" />
                    <p className="text-gray-500">ยังไม่มีแผนปฏิบัติการที่เผยแพร่ในขณะนี้</p>
                </div>
            )}

            {!loadingList && !error && plans.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar List (If more than 1 plan) */}
                    {plans.length > 1 && (
                        <div className="lg:col-span-1 space-y-2">
                            <h3 className="font-semibold text-gray-700 mb-3 px-1">รายการแผนปฏิบัติการ</h3>
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                {plans.map((p: PRPlan) => {
                                    const pId = getPlanId(p)
                                    const isSelected = selectedPlan && getPlanId(selectedPlan) === pId
                                    return (
                                        <button
                                            key={pId}
                                            onClick={() => setSelectedPlan(p)}
                                            className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition-colors ${isSelected
                                                ? 'bg-purple-50 text-purple-700 font-medium border-l-4 border-l-purple-500'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-l-transparent'
                                                }`}
                                        >
                                            <div className="line-clamp-2">{p.title}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(p.createdAt || '').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className={plans.length > 1 ? 'lg:col-span-3' : 'lg:col-span-4'}>
                        {selectedPlan && (
                            <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {selectedPlan.description && (
                                    <div className="px-6 py-4 prose max-w-none text-gray-700 bg-gray-50/50 border-b border-gray-100">
                                        <div dangerouslySetInnerHTML={sanitize(selectedPlan.description)} />
                                    </div>
                                )}

                                <div className="p-6">
                                    <div className="bg-gray-100 rounded-lg border border-gray-200 overflow-hidden min-h-[500px] flex flex-col relative">
                                        {loadingPdf && (
                                            <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
                                                <div className="flex flex-col items-center">
                                                    <i className="fa-solid fa-spinner fa-spin text-3xl text-purple-500 mb-2" />
                                                    <span className="text-gray-600 text-sm">กำลังโหลดเอกสาร...</span>
                                                </div>
                                            </div>
                                        )}

                                        {pdfError && (
                                            <div className="flex-1 flex items-center justify-center p-8 text-center">
                                                <div className="text-red-500">
                                                    <i className="fa-regular fa-circle-xmark text-4xl mb-2" />
                                                    <p>{pdfError}</p>
                                                    <button onClick={() => window.location.reload()} className="mt-4 text-sm underline text-gray-600 hover:text-gray-900">
                                                        ลองใหม่อีกครั้ง
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!pdfError && pdfData && (
                                            <PdfViewer
                                                data={pdfData}
                                                className="w-full"
                                                onError={(err) => setPdfError(err)}
                                            />
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
