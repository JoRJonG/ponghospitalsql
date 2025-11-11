import React, { useState } from 'react'
import RichTextEditor from '../../components/RichTextEditor'
import { useAuth } from '../../auth/AuthContext'
import { compressImage } from '../../utils/imageCompressor'
import { buildApiUrl } from '../../utils/api'
import { invalidateCache } from '../../utils/fastFetch'
import { quillModules, quillFormats, toDateTimeLocalValue, fromDateTimeLocalValue } from './helpers'

const MAX_UPLOAD_IMAGES = 80

type Activity = {
  _id?: string
  title: string
  description?: string
  images?: Array<string | { url: string }>
  isPublished?: boolean
  publishedAt?: string | null
}

export default function ActivityForm({ onCreated, onCancel }: { onCreated: () => void; onCancel?: () => void }) {
  const { getToken, refreshToken, logout } = useAuth()
  const [form, setForm] = useState<Activity>({ title: '', description: '', images: [], isPublished: true, publishedAt: null })
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const addImage = () => {
    const url = imageUrl.trim()
    if (!url) return
    const currentCount = form.images?.length ?? 0
    if (currentCount >= MAX_UPLOAD_IMAGES) {
      alert(`สามารถเพิ่มรูปภาพได้สูงสุด ${MAX_UPLOAD_IMAGES} รูปต่อกิจกรรม`)
      return
    }
    setForm(f => ({ ...f, images: [...(f.images || []), url] }))
    setImageUrl('')
  }

  const onUploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files || [])
    if (!arr.length) return
    const currentCount = form.images?.length ?? 0
    if (currentCount >= MAX_UPLOAD_IMAGES) {
      alert(`สามารถอัปโหลดได้สูงสุด ${MAX_UPLOAD_IMAGES} รูปต่อกิจกรรม`)
      return
    }
    const availableSlots = MAX_UPLOAD_IMAGES - currentCount
    const filesToProcess = arr.slice(0, availableSlots)
    if (filesToProcess.length < arr.length) {
      alert(`เพิ่มรูปได้อีก ${availableSlots} รูปเท่านั้น (สูงสุด ${MAX_UPLOAD_IMAGES} รูปต่อกิจกรรม)`) 
    }
    setUploading(true)
    try {
      const compressedFiles: File[] = []
      for (const file of filesToProcess) {
        try {
          const compressed = await compressImage(file, 1200, 0.8)
          compressedFiles.push(compressed)
          const url = URL.createObjectURL(compressed)
          setForm(f => ({ ...f, images: [...(f.images || []), url] }))
        } catch (err) {
          console.error('Failed to compress image:', err)
          alert(`ไม่สามารถประมวลผลรูป ${file.name} ได้`)
        }
      }
      if (compressedFiles.length) {
        setPendingFiles(prev => [...prev, ...compressedFiles])
      }
    } catch (error) {
      console.error('Unexpected image processing error', error)
      alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ')
    } finally { setUploading(false) }
  }

  const removeImageAt = async (idx: number) => {
    const currentImages = form.images ?? []
    const target = currentImages[idx]
    if (!target) return
    const nextImages = currentImages.filter((_, i) => i !== idx)
    setForm(f => ({ ...f, images: nextImages }))
    if (typeof target === 'string' && target.startsWith('blob:')) {
      const blobIndex = currentImages
        .slice(0, idx)
        .filter(image => typeof image === 'string' && image.startsWith('blob:'))
        .length
      setPendingFiles(prev => {
        if (blobIndex < 0 || blobIndex >= prev.length) return prev
        const next = [...prev]
        next.splice(blobIndex, 1)
        return next
      })
      URL.revokeObjectURL(target)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim()) { alert('กรุณากรอกชื่อกิจกรรม'); return }
    const totalImages = form.images?.length ?? 0
    if (totalImages > MAX_UPLOAD_IMAGES) { alert(`สามารถอัปโหลดได้สูงสุด ${MAX_UPLOAD_IMAGES} รูปต่อกิจกรรม`); return }
    setLoading(true)
    try {
      const endpoint = buildApiUrl('/api/activities', { preferBackend: true })
      const makeRequest = async (token: string) => {
        const fd = new FormData()
        fd.append('title', form.title || '')
        fd.append('description', form.description || '')
        fd.append('isPublished', String(form.isPublished ?? true))
        if (form.publishedAt) fd.append('publishedAt', form.publishedAt)
        for (const f of pendingFiles) fd.append('images', f)
        
        return await fetch(endpoint, { 
          method: 'POST', 
          headers: { 'Authorization': `Bearer ${token}` }, 
          body: fd 
        })
      }

      let token = getToken()
      if (!token) {
        alert('กรุณาเข้าสู่ระบบใหม่')
        logout()
        return
      }

      let r = await makeRequest(token)
      
      // If token expired, try to refresh and retry once
      if (r.status === 401) {
        try {
          const errorData = await r.clone().json()
          if (errorData.code === 'TOKEN_EXPIRED') {
            const refreshSuccess = await refreshToken()
            if (refreshSuccess) {
              token = getToken()
              if (token) {
                r = await makeRequest(token)
              } else {
                alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
                logout()
                return
              }
            } else {
              alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
              logout()
              return
            }
          }
        } catch (error) {
          console.error('Failed to parse activity creation error response', error)
        }
      }
      
      if (!r.ok) { 
        const errorText = await r.text().catch(() => 'บันทึกกิจกรรมไม่สำเร็จ')
        alert(errorText || 'บันทึกกิจกรรมไม่สำเร็จ')
        return 
      }
      
    invalidateCache('/api/activities')
  setForm({ title: '', description: '', images: [], isPublished: true, publishedAt: null })
      setPendingFiles([])
      onCreated()
    } catch (err) {
      console.error('Failed to submit activity', err)
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง')
    } finally { setLoading(false) }
  }

  const handleCancel = () => {
    setForm(prev => {
      ;(prev.images || []).forEach(img => {
        if (typeof img === 'string' && img.startsWith('blob:')) {
          URL.revokeObjectURL(img)
        }
      })
      return { title: '', description: '', images: [], isPublished: true, publishedAt: null }
    })
    setPendingFiles([])
    setImageUrl('')
    onCancel?.()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">ชื่อกิจกรรม</label>
        <input value={form.title || ''} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} className="w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">รายละเอียด</label>
        <div className="rounded border">
          <RichTextEditor value={form.description || ''} onChange={(html)=>setForm(f=>({ ...f, description: html }))} modules={quillModules} formats={quillFormats} />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">รูปภาพ</label>
        <div className="flex flex-wrap gap-2">
          <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="flex-1 rounded border px-3 py-2" placeholder="วางลิงก์รูป..." />
          <button type="button" onClick={addImage} className="admin-btn admin-btn--outline">เพิ่มจากลิงก์</button>
          <label className="admin-btn admin-btn--outline cursor-pointer">อัปโหลดไฟล์<input type="file" className="hidden" accept="image/*" multiple onChange={e=>{ const fs=e.target.files; if (fs && fs.length) onUploadFiles(fs) }} /></label>
          {uploading && <span className="text-sm text-gray-600 self-center">กำลังอัปโหลด...</span>}
        </div>
        {form.images && form.images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {form.images.map((img, i) => {
              const src = typeof img === 'string' ? img : img.url
              return (
                <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                  <img src={src} loading="lazy" decoding="async" width={320} height={240} className="absolute inset-0 h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImageAt(i)} className="absolute top-2 right-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded">ลบ</button>
                </div>
              )
            })}
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
