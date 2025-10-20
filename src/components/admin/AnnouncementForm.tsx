import React, { useState } from 'react'
import RichTextEditor from '../../components/RichTextEditor'
import { useAuth } from '../../auth/AuthContext'
import { compressImage } from '../../utils/imageCompressor'
import { quillModules, quillFormats, toDateTimeLocalValue, fromDateTimeLocalValue } from './helpers'

type Announcement = {
  _id?: string
  title: string
  category: 'สมัครงาน' | 'ประชาสัมพันธ์' | 'ประกาศ'
  content?: string
  isPublished?: boolean
  publishedAt?: string | null
  attachments?: Array<{ url: string; publicId?: string; kind?: 'image'|'pdf'|'file'; name?: string; bytes?: number }>
}

export default function AnnouncementForm({ onCreated }: { onCreated: () => void }) {
  const { getToken } = useAuth()
  const [form, setForm] = useState<Announcement>({ title: '', category: 'ประชาสัมพันธ์', content: '', isPublished: true, attachments: [], publishedAt: null })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const onUploadImage = async (file: File) => {
    setUploading(true)
    try {
      const compressed = await compressImage(file, 1200, 0.7)
      const fd = new FormData(); fd.append('file', compressed)
      const r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
      if (!r.ok) throw new Error('upload failed')
      const data = await r.json() as { url: string; publicId?: string; name?: string; bytes?: number }
      setForm(f => ({ ...f, attachments: [...(f.attachments||[]), { url: data.url, publicId: data.publicId, kind: 'image', name: data.name, bytes: data.bytes }] }))
    } catch (err) {
      console.error('Upload image error:', err)
      alert('อัปโหลดรูปไม่สำเร็จ')
    } finally { setUploading(false) }
  }

  const onUploadFile = async (file: File) => {
    const fd = new FormData(); fd.append('file', file); setUploading(true)
    try {
      const r = await fetch('/api/uploads/file', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
      if (!r.ok) throw new Error('upload failed')
      const data = await r.json() as { url: string; publicId?: string; name?: string; bytes?: number }
      const kind = (data.name || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'file'
      setForm(f => ({ ...f, attachments: [...(f.attachments||[]), { url: data.url, publicId: data.publicId, kind, name: data.name, bytes: data.bytes }] }))
    } catch { alert('อัปโหลดไฟล์ไม่สำเร็จ') } finally { setUploading(false) }
  }

  const removeAttachmentAt = async (idx: number) => {
    const it = (form.attachments || [])[idx] as any
    const next = [...(form.attachments||[])]
    next.splice(idx, 1)
    setForm(f => ({ ...f, attachments: next }))
    if (it && it.publicId) {
      fetch(`/api/uploads/image/${encodeURIComponent(it.publicId)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }).catch(()=>{})
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = { ...form }
      if (!form.publishedAt) delete payload.publishedAt
      const r = await fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(payload) })
      if (!r.ok) {
        let msg = 'บันทึกประกาศไม่สำเร็จ'
        try { const j = await r.json(); if (j?.details) msg += `: ${j.details}` } catch {}
        alert(msg)
        return
      }
      setForm({ title: '', category: form.category, content: '', isPublished: true, attachments: [], publishedAt: null })
      onCreated()
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">หัวข้อ</label>
        <input value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} className="w-full rounded border px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm mb-1">หมวดหมู่</label>
        <select value={form.category} onChange={e=>setForm(f=>({ ...f, category: e.target.value as Announcement['category'] }))} className="w-full rounded border px-3 py-2">
          <option>สมัครงาน</option>
          <option>ประชาสัมพันธ์</option>
          <option>ประกาศ</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">เนื้อหา</label>
        <div className="rounded border">
          <RichTextEditor
            value={form.content || ''}
            onChange={(html)=>setForm(f=>({ ...f, content: html }))}
            modules={quillModules}
            formats={quillFormats}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">ไฟล์แนบ (รูป/เอกสาร)</label>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-outline cursor-pointer">
            อัปโหลดรูป
            <input type="file" className="hidden" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if (f) onUploadImage(f) }} />
          </label>
          <label className="btn btn-outline cursor-pointer">
            อัปโหลดไฟล์ (PDF/อื่นๆ)
            <input type="file" className="hidden" accept="application/pdf,application/*" onChange={e=>{ const f=e.target.files?.[0]; if (f) onUploadFile(f) }} />
          </label>
          {uploading && <span className="self-center text-sm text-gray-600">กำลังอัปโหลด...</span>}
        </div>
        {form.attachments && form.attachments.length > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {form.attachments.map((att, i) => (
              <div key={i} className="border rounded p-2 flex items-center gap-3">
                {att.kind === 'image' ? (
                  <img src={att.url} loading="lazy" decoding="async" width={96} height={64} className="h-16 w-24 object-cover rounded" />
                ) : (
                  <i className="fa-regular fa-file-pdf text-red-600 text-2xl" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm">{att.name || att.url}</div>
                  <a href={att.url} target="_blank" className="text-blue-700 text-xs hover:underline">เปิดดู</a>
                </div>
                <button type="button" className="btn btn-outline" onClick={()=>removeAttachmentAt(i)}>ลบ</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished ?? true} onChange={e=>setForm(f=>({ ...f, isPublished: e.target.checked }))} /> เผยแพร่</label>
        <div>
          <label className="block text-sm mb-1">ตั้งเวลาเผยแพร่</label>
          <input type="datetime-local" value={toDateTimeLocalValue(form.publishedAt || undefined)} onChange={e=>setForm(f=>({ ...f, publishedAt: fromDateTimeLocalValue(e.target.value) || null }))} className="w-full rounded border px-3 py-2" />
          <p className="mt-1 text-xs text-gray-600">ถ้ากำหนดเป็นอนาคต ระบบจะเผยแพร่เมื่อถึงเวลานั้น</p>
        </div>
      </div>
      <div>
        <button disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              กำลังบันทึก...
            </>
          ) : (
            'บันทึก'
          )}
        </button>
      </div>
    </form>
  )
}
