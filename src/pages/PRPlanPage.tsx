import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PdfViewer from '../components/PdfViewer'

type PRPlan = {
    id: number
    title: string
    description: string
    fileName: string
    fileSize: number
    downloadCount: number
    displayOrder: number
    createdAt: string
}

export default function PRPlanPage() {
    const [plans, setPlans] = useState<PRPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedPlan, setSelectedPlan] = useState<PRPlan | null>(null)

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setLoading(true)
                const res = await fetch('/api/pr-plans?isPublished=true')
                if (!res.ok) throw new Error('Failed to fetch PR plans')

                const data = await res.json()
                const fetchedPlans = data.data || []
                setPlans(fetchedPlans)

                // เลือกแผนแรกโดยอัตโนมัติ
                if (fetchedPlans.length > 0) {
                    setSelectedPlan(fetchedPlans[0])
                }
            } catch (err) {
                console.error('Error fetching PR plans:', err)
                setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
            } finally {
                setLoading(false)
            }
        }

        fetchPlans()
    }, [])

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col">
            {/* Header - แบบกระชับ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 mb-4"
            >
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-purple-600 text-xl" />
                    <h2 className="text-xl font-bold text-gray-900">แผนปฏิบัติการด้านการป้องกัน ปราบปรามการทุจริตและประพฤติมิชอบ</h2>
                </div>
            </motion.div>

            {/* PDF Viewer */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <i className="fa-solid fa-spinner fa-spin text-4xl text-gray-400 mb-4" />
                        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center bg-red-50 rounded-lg border-2 border-red-200">
                    <div className="text-center">
                        <i className="fa-solid fa-exclamation-circle text-4xl text-red-600 mb-4" />
                        <p className="text-red-800">{error}</p>
                    </div>
                </div>
            ) : plans.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <i className="fa-solid fa-file-pdf text-4xl text-gray-400 mb-4" />
                        <p className="text-gray-600">ยังไม่มีแผนปฏิบัติการที่เผยแพร่</p>
                    </div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 flex flex-col bg-white rounded-lg shadow-lg overflow-hidden"
                >
                    {/* แท็บเลือกไฟล์ (ถ้ามีหลายไฟล์) */}
                    {plans.length > 1 && (
                        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
                            {plans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedPlan?.id === plan.id
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <i className="fa-solid fa-file-pdf mr-2" />
                                    {plan.title}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* PDF Viewer */}
                    {selectedPlan && (
                        <div className="flex-1 relative overflow-hidden">
                            <PdfViewer
                                url={`/api/pr-plans/${selectedPlan.id}/view`}
                                className="w-full h-full"
                            />
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    )
}
