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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-green-600 mb-4" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
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
    <div className="space-y-8">
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
          {infographics.map((item, index) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="card overflow-hidden"
            >
              <div className="card-body p-0">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-auto"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect fill="%23eee" width="800" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="sans-serif" font-size="20"%3EImage not available%3C/text%3E%3C/svg%3E'
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
