import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type Manager = { 
  _id?: string
  name: string
  position: string
  imageUrl?: string | null
  displayOrder?: number
}

// Fallback data (will be replaced by API data)
const fallbackManagers: Manager[] = []

function getInitials(name: string): string {
  if (!name) return ''
  // Split by whitespace and take first chars of first two tokens
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const second = parts[1]?.[0] || ''
  return (first + second).toUpperCase()
}

function ManagerCard({ m, index }: { m: Manager; index: number }) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(m.name)
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="card text-center h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className="card-body p-6">
        {/* Profile Image */}
        <div className="relative mx-auto w-40 h-40 mb-5">
          <div className="w-full h-full rounded-full overflow-hidden shadow-md">
            {m.imageUrl && !imgError ? (
              <img
                src={m.imageUrl}
                alt={m.name ? `ผู้บริหาร: ${m.name}` : 'ผู้บริหาร'}
                loading="lazy"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover object-top"
                style={{ objectPosition: 'center 25%' }}
              />
            ) : (
              <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                <span className="text-4xl text-gray-400 font-bold select-none">{initials}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Name & Position */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">
            {m.name}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed min-h-[2.5rem]">
            {m.position}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default function ManagementPage() {
  const [managers, setManagers] = useState<Manager[]>(fallbackManagers)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => { 
    // Fetch executives from API
    fetch('/api/executives')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setManagers(data)
        }
      })
      .catch(err => {
        console.error('Failed to fetch executives:', err)
        // Keep fallback data
      })
      .finally(() => setLoading(false))
  }, [])
  
  const [director, ...others] = managers
  const [dirImgError, setDirImgError] = useState(false)
  const dirInitials = director ? getInitials(director.name) : ''
  return (
    <div className="container-narrow py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">ผู้บริหารโรงพยาบาล</h1>
        <p className="mt-2 text-gray-600">ข้อมูลอย่างเป็นทางการของคณะผู้บริหารโรงพยาบาลปง</p>
      </motion.div>

      {/* Featured Director */}
      {director && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mb-12"
        >
          <div className="card shadow-md">
            <div className="card-body p-8 md:p-10">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Director Image */}
                <div className="flex-shrink-0">
                  <div className="relative w-56 h-56">
                    <div className="w-full h-full rounded-full overflow-hidden shadow-xl ring-4 ring-gray-100">
                      {director && director.imageUrl && !dirImgError ? (
                        <img
                          src={director.imageUrl}
                          alt={director.name ? `ผู้อำนวยการ: ${director.name}` : 'ผู้อำนวยการ'}
                          loading="lazy"
                          onError={() => setDirImgError(true)}
                          className="h-full w-full object-cover object-top"
                          style={{ objectPosition: 'center 25%' }}
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                          <span className="text-6xl text-gray-400 font-bold select-none">{dirInitials}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Director Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="space-y-4">
                    <div>
                      <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium mb-3">
                        <i className="fa-solid fa-briefcase mr-1.5 text-xs"></i>
                        {director.position}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {director.name}
                      </h2>
                      <div className="w-20 h-1 bg-gray-300 rounded-full mx-auto md:mx-0"></div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      นำทีมบริหารงานโรงพยาบาลปง เพื่อให้บริการด้านสุขภาพที่มีคุณภาพแก่ประชาชน
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Other Executives */}
      {others.length > 0 && (
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">คณะผู้บริหาร</h2>
            <p className="text-gray-600">ทีมผู้นำที่ขับเคลื่อนองค์กร</p>
          </motion.div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {others.map((m: Manager, i: number) => (
              <ManagerCard m={m} index={i} key={m._id || i} />
            ))}
          </div>
        </div>
      )}
      
      {others.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center gap-2 text-gray-500">
            <i className="fa-solid fa-info-circle"></i>
            <span>ยังไม่มีข้อมูลผู้บริหารเพิ่มเติม</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
