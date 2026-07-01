import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type Infographic = {
  _id: string | number
  title: string
  imageUrl: string
  displayOrder: number
  isPublished: boolean
}

export default function InfographicPage() {
  const [infographics, setInfographics] = useState<Infographic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/infographics')
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load infographics')
        }
        return res.json()
      })
      .then((data: Infographic[]) => {
        setInfographics(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error loading infographics:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-slate-100 rounded-2xl w-full"></div>
        <div className="h-64 bg-slate-100 rounded-2xl w-full"></div>
        <div className="h-64 bg-slate-100 rounded-2xl w-full"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <div className="card-body text-center">
          <i className="fa-solid fa-exclamation-circle text-4xl text-red-600 mb-4" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
            <i className="fa-solid fa-image text-xl"></i>
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-800">Infographic</h2>
            <p className="text-slate-500 text-sm mt-1">สื่อประชาสัมพันธ์และข้อมูลสุขภาพน่ารู้</p>
          </div>
        </div>
      </div>

      {/* Infographics List */}
      {infographics.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card text-center py-12"
        >
          <div className="card-body">
            <i className="fa-solid fa-image text-6xl text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg">ยังไม่มีข้อมูล Infographic</p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {infographics.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-300 border border-slate-200"
            >
              <div className="card-body p-0 bg-slate-50/50 w-full relative min-h-[200px] sm:min-h-[300px] flex items-center justify-center">
                {/* Fallback spinner while loading */}
                <div className="absolute inset-0 flex items-center justify-center text-slate-200">
                  <i className="fa-solid fa-image fa-3x animate-pulse"></i>
                </div>
                <img
                  src={`${item.imageUrl}${item.imageUrl.includes('?') ? '&' : '?'}w=1200`}
                  alt={item.title}
                  className="w-full h-auto relative z-10 object-contain"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect fill="%23eee" width="800" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="sans-serif" font-size="20"%3EImage not available%3C/text%3E%3C/svg%3E'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
