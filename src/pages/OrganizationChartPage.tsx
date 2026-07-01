import { useEffect, useState } from 'react'


type OrganizationChart = {
    _id: string
    title: string
    imageUrl: string
    displayOrder: number
}

function OrganizationChartPage() {
    const [charts, setCharts] = useState<OrganizationChart[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<boolean>(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/organization')
                if (!res.ok) throw new Error('Failed to fetch')
                const data = await res.json()
                setCharts(data)
            } catch (err) {
                console.error('Error fetching org charts:', err)
                setError(true)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                        <i className="fa-solid fa-sitemap text-xl"></i>
                    </div>
                    <div>
                        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800">โครงสร้างองค์กร</h2>
                        <p className="text-slate-500 text-sm mt-1">โครงสร้างการบริหารงานและแผนผังบุคลากรของโรงพยาบาลปง</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="space-y-6 animate-pulse">
                    <div className="h-96 bg-slate-100 rounded-2xl w-full border border-slate-200"></div>
                </div>
            ) : error ? (
                <div className="min-h-[300px] flex items-center justify-center rounded-2xl bg-red-50/50 border border-red-100">
                    <div className="text-center text-red-500">
                        <i className="fa-solid fa-exclamation-circle text-3xl mb-3"></i>
                        <p>ขออภัย ไม่สามารถโหลดข้อมูลได้ในขณะนี้</p>
                    </div>
                </div>
            ) : charts.length === 0 ? (
                <div className="min-h-[400px] flex items-center justify-center rounded-2xl bg-white/80 border border-dashed border-gray-300">
                    <div className="text-center text-gray-400">
                        <i className="fa-solid fa-sitemap text-4xl mb-3"></i>
                        <p>ยังไม่มีข้อมูลโครงสร้างองค์กร</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {charts.map((chart) => (
                        <div
                            key={chart._id}
                            className="relative rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6"
                        >
                            <div className="overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center min-h-[300px]">
                                <img
                                    src={`${chart.imageUrl}${chart.imageUrl.includes('?') ? '&' : '?'}w=1200`}
                                    alt={chart.title || "แผนผังองค์กร"}
                                    className="w-full h-auto object-contain"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default OrganizationChartPage
