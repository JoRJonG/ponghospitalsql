import React, { useState } from 'react'
import RichTextEditor from '../../components/RichTextEditor'
import { useAuth } from '../../auth/AuthContext'
import { compressImage } from '../../utils/imageCompressor'
import { sanitizeText, sanitizeHtml } from '../../utils/sanitize'
import { quillModules, quillFormats, toDateTimeLocalValue, fromDateTimeLocalValue } from './helpers'

type Announcement = {
  _id?: string
  title: string
  category: 'สมัครงาน' | 'ประชาสัมพันธ์' | 'ประกาศ' | 'ประกาศจัดซื้อจัดจ้าง'
  content?: string
  isPublished?: boolean
  publishedAt?: string | null
  attachments?: Array<{ url: string; publicId?: string; kind?: 'image' | 'pdf' | 'file'; name?: string; bytes?: number }>
}

type AnnouncementAttachment = NonNullable<Announcement['attachments']>[number]

const hasDuplicateAttachment = (attachments: AnnouncementAttachment[] | undefined, name?: string | null, bytes?: number | null) => {
  if (!attachments || !name) return false
  return attachments.some(att => {
    if (!att?.name || att.name !== name) return false
    if (typeof bytes === 'number' && typeof att.bytes === 'number') {
      return att.bytes === bytes
    }
    return false
  })
}

