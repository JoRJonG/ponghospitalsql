import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface ItaItem { _id: number; title: string; content?: string | null; pdfUrl?: string | null; parentId?: number | null; }
interface ItaChild extends ItaItem {}

export default function ItaItemPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [item, setItem] = useState<ItaItem | null>(null)
  const [children, setChildren] = useState<ItaChild[]>([])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/ita/item/${id}`).then(r => {
      if (!r.ok) throw new Error('not ok')
      return r.json()
    }).then(d => {
      setItem(d.item)
      setChildren(d.children || [])
      setError(null)
    }).catch(() => setError('ไม่พบข้อมูล')).finally(()=>setLoading(false))
  }, [id])

  return (
    <div className="container-narrow py-8">
      {loading && <div className="text-gray-600">กำลังโหลด...</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}
      {!loading && !error && item && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
          <div className="mb-4 text-sm text-gray-500 flex items-center gap-2 flex-wrap">
            <Link to="/ita" className="hover:underline">ITA</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">{item.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
          {item.content && (
            <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: item.content }} />
          )}
          {children.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-2">เมนูย่อย</h2>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                {children.map(c => (
                  <li key={c._id}>
                    <Link to={`/ita/item/${c._id}`} className="text-green-700 hover:underline">{c.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
