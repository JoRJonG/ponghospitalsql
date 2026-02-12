import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SEO from '../components/SEO'

type Manager = {
  _id?: string
  name: string
  position: string
  phone?: string
  imageUrl?: string | null
  displayOrder?: number
  updatedAt?: string
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
            <div className="w-40 h-56 rounded-[50%] p-1 bg-white border-[3px] border-emerald-600 shadow-md mx-auto">
              <div className="w-full h-full rounded-[50%] overflow-hidden">
                {m.imageUrl && !imgError ? (
                  <img
                    src={`${m.imageUrl}${m.imageUrl?.includes('?') ? '&' : '?'}w=400&v=${new Date(m.updatedAt || Date.now()).getTime()}`}
                    alt={m.name}
                    loading="eager"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover object-top hover:scale-110 transition-transform duration-700"
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
            <h2 className="text-xl font-bold text-emerald-700 mb-2">
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

function ExecutiveCard({ m, index, total }: { m: Manager; index: number; total: number }) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(m.name)

  // Logic for connector lines (Desktop only - lg grid: 5 cols)
  const isFirst = index === 0
  const isLast = index === total - 1
  const colCount = 5
  const isRowStart = index % colCount === 0
  const isRowEnd = (index + 1) % colCount === 0

  // Draw generic left arm if not first item and not start of row
  const showLeftArm = !isFirst && !isRowStart
  // Draw generic right arm if not last item and not end of row
  const showRightArm = !isLast && !isRowEnd

  // L-Shape Connector Logic (Wrap around right side to next row - Desktop/5cols)
  // End of row (5th item)
  const isRowEndItem = (index + 1) % colCount === 0
  const hasMoreItems = total > index + 1

  // Check if the slot directly below is empty (e.g. Item 10 is missing for Item 5)
  // If so, we need a "Long Wrap" to connect back to the start of the next row (Item 6)
  const itemBelowExists = index + colCount < total
  const showWrapConnector = isRowEndItem && hasMoreItems
  const useLongWrap = showWrapConnector && !itemBelowExists

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="h-full relative"
    >
      {/* Connector Lines (Desktop Only) */}
      <div className="hidden lg:block absolute -top-8 left-0 w-full h-8 pointer-events-none z-0">
        {/* Vertical Line Up (Stem) */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0.5 h-full bg-emerald-300"></div>

        {/* Horizontal Arms (Rail) - Extends into the gap (approx 24px gap -> 12px overlap) */}
        {showLeftArm && (
          <div className="absolute top-0 right-1/2 h-0.5 bg-emerald-300 w-[calc(50%+16px)]"></div>
        )}
        {showRightArm && (
          <div className="absolute top-0 left-1/2 h-0.5 bg-emerald-300 w-[calc(50%+16px)]"></div>
        )}

        {/* Dot at junction */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 -mt-[2px] z-10"></div>
      </div>

      {/* Right-Side L-Shape Wrap Connector (Bridge to next row) */}
      {showWrapConnector && (
        <div
          className={`hidden lg:block absolute -top-8 right-[-1.5rem] h-[calc(100%+3.2rem)] border-t-2 border-r-2 border-b-2 border-emerald-300 rounded-tr-lg rounded-br-lg pointer-events-none z-0
            ${useLongWrap ? 'w-[calc(450%+7.5rem)]' : 'w-[calc(50%+1.5rem)]'}
          `}
        ></div>
      )}

      <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-xl border border-gray-100 transition-all duration-500 h-full flex flex-col items-center text-center max-w-[280px] mx-auto z-10 relative hover:-translate-y-1">
        {/* Image - Vertical Oval */}
        <div className="mb-3">
          <div className="w-36 h-48 rounded-[50%] p-1 bg-white border-[3px] border-emerald-600 shadow-sm mx-auto">
            <div className="w-full h-full rounded-[50%] overflow-hidden">
              {m.imageUrl && !imgError ? (
                <img
                  src={`${m.imageUrl}${m.imageUrl?.includes('?') ? '&' : '?'}w=200&v=${new Date(m.updatedAt || Date.now()).getTime()}`}
                  alt={m.name}
                  loading="lazy"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover object-top hover:scale-110 transition-transform duration-700"
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
          <h3 className="text-base font-bold text-emerald-700 leading-tight min-h-[2.5rem] flex items-center justify-center">
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
      {/* SEO meta tags สำหรับหน้าคณะผู้บริหาร */}
      <SEO
        title="คณะผู้บริหาร"
        description="คณะผู้บริหารโรงพยาบาลปง ผู้อำนวยการ และทีมบริหารที่มุ่งมั่นพัฒนาบริการสุขภาพเพื่อประชาชนอำเภอปง จังหวัดพะเยา"
      />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-extrabold text-emerald-800 mb-2">
          โครงสร้างผู้บริหารโรงพยาบาลปง
        </h1>
      </motion.div>

      {/* Director Section */}
      {director && (
        <div className="mb-16 relative">
          <DirectorCard m={director} />
          {/* Connector Line Down (Desktop Only) */}
          {others.length > 0 && (
            <div className="hidden lg:block absolute -bottom-8 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-emerald-300"></div>
          )}
        </div>
      )}

      {/* Other Executives Grid */}
      {others.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-y-12 relative">
          {others.map((m, i) => (
            <ExecutiveCard key={m._id || i} m={m} index={i} total={others.length} />
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      )}
    </div>
  )
}
