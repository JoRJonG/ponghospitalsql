import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import RichTextEditor from './RichTextEditor'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../contexts/ToastContext'

type ItaItem = {
  _id: number
  parentId?: number | null
  title: string
  slug?: string | null
  content?: string | null
  order?: number
  isPublished?: boolean
  pdfUrl?: string | null
  children?: ItaItem[]
  pdfs?: Array<{ id: number; filename: string; url: string; size: number }>
}

export default forwardRef(function ItaManagement(_props, ref) {
  const { getToken } = useAuth() as any
  const [tree, setTree] = useState<ItaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<ItaItem | null>(null)
  const [parentForNew, setParentForNew] = useState<ItaItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<ItaItem>>({ title: '', content: '', isPublished: true, pdfUrl: '' })
  // state เดิมสำหรับสถานะอัปโหลดเดี่ยว (ไม่ใช้แล้วหลังเปลี่ยนเป็น multi-file)
  // const [uploadingPdf, setUploadingPdf] = useState(false)
  const [parentSelect, setParentSelect] = useState<number | null>(null)
  const [pdfList, setPdfList] = useState<Array<{ id: number; filename: string; url: string; size: number }>>([])
  const [pdfLoading, setPdfLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  // เก็บไฟล์ PDF ระหว่างกำลังสร้างเมนูใหม่ (ยังไม่มี ID)
  const [pendingNewPdfs, setPendingNewPdfs] = useState<File[]>([])

  const { showToast } = useToast()

  // Provide headers for JSON or multipart (avoid setting Content-Type manually for FormData)
  const authHeaders = (json: boolean = true): Record<string,string> => { const t=getToken(); const h: Record<string,string> = {}; if (json) h['Content-Type']='application/json'; if (t) h['Authorization'] = `Bearer ${t}`; return h }
  const load = () => { setLoading(true); fetch('/api/ita/tree', { headers: authHeaders()}).then(r=>r.json()).then(d=>setTree(d||[])).finally(()=>setLoading(false)) }
  
  const refreshIta = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ita/tree', { headers: authHeaders() })
      const data = await response.json()
      setTree(data || [])
    } finally {
      setLoading(false)
    }
  }
  
  useImperativeHandle(ref, () => ({
    refreshIta
  }))
  
  useEffect(()=>{ load() }, [])

  const toggle = (id: number) => { setExpanded(s => { const n=new Set(s); n.has(id)? n.delete(id): n.add(id); return n }) }

  const startNew = (parent: ItaItem | null) => { setParentForNew(parent); setEditing(null); setCreating(true); setForm({ title: '', content: '', isPublished: true, pdfUrl: '' }); setParentSelect(parent ? parent._id : null) }
  const startEdit = (item: ItaItem) => { setEditing(item); setParentForNew(null); setCreating(false); setForm({ title: item.title, content: item.content, isPublished: item.isPublished, slug: item.slug, pdfUrl: item.pdfUrl || '' }); setParentSelect(item.parentId ?? null) }
  const cancel = () => { setEditing(null); setParentForNew(null); setCreating(false); setForm({ title: '', content: '', isPublished: true, pdfUrl: '' }); setParentSelect(null) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) return
    setBusy(true)
    let pdfFileId: number | undefined = undefined
    // If pdfUrl starts with 'file:upload:' treat it as a data URL waiting upload (not implemented now)
    const body = JSON.stringify({
      title: form.title,
      content: form.content,
      isPublished: form.isPublished,
      slug: form.slug,
      pdfUrl: form.pdfUrl && form.pdfUrl.startsWith('/api/ita/pdf/') ? form.pdfUrl : (form.pdfUrl || undefined),
      pdfFileId,
      parentId: parentSelect === null ? null : parentSelect
    })
    try {
      let ok = false
      if (editing) {
        const r = await fetch(`/api/ita/${editing._id}`, { method:'PUT', headers: authHeaders(true), body })
        ok = r.ok
        if (ok && pendingNewPdfs.length) {
          // ถ้ามีไฟล์ที่เลือกไว้ตอนกำลังแก้ไข (กรณีพิเศษ)
          for (const f of pendingNewPdfs) { await uploadPdfToItem(f) }
          setPendingNewPdfs([])
        }
      } else {
        const r = await fetch('/api/ita', { method:'POST', headers: authHeaders(true), body })
        ok = r.ok
        let created: any = null
        if (ok) { try { created = await r.json() } catch {}
        }
        if (ok && created?._id && pendingNewPdfs.length) {
          for (const f of pendingNewPdfs) { await uploadPdfToItem(f, created._id) }
          setPendingNewPdfs([])
        }
      }
      if (ok) {
        showToast(editing ? 'บันทึกการแก้ไขเมนูสำเร็จ' : 'เพิ่มเมนูสำเร็จ', undefined, 'success', 3000)
        cancel(); load()
      } else showToast('บันทึกไม่สำเร็จ', undefined, 'error', 4000)
    } catch {
      showToast('เกิดข้อผิดพลาดระหว่างบันทึก', undefined, 'error', 4000)
    } finally { setBusy(false) }
  }
  const del = async (item: ItaItem) => {
    if (!confirm('ยืนยันการลบ (จะลบเมนูย่อยทั้งหมดด้วย) ?')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/ita/${item._id}`, { method:'DELETE', headers: authHeaders() })
      if (r.ok) {
        if (editing && editing._id === item._id) cancel()
        showToast('ลบเมนูสำเร็จ', undefined, 'success', 3000)
        load()
      } else {
        showToast('ลบเมนูไม่สำเร็จ', undefined, 'error', 4000)
      }
    } catch {
      showToast('เกิดข้อผิดพลาดระหว่างลบ', undefined, 'error', 4000)
    } finally { setBusy(false) }
  }

  // Helpers for reorder & parent selection
  const findParentAndSiblings = (id: number, nodes: ItaItem[] = tree, parent: ItaItem | null = null): { parent: ItaItem | null; siblings: ItaItem[] } | null => {
    for (const n of nodes) {
      if (n._id === id) {
        return { parent, siblings: parent ? (parent.children || []) : tree }
      }
      if (n.children && n.children.length) {
        const r = findParentAndSiblings(id, n.children, n)
        if (r) return r
      }
    }
    return null
  }
  const reorderSiblings = async (siblings: ItaItem[]) => {
    const payload = siblings.map((s, i) => ({ id: s._id, order: i }))
    await fetch('/api/ita/reorder', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ items: payload }) })
  }
  const move = async (item: ItaItem, dir: -1 | 1) => {
    const ctx = findParentAndSiblings(item._id)
    if (!ctx) return
    const arr = [...ctx.siblings]
    const idx = arr.findIndex(s => s._id === item._id)
    if (idx === -1) return
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    const [moved] = arr.splice(idx, 1)
    arr.splice(target, 0, moved)
    await reorderSiblings(arr)
    load()
  }

  const flatten = (nodes: ItaItem[], acc: ItaItem[] = []): ItaItem[] => {
    for (const n of nodes) { acc.push(n); if (n.children?.length) flatten(n.children, acc) }
    return acc
  }
  const allItems = flatten(tree)
  const descendantsOfEditing = new Set<number>()
  const collectDesc = (n: ItaItem) => { descendantsOfEditing.add(n._id); n.children?.forEach(c => collectDesc(c)) }
  if (editing) collectDesc(editing)

  // Load multiple PDFs for the editing item
  useEffect(() => {
    if (!editing) { setPdfList([]); return }
    setPdfLoading(true)
    fetch(`/api/ita/${editing._id}/pdfs`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setPdfList(d) }).catch(()=>{}).finally(()=>setPdfLoading(false))
  }, [editing])

  const uploadPdfToItem = async (file: File, forcedItemId?: number) => {
    const itemId = forcedItemId ?? editing?._id
    if (!itemId) return
    const fd = new FormData(); fd.append('file', file)
    const t = getToken(); const headers: Record<string,string> = {}; if (t) headers['Authorization'] = `Bearer ${t}`
    const r = await fetch(`/api/ita/${itemId}/pdf`, { method:'POST', headers, body: fd })
    if (!r.ok) { console.warn('upload pdf failed'); return }
    await r.json();
    if (!forcedItemId && editing) {
      fetch(`/api/ita/${editing._id}/pdfs`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setPdfList(d) })
    }
  }
  const deletePdfFile = async (id: number) => {
    if (!confirm('ลบไฟล์ PDF นี้?')) return
    const t = getToken(); const headers: Record<string,string> = {}; if (t) headers['Authorization'] = `Bearer ${t}`
    const r = await fetch(`/api/ita/pdf/file/${id}`, { method:'DELETE', headers })
    if (r.ok) setPdfList(list => list.filter(f => f.id !== id))
  }

  const renderNodes = (nodes: ItaItem[], depth=0) => {
    return (
      <ul className={depth? 'ml-5 border-l border-gray-200 pl-4 mt-2 space-y-1':'space-y-2'}>
        {nodes.map(n => {
          const hasChildren = !!(n.children && n.children.length)
          const open = expanded.has(n._id)
          return (
            <li key={n._id} className="bg-white/60 rounded border p-3">
              <div className="flex items-start gap-2">
                {hasChildren && (
                  <button onClick={()=>toggle(n._id)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" aria-label="toggle children">
                    {open? '-':'+'}
                  </button>
                )}
                {!hasChildren && <span className="w-5" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{n.title}</span>
                    {n.pdfUrl && <a href={n.pdfUrl} target="_blank" rel="noopener" className="text-xs text-blue-700 underline">PDF</a>}
                    {!n.isPublished && <span className="badge gray">ซ่อน</span>}
                    <span className="text-[10px] text-gray-400">order:{n.order}</span>
                  </div>
                  {n.content && <div className="text-xs text-gray-600 line-clamp-2" dangerouslySetInnerHTML={{ __html: n.content }} />}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <button onClick={()=>startNew(n)} className="btn btn-outline">➕ เพิ่มเมนูย่อย</button>
                    <button onClick={()=>startEdit(n)} className="btn btn-outline">✏️ แก้ไข</button>
                    <button onClick={()=>del(n)} className="btn btn-outline">🗑️ ลบ</button>
                    <button onClick={()=>move(n,-1)} className="btn btn-outline" aria-label="ย้ายขึ้น">⬆️</button>
                    <button onClick={()=>move(n,1)} className="btn btn-outline" aria-label="ย้ายลง">⬇️</button>
                  </div>
                </div>
              </div>
              {hasChildren && open && (
                <div className="mt-2">
                  {renderNodes(n.children!, depth+1)}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">จัดการเมนู ITA</h2>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md" onClick={()=>startNew(null)}>
          <span>➕</span>
          เพิ่มเมนูหลัก
        </button>
      </div>
      {loading ? <div className="text-gray-600">กำลังโหลด...</div> : (
        tree.length === 0 ? <div className="text-gray-500 mb-6">ยังไม่มีเมนู ITA</div> : renderNodes(tree)
      )}

      {(creating || editing) && (
        <div className="mt-8 card">
          <div className="card-header flex items-center justify-between">
            <span>{editing ? 'แก้ไขเมนู' : parentForNew ? 'เพิ่มเมนูย่อยของ: ' + parentForNew.title : 'เพิ่มเมนูหลัก'}</span>
            <button className="btn btn-outline" onClick={cancel}>ปิด</button>
          </div>
          <div className="card-body">
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">ชื่อเมนู</label>
                <input value={form.title || ''} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} required className="w-full rounded border px-3 py-2" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Slug (ไม่บังคับ)</label>
                  <input value={form.slug || ''} onChange={e=>setForm(f=>({ ...f, slug: e.target.value }))} className="w-full rounded border px-3 py-2" placeholder="เช่น policy-1" />
                </div>
                <div>
                  <label className="block text-sm mb-1">อยู่ภายใต้เมนู</label>
                  <select value={parentSelect===null? '' : String(parentSelect)} onChange={e=>setParentSelect(e.target.value===''? null : Number(e.target.value))} className="w-full rounded border px-3 py-2">
                    <option value="">(เมนูหลัก)</option>
                    {allItems.filter(it => !editing || !descendantsOfEditing.has(it._id) || it._id===editing._id).filter(it => !editing || it._id !== editing._id).map(it => (
                      <option key={it._id} value={it._id}>{it.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">ไฟล์ PDF (อัปโหลดได้หลายไฟล์)</label>
                <div className="flex flex-col md:flex-row gap-2">
                  <label className="btn btn-outline cursor-pointer whitespace-nowrap">
                    เลือกไฟล์
                    <input type="file" accept="application/pdf" multiple className="hidden" onChange={async e=>{
                      const files = Array.from(e.target.files || [])
                      if (!files.length) return
                      if (editing) {
                        for (const file of files) { await uploadPdfToItem(file) }
                        fetch(`/api/ita/${editing._id}/pdfs`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setPdfList(d) })
                      } else {
                        setPendingNewPdfs(prev => [...prev, ...files])
                      }
                    }} />
                  </label>
                </div>
                {!editing && pendingNewPdfs.length > 0 && (
                  <ul className="mt-2 text-xs space-y-1">
                    {pendingNewPdfs.map((f,i)=>(
                      <li key={i} className="flex items-center gap-2">
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-gray-400">{(f.size/1024).toFixed(1)} KB</span>
                        <button type="button" className="btn btn-outline" onClick={()=>setPendingNewPdfs(list=>list.filter((_,x)=>x!==i))}>ลบ</button>
                      </li>
                    ))}
                  </ul>
                )}
                {editing && (
                  <div className="mt-4 border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">ไฟล์ PDF ทั้งหมด ({pdfList.length})</span>
                      <label className="btn btn-outline cursor-pointer text-xs">
                        เพิ่มไฟล์
                        <input type="file" accept="application/pdf" multiple className="hidden" onChange={e=>{ const fs=Array.from(e.target.files||[]); fs.forEach(f=>uploadPdfToItem(f)) }} />
                      </label>
                    </div>
                    {pdfLoading ? <div className="text-xs text-gray-500">กำลังโหลด...</div> : (
                      pdfList.length === 0 ? <div className="text-xs text-gray-500">ยังไม่มีไฟล์</div> : (
                        <ul className="space-y-1 text-xs">
                          {pdfList.map(p => (
                            <li key={p.id} className="flex items-center gap-2">
                              <a href={p.url} target="_blank" className="text-blue-700 underline truncate flex-1" title={p.filename}>{p.filename}</a>
                              <span className="text-gray-400">{(p.size/1024).toFixed(1)} KB</span>
                              <button type="button" className="btn btn-outline" onClick={()=>deletePdfFile(p.id)}>ลบ</button>
                            </li>
                          ))}
                        </ul>
                      )
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">รายละเอียด (ถ้ามี)</label>
                <div className="rounded border">
                  <RichTextEditor value={form.content || ''} onChange={html=>setForm(f=>({ ...f, content: html }))} />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished ?? true} onChange={e=>setForm(f=>({ ...f, isPublished: e.target.checked }))} /> เผยแพร่</label>
              <div>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md" type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    editing ? 'บันทึกการแก้ไข' : 'เพิ่มเมนู'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {busy && <div className="fixed inset-0 bg-black/10 pointer-events-none animate-fade-in" aria-hidden />}
    </div>
  )
})