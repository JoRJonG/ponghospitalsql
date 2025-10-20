import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface ItaItem { _id: number; title: string; content?: string | null; pdfUrl?: string | null; parentId?: number | null; }
interface ItaChild extends ItaItem {}
interface PdfFile { id: number; filename: string; url: string; size: number }

export default function ItaItemPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [item, setItem] = useState<ItaItem | null>(null)
  const [children, setChildren] = useState<ItaChild[]>([])
  const [pdfs, setPdfs] = useState<PdfFile[]>([])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/ita/item/${id}`).then(r => {
      if (!r.ok) throw new Error('not ok')
      return r.json()
    }).then(d => {
      setItem(d.item)
      setChildren(d.children || [])
      setPdfs(d.pdfs || [])
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
          {item.pdfUrl && (
            <div className="mb-4">
              <a href={item.pdfUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-3 py-2 rounded bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 text-sm">
                <i className="fa-regular fa-file-pdf" /> เปิดไฟล์หลัก (PDF)
              </a>
            </div>
          )}
          {pdfs.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">ไฟล์แนบ ({pdfs.length})</h2>
              <ul className="space-y-1 text-sm">
                {pdfs.map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <a href={f.url} target="_blank" rel="noopener" className="text-blue-700 hover:underline flex-1 truncate" title={f.filename}>
                      <i className="fa-regular fa-file-pdf mr-1" />{f.filename}
                    </a>
                    <span className="text-gray-400 text-xs">{(f.size/1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
