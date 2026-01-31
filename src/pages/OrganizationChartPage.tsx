import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

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

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, staggerChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 lg:p-8 border border-emerald-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-100/50 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-teal-100/50 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">โครงสร้างองค์กร</h2>
                    <div className="h-1 w-20 bg-emerald-500 rounded-full mb-4"></div>
                    <p className="text-gray-600 max-w-2xl">
                        โครงสร้างการบริหารงานและแผนผังบุคลากรของโรงพยาบาลปง
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100">
                    <div className="text-center text-gray-400">
                        <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3"></i>
                        <p>กำลังโหลดข้อมูล...</p>
                    </div>
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
                        <motion.div
                            key={chart._id}
                            variants={itemVariants}
                            className="relative rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm p-4 lg:p-6"
                        >
                            <div className="overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                                <img
                                    src={chart.imageUrl}
                                    alt={chart.title || "แผนผังองค์กร"}
                                    className="w-full h-auto object-contain"
                                    loading="lazy"
                                />
                            </div>
                            {/* Optional: if you want to show title */}
                            {/* <div className="mt-4 text-center font-medium text-gray-700">{chart.title}</div> */}
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    )
}

export default OrganizationChartPage