export default function AnnouncementForm({ onCreated, onCancel }: { onCreated: () => void; onCancel?: () => void }) {
  const { getToken } = useAuth()
  const [form, setForm] = useState<Announcement>({ title: '', category: 'ประชาสัมพันธ์', content: '', isPublished: true, attachments: [], publishedAt: null })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])

  const onUploadImage = async (file: File) => {
    // Stage image locally (no immediate upload) to avoid embedding large base64 in JSON
    if (hasDuplicateAttachment(form.attachments, file.name, file.size)) {
      alert('ไฟล์นี้ถูกเพิ่มไว้แล้ว (ชื่อและขนาดตรงกัน)')
      return
    }
    setUploading(true)
    try {
      const compressed = await compressImage(file, 1200, 0.7)
      const stagedFile = new File([compressed], file.name, { type: compressed.type })
      const objectUrl = URL.createObjectURL(stagedFile)
      setStagedFiles(prev => [...prev, stagedFile])
      setForm(current => ({
        ...current,
        attachments: [...(current.attachments || []), { url: objectUrl, name: stagedFile.name, bytes: stagedFile.size, kind: 'image' }]
      }))
    } catch (err) {
      console.error('Stage image error:', err)
      alert('เตรียมรูปไม่สำเร็จ')
    } finally { setUploading(false) }
  }

  const onUploadFile = async (file: File) => {
    // Stage file locally (no immediate upload) to avoid embedding large base64 in JSON
    if (hasDuplicateAttachment(form.attachments, file.name, file.size)) {
      alert('ไฟล์นี้ถูกเพิ่มไว้แล้ว (ชื่อและขนาดตรงกัน)')
      return
    }
    if (file.size > 300 * 1024 * 1024) {
      alert('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 300 MB)')
      return
    }
    setUploading(true)
    try {
      // No compression for PDFs/other files; just stage
      const objectUrl = URL.createObjectURL(file)
      setStagedFiles(prev => [...prev, file])
      const kind = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file'
      setForm(current => ({ ...current, attachments: [...(current.attachments || []), { url: objectUrl, name: file.name, bytes: file.size, kind }] }))
    } catch (err) {
      console.error('Stage file error:', err)
      alert('เตรียมไฟล์ไม่สำเร็จ')
    } finally { setUploading(false) }
  }

  const removeAttachmentAt = async (idx: number) => {
    const attachments: AnnouncementAttachment[] = form.attachments ? [...form.attachments] : []
    const target = attachments[idx]
    attachments.splice(idx, 1)
    setForm((prev: Announcement) => ({ ...prev, attachments }))
    // If this was a staged file (object URL), also remove from stagedFiles
    if (target?.url && target.url.startsWith('blob:')) {
      setStagedFiles(prev => {
        return prev.filter(f => f.name !== target.name || f.size !== target.bytes)
      })
    }
    if (target?.publicId) {
      fetch(`/api/uploads/image/${encodeURIComponent(target.publicId)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }).catch(err => {
        console.warn('ไม่สามารถลบไฟล์จากเซิร์ฟเวอร์ได้', err)
      })
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Create announcement WITHOUT files first (avoid large payload)
      const payload: Announcement = {
        title: sanitizeText(String(form.title || '')),
        category: sanitizeText(String(form.category)) as Announcement['category'],
        content: sanitizeHtml(form.content || ''),
        isPublished: typeof form.isPublished === 'boolean' ? form.isPublished : true,
        publishedAt: form.publishedAt ?? null,
        attachments: [] // will attach files separately
      }

      const r = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload)
      })

      if (!r.ok) {
        let msg = 'บันทึกประกาศไม่สำเร็จ'
        try {
          const text = await r.text()
          if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
            msg += ' (Web server ส่งกลับ HTML แทน JSON)'
          } else {
            const j = JSON.parse(text)
            if (j?.details) msg += `: ${j.details}`
          }
        } catch (parseErr) {
          console.warn('อ่านรายละเอียดข้อผิดพลาดไม่สำเร็จ', parseErr)
        }
        alert(msg)
        return
      }

      const created = await r.json()
      const announcementId = created.id || created._id

      // Upload each staged file individually to avoid large payload
      if (stagedFiles.length > 0 && announcementId) {
        for (let i = 0; i < stagedFiles.length; i++) {
          const file = stagedFiles[i]
          const fd = new FormData()
          fd.append('file', file)

          const uploadR = await fetch(`/api/announcements/${announcementId}/attachment`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: fd
          })

          if (!uploadR.ok) {
            const errText = await uploadR.text().catch(() => 'Unknown error')
            console.warn(`ไม่สามารถอัปโหลดไฟล์ ${file.name}:`, errText)
            alert(`⚠️ ประกาศสร้างสำเร็จแล้ว แต่อัปโหลดไฟล์ "${file.name}" ไม่สำเร็จ\n\nกรุณาลองแก้ไขประกาศและเพิ่มไฟล์ใหม่`)
            break
          }
        }
      }

      setForm({ title: '', category: form.category, content: '', isPublished: true, attachments: [], publishedAt: null })
      setStagedFiles([])
      onCreated()
    } catch (err) {
      console.error('Submit error:', err)
      alert('เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setForm((prev: Announcement) => ({ title: '', category: prev.category, content: '', isPublished: true, attachments: [], publishedAt: null }))
    onCancel?.()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">หัวข้อ</label>
        <input value={form.title} onChange={e => setForm((prev: Announcement) => ({ ...prev, title: e.target.value }))} className="w-full rounded border px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm mb-1">หมวดหมู่</label>
        <select value={form.category} onChange={e => setForm((prev: Announcement) => ({ ...prev, category: e.target.value as Announcement['category'] }))} className="w-full rounded border px-3 py-2">
          <option>สมัครงาน</option>
          <option>ประชาสัมพันธ์</option>
          <option>ประกาศ</option>
          <option>ประกาศจัดซื้อจัดจ้าง</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">เนื้อหา</label>
        <div className="rounded border">
          <RichTextEditor
            className="[&_.ql-container]:!h-auto [&_.ql-editor]:!min-h-[120px] [&_.ql-editor]:!max-h-[250px] [&_.ql-editor]:!overflow-y-auto"
            value={form.content || ''}
            onChange={html => setForm((prev: Announcement) => ({ ...prev, content: html }))}
            modules={quillModules}
            formats={quillFormats}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">ไฟล์แนบ (รูป/เอกสาร)</label>
        <div className="flex flex-wrap gap-2">
          <label className="admin-btn admin-btn--outline cursor-pointer">
            อัปโหลดรูป
            <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUploadImage(f) }} />
          </label>
          <label className="admin-btn admin-btn--outline cursor-pointer">
            อัปโหลดไฟล์ (PDF/อื่นๆ)
            <input type="file" className="hidden" accept="application/pdf,application/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUploadFile(f) }} />
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
                <button type="button" className="admin-btn admin-btn--outline admin-btn--sm" onClick={() => removeAttachmentAt(i)}>ลบ</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished ?? true} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} /> เผยแพร่</label>
        <div>
          <label className="block text-sm mb-1">ตั้งเวลาเผยแพร่</label>
          <input type="datetime-local" value={toDateTimeLocalValue(form.publishedAt || undefined)} onChange={e => setForm(f => ({ ...f, publishedAt: fromDateTimeLocalValue(e.target.value) || null }))} className="w-full rounded border px-3 py-2" />
          <p className="mt-1 text-xs text-gray-600">ถ้ากำหนดเป็นอนาคต ระบบจะเผยแพร่เมื่อถึงเวลานั้น</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={loading} className="admin-btn">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              กำลังบันทึก...
            </>
          ) : (
            'บันทึก'
          )}
        </button>
        {onCancel && (
          <button type="button" onClick={handleCancel} className="admin-btn admin-btn--outline">
            ยกเลิก
          </button>
        )}
      </div>
    </form>
  )
}
