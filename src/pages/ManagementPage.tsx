import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type Manager = {
  _id?: string
  name: string
  position: string
  phone?: string
  imageUrl?: string | null
  displayOrder?: number
}

// Fallback data
const fallbackManagers: Manager[] = []

function getInitials(name: string): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const second = parts[1]?.[0] || ''
  return (first + second).toUpperCase()
}

function DirectorCard({ m }: { m: Manager }) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(m.name)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10"
    >
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 max-w-[280px] mx-auto overflow-hidden text-center hover:shadow-xl transition-shadow duration-300">
        <div className="flex flex-col items-center">
          {/* Image - Vertical Oval */}
          <div className="mb-4 relative">
            <div className="w-40 h-56 rounded-[50%] p-1 bg-white border-[3px] border-green-600 shadow-md mx-auto">
              <div className="w-full h-full rounded-[50%] overflow-hidden">
                {m.imageUrl && !imgError ? (
                  <img
                    src={m.imageUrl}
                    alt={m.name}
                    loading="eager"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 text-4xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Content */}
          <div className="w-full">
            <h2 className="text-xl font-bold text-green-700 mb-2">
              {m.name}
            </h2>
            <p className="text-sm text-gray-600 font-medium mb-3 leading-snug px-2">
              {m.position}
            </p>

            {(m.phone && m.phone !== 'null' && m.phone !== 'undefined') && (
              <div className="text-sm text-gray-600">
                โทร: {m.phone}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ExecutiveCard({ m, index }: { m: Manager; index: number }) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(m.name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="h-full"
    >
      <div className="bg-white rounded-xl p-5 shadow hover:shadow-lg border border-gray-100 transition-all duration-300 h-full flex flex-col items-center text-center max-w-[240px] mx-auto">
        {/* Image - Vertical Oval */}
        <div className="mb-3">
          <div className="w-36 h-48 rounded-[50%] p-1 bg-white border-[3px] border-green-600 shadow-sm mx-auto">
            <div className="w-full h-full rounded-[50%] overflow-hidden">
              {m.imageUrl && !imgError ? (
                <img
                  src={m.imageUrl}
                  alt={m.name}
                  loading="lazy"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 text-3xl font-bold">
                  {initials}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 w-full space-y-1">
          <h3 className="text-base font-bold text-green-700 leading-tight min-h-[2.5rem] flex items-center justify-center">
            {m.name}
          </h3>
          <p className="text-sm text-gray-600 font-medium leading-tight min-h-[2rem] flex items-center justify-center">
            {m.position}
          </p>

          {(m.phone && m.phone !== 'null' && m.phone !== 'undefined') && (
            <div className="pt-1 mt-auto">
              <span className="text-sm text-gray-600">โทร: {m.phone}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function ManagementPage() {
  const [managers, setManagers] = useState<Manager[]>(fallbackManagers)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/executives')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setManagers(data)
        }
      })
      .catch(err => console.error('Failed to fetch:', err))
      .finally(() => setLoading(false))
  }, [])

  const [director, ...others] = managers

  return (
    <div className="container-narrow py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl font-extrabold text-green-800 mb-4">
          โครงสร้างผู้บริหารโรงพยาบาลปง
        </h1>

        <div className="mt-6 flex justify-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-200"></span>
          <span className="w-3 h-3 rounded-full bg-green-400"></span>
          <span className="w-3 h-3 rounded-full bg-green-600"></span>
        </div>
      </motion.div>

      {/* Director Section */}
      {director && (
        <div className="mb-12">
          <DirectorCard m={director} />
        </div>
      )}

      {/* Other Executives Grid */}
      {others.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {others.map((m, i) => (
            <ExecutiveCard key={m._id || i} m={m} index={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {others.length === 0 && !loading && !director && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <i className="fa-regular fa-id-card text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-500">ยังไม่มีข้อมูลผู้บริหาร</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      )}
    </div>
  )
}
