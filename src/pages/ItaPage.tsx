import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { sanitize } from '../utils/sanitize'

type ItaNode = {
  _id: number
  parentId?: number | null
  title: string
  slug?: string | null
  content?: string | null
  order?: number
  isPublished?: boolean
  pdfUrl?: string | null
  children?: ItaNode[]
}

export default function ItaPage() {
  const [tree, setTree] = useState<ItaNode[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/ita/tree').then(r => r.json()).then(d => { setTree(d || []) }).catch(() => { }).finally(() => setLoading(false))
  }, [])

  const renderNode = (node: ItaNode, depth = 0) => {
    return (
      <li key={node._id} id={`ita-${node._id}`} className="mt-2 scroll-mt-28">
        <div className="flex items-start gap-2">
          <Link to={`/ita/item/${node._id}`} className="font-medium text-gray-800 hover:text-emerald-700 hover:underline transition-colors duration-200" title="เปิดหน้าแยก">{node.title}</Link>
        </div>
        {node.content && (
          <div className="prose prose-sm max-w-none text-gray-600 mt-1" dangerouslySetInnerHTML={sanitize(node.content)} />
        )}
        {node.children && node.children.length > 0 && (
          <ul className="ml-4 border-l border-gray-200 pl-4 mt-1">
            {node.children.map(c => renderNode(c, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="container-narrow py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">ITA</h1>
        <p className="text-gray-600 mt-2">ข้อมูลและเมนูธรรมาภิบาล (Integrity & Transparency)</p>
      </motion.div>
      {loading ? <div className="text-gray-600">กำลังโหลด...</div> : (
        tree.length === 0 ? <div className="text-gray-500">ยังไม่มีข้อมูล ITA</div> : (
          <ul className="list-none pl-0">
            {tree.map(n => renderNode(n))}
          </ul>
        )
      )}
    </div>
  )
}