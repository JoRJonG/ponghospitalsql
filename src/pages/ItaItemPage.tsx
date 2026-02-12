import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { sanitize } from '../utils/sanitize'
import SEO from '../components/SEO'

type ItaItem = { _id: number; title: string; content?: string | null; pdfUrl?: string | null; parentId?: number | null }
type ItaChild = ItaItem

export default function ItaItemPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [item, setItem] = useState<ItaItem | null>(null)
  const [children, setChildren] = useState<ItaChild[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

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
    }).catch(() => setError('ไม่พบข้อมูล')).finally(() => setLoading(false))
  }, [id])

  // เพิ่ม target="_blank" ให้กับลิงก์ทั้งหมดใน content
  useEffect(() => {
    if (contentRef.current) {
      const links = contentRef.current.querySelectorAll('a')
      links.forEach(link => {
        // ถ้าเป็นลิงก์ภายนอกหรือไฟล์ (PDF, DOC, etc.)
        const href = link.getAttribute('href') || ''
        if (href.startsWith('http') || href.includes('.pdf') || href.includes('.doc') || href.includes('.xls')) {
          link.setAttribute('target', '_blank')
          link.setAttribute('rel', 'noopener noreferrer')
        }
      })
    }
  }, [item?.content])

  return (
    <div className="container-narrow py-8">
      {/* SEO meta tags แบบ dynamic — ใช้ชื่อ ITA item เป็น title */}
      <SEO
        title={item?.title ? `ITA - ${item.title}` : 'ITA'}
        description={item?.title ? `${item.title} - ข้อมูล ITA ของโรงพยาบาลปง จังหวัดพะเยา` : 'ข้อมูลการประเมินคุณธรรมและความโปร่งใส (ITA) โรงพยาบาลปง'}
      />
      {loading && <div className="text-gray-600">กำลังโหลด...</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}
      {!loading && !error && item && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-4 text-sm text-gray-500 flex items-center gap-2 flex-wrap">
            <Link to="/ita" className="hover:text-emerald-700 hover:underline transition-colors duration-200">ITA</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">{item.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
          {item.content && (
            <div ref={contentRef} className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={sanitize(item.content)} />
          )}
          {children.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-2">เมนูย่อย</h2>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                {children.map(c => (
                  <li key={c._id}>
                    <Link to={`/ita/item/${c._id}`} className="text-emerald-700 hover:text-emerald-800 hover:underline transition-colors duration-200">{c.title}</Link>
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
