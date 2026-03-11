import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../auth/AuthContext'
import Modal from './admin/Modal'

import { compressImage } from '../utils/imageCompressor'

type Executive = {
  _id?: string
  name: string
  position: string
  phone?: string
  imageUrl?: string | null
  displayOrder?: number
  isPublished?: boolean
  createdAt?: string
  updatedAt?: string
}

function ExecutiveForm({ initialId, onClose, onSaved }: { initialId?: string | null; onClose: () => void; onSaved: () => void }) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ name: '', position: '', phone: '', isPublished: true })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [updatedAt, setUpdatedAt] = useState<string>('')

  useEffect(() => {
    if (!initialId) return

    const controller = new AbortController()
    fetch(`/api/executives/${initialId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        setForm({
          name: data.name || '',
          position: data.position || '',
          phone: data.phone || '',
          isPublished: data.isPublished === true || data.isPublished === 1 || data.isPublished === 'true',
        })
        if (data.imageUrl) setImagePreview(data.imageUrl)
        if (data.updatedAt) setUpdatedAt(data.updatedAt)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('[Executives] load detail failed', error)
      })

    return () => controller.abort()
  }, [initialId, getToken])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Compress image
      const compressed = await compressImage(file, 400, 0.85)
      setImageFile(compressed)

      // Create preview
      const url = URL.createObjectURL(compressed)
      setImagePreview(url)
    } catch (error: unknown) {
      console.error('[Executives] compress image failed', error)
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถประมวลผลรูปภาพได้', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim() || !form.position.trim()) {
      Swal.fire('แจ้งเตือน', 'กรุณากรอกชื่อและตำแหน่ง', 'warning')
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('position', form.position)
      fd.append('phone', form.phone)
      fd.append('isPublished', String(form.isPublished))

      if (imageFile) {
        fd.append('image', imageFile)
      }

      const url = initialId ? `/api/executives/${initialId}` : '/api/executives'
      const method = initialId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: fd
      })

      if (res.ok) {
        onSaved()
      } else {
        const err = await res.json().catch(() => ({}))
        Swal.fire({
          title: 'ข้อผิดพลาด',
          text: 'บันทึกไม่สำเร็จ: ' + (err.details || err.error || 'Unknown error'),
          icon: 'error',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#d33'
        })
      }
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : 'Unknown'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">ชื่อ-นามสกุล *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">ตำแหน่ง *</label>
          <input
            type="text"
            value={form.position}
            onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
            className="w-full rounded border px-3 py-2"
            placeholder="เช่น ผู้อำนวยการโรงพยาบาล"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">เบอร์โทรศัพท์</label>
          <input
            type="text"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full rounded border px-3 py-2"
            placeholder="เช่น 054-123456"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">รูปภาพ</label>
          <div className="flex gap-2">
            <label className="admin-btn admin-btn--outline cursor-pointer">
              {uploading ? 'กำลังประมวลผล...' : 'เลือกไฟล์'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            ขนาดแนะนำ: 400x400px รูปสี่เหลี่ยมจัตุรัส สำหรับแสดงเป็นวงกลม
          </p>

          {imagePreview ? (
            <div className="mt-3">
              <img
                src={!imagePreview.startsWith('blob:') ? `${imagePreview}${imagePreview.includes('?') ? '&' : '?'}w=200&v=${new Date(updatedAt || Date.now()).getTime()}` : imagePreview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-2"
              />
            </div>
          ) : null}
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
              className="w-4 h-4"
            />
            <span className="text-sm">เผยแพร่ (แสดงในหน้าเว็บไซต์)</span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex gap-2 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="admin-btn admin-btn--outline">
          ยกเลิก
        </button>
        <button type="submit" disabled={loading || uploading} className="admin-btn">
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

export type ExecutivesManagementHandle = {
  refreshExecutives: () => Promise<void>
}

const ExecutivesManagement = forwardRef<ExecutivesManagementHandle>(function ExecutivesManagement(_props, ref) {
  const { getToken } = useAuth()
  const [executives, setExecutives] = useState<Executive[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)


  const refreshExecutives = useCallback(async () => {
    try {
      const token = getToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/executives?published=false', { headers })
      if (res.ok) {
        const data = await res.json()
        setExecutives(data)
      }
    } catch (error: unknown) {
      console.error('Failed to fetch executives:', error)
    }
  }, [getToken])

  useImperativeHandle(ref, () => ({
    refreshExecutives
  }))

  useEffect(() => {
    refreshExecutives()
  }, [refreshExecutives])

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    // Optimistic update
    const newList = [...executives]
    const [moved] = newList.splice(fromIndex, 1)
    newList.splice(toIndex, 0, moved)
    setExecutives(newList)

    // Create orderMap: {id: newDisplayOrder }
    const orderMap: Record<string, number> = {}
    newList.forEach((exec, index) => {
      if (exec._id) {
        orderMap[exec._id] = index
      }
    })

    // Send to backend
    try {
      const token = getToken()
      const res = await fetch('/api/executives/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderMap })
      })

      if (!res.ok) throw new Error('Reorder failed')
      await refreshExecutives() // Refresh to get accurate data
    } catch (error: unknown) {
      console.error('Failed to reorder:', error)
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเรียงลำดับใหม่ได้', 'error')
      await refreshExecutives() // Revert
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === dropId) return

    const fromIndex = executives.findIndex(ex => ex._id === draggingId)
    const toIndex = executives.findIndex(ex => ex._id === dropId)

    if (fromIndex >= 0 && toIndex >= 0) {
      handleReorder(fromIndex, toIndex)
    }

    setDraggingId(null)
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ต้องการลบผู้บริหารท่านนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    })
    if (!result.isConfirmed) return

    try {
      const token = getToken()
      const res = await fetch(`/api/executives/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        await refreshExecutives()
        Swal.fire({
          title: 'สำเร็จ',
          text: 'ลบผู้บริหารสำเร็จ',
          icon: 'success',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#10b981'
        })
      } else {
        Swal.fire({ title: 'ข้อผิดพลาด', text: 'ลบผู้บริหารไม่สำเร็จ', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
      }
    } catch (error: unknown) {
      console.error('Failed to delete executive:', error)
      Swal.fire({ title: 'ข้อผิดพลาด', text: 'เกิดข้อผิดพลาด', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-sm">👔</span>
            จัดการผู้บริหาร
          </h2>
          <p className="text-sm text-gray-500 mt-1">ลากเพื่อเรียงลำดับการแสดงผลหน้าเว็บไซต์ (แบบเต็มความกว้าง)</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null) }}
          className="admin-btn bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg shadow-emerald-200/50 border-0 py-2.5 px-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-lg">➕</span>
          <span>เพิ่มผู้บริหาร</span>
        </button>
      </div>

      {/* Modal is now controlled by showForm state */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingId(null) }}
        title={editingId ? 'แก้ไขข้อมูลผู้บริหาร' : 'เพิ่มผู้บริหารใหม่'}
        maxWidth="max-w-2xl"
      >
        <ExecutiveForm
          initialId={editingId}
          onClose={() => { setShowForm(false); setEditingId(null) }}
          onSaved={() => {
            setShowForm(false)
            setEditingId(null)
            refreshExecutives()
            Swal.fire({
              title: editingId ? 'อัปเดตข้อมูลสำเร็จ' : 'เพิ่มผู้บริหารสำเร็จ',
              icon: 'success',
              confirmButtonText: 'ตกลง',
              confirmButtonColor: '#10b981',
              customClass: {
                popup: 'rounded-2xl border-0 shadow-2xl'
              }
            })
          }}
        />
      </Modal>

      {executives.length === 0 ? (
        <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center">
          <div className="text-gray-200 text-7xl mb-6 animate-pulse">📇</div>
          <p className="text-xl text-gray-500 font-semibold">ไม่พบข้อมูลผู้บริหารในระบบ</p>
          <p className="text-gray-400 mt-2">เริ่มต้นโดยการคลิกปุ่ม "เพิ่มผู้บริหาร" ที่มุมขวาบน</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {executives.map((exec, index) => (
          <div
            key={exec._id}
            draggable
            onDragStart={(e) => handleDragStart(e, exec._id!)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, exec._id!)}
            className={`group bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-move transition-all duration-300 relative
                ${draggingId === exec._id ? 'opacity-30 scale-[0.98] ring-4 ring-emerald-400 shadow-2xl z-20' : 'hover:shadow-xl hover:shadow-gray-200/50 hover:border-emerald-200 hover:-translate-y-1'}
              `}
          >
            {/* Left Accent Gradient */}
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-emerald-500 via-teal-500 to-emerald-600 opacity-80 group-hover:opacity-100 transition-all group-hover:w-3"></div>

            <div className="p-4 pl-8 flex items-center gap-4 sm:gap-8">
              {/* Index & Drag Handle */}
              <div className="flex flex-col items-center justify-center w-10 shrink-0 text-gray-400 group-hover:text-emerald-600 transition-colors">
                <div className="text-xs font-bold bg-gray-100 group-hover:bg-emerald-100 w-8 h-8 rounded-lg flex items-center justify-center mb-1 group-hover:text-emerald-700 transition-all">
                  #{index + 1}
                </div>
                <span className="text-xl opacity-0 group-hover:opacity-100 transition-opacity">⋮⋮</span>
              </div>

              {/* Avatar with Glow */}
              <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-500">
                <div className={`absolute inset-[-4px] rounded-full opacity-20 group-hover:opacity-40 transition-opacity blur-[2px] ${exec.isPublished ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                {exec.imageUrl ? (
                  <img
                    src={`${exec.imageUrl}${exec.imageUrl?.includes('?') ? '&' : '?'}w=150&v=${new Date(exec.updatedAt || Date.now()).getTime()}`}
                    alt={exec.name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md relative z-10"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-2xl border-4 border-white shadow-md relative z-10 text-gray-300 font-bold">
                    👤
                  </div>
                )}
                {/* Modern Status Badge */}
                <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-white z-20 shadow-sm ${exec.isPublished ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 py-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-1">
                  <h3 className="font-bold text-xl text-gray-800 truncate group-hover:text-emerald-800 transition-colors">
                    {exec.name}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500">
                  <p className="text-sm font-semibold text-emerald-600/70 border-r border-gray-200 pr-4">{exec.position}</p>
                  {exec.phone && (
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="text-emerald-500/60">📞</span>
                      <span>{exec.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Premium Actions */}
              <div className="flex items-center gap-3 shrink-0 pr-2">
                <button
                  onClick={() => { setEditingId(exec._id!); setShowForm(true) }}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-blue-200 relative group/btn overflow-hidden"
                  title="แก้ไขข้อมูล"
                >
                  <span className="text-lg relative z-10">✏️</span>
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-500 opacity-0 group-hover/btn:opacity-0 transition-opacity"></div>
                </button>
                <button
                  onClick={() => handleDelete(exec._id!)}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm hover:shadow-red-200 relative group/btn overflow-hidden"
                  title="ลบ"
                >
                  <span className="text-lg relative z-10">🗑️</span>
                </button>
              </div>
            </div>

            {/* Hover Interaction Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/[0.02] pointer-events-none group-hover:to-emerald-500/[0.05] transition-all duration-700"></div>
          </div>
        ))}
      </div>
    </div>
  )
})

export default ExecutivesManagement
