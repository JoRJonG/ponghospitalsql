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
                src={!imagePreview.startsWith('blob:') ? `${imagePreview}${imagePreview.includes('?') ? '&' : '?'}w=200` : imagePreview}
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

    // Create orderMap: { id: newDisplayOrder }
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">👔</span>
            จัดการผู้บริหาร
          </h2>
          <p className="text-sm text-gray-500 mt-1 ml-11">ลากเพื่อเรียงลำดับการแสดงผล</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null) }}
          className="admin-btn bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-md border-0"
        >
          <span>➕</span>
          เพิ่มผู้บริหาร
        </button>
      </div>

      {/* Modal is now controlled by showForm state */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingId(null) }}
        title={editingId ? 'แก้ไขผู้บริหาร' : 'เพิ่มผู้บริหาร'}
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
              title: editingId ? 'แก้ไขผู้บริหารสำเร็จ' : 'เพิ่มผู้บริหารสำเร็จ',
              icon: 'success',
              confirmButtonText: 'ตกลง',
              confirmButtonColor: '#10b981'
            })
          }}
        />
      </Modal>

      {executives.length === 0 ? (
        <div className="card-glass border-dashed border-2 border-gray-300 p-12 text-center">
          <div className="text-gray-300 text-6xl mb-4">📇</div>
          <p className="text-lg text-gray-500 font-medium">ยังไม่มีข้อมูลผู้บริหาร</p>
          <p className="text-sm text-gray-400 mt-2">คลิก "เพิ่มผู้บริหาร" เพื่อเริ่มต้น</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {executives.map((exec, index) => (
          <div
            key={exec._id}
            draggable
            onDragStart={(e) => handleDragStart(e, exec._id!)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, exec._id!)}
            className={`group bg-white rounded-lg border border-gray-200 overflow-hidden cursor-move transition-all duration-200 relative
                ${draggingId === exec._id ? 'opacity-40 scale-95 ring-2 ring-green-400' : 'hover:shadow-md hover:border-green-300 hover:translate-x-1'}
              `}
          >
            {/* Left Accent Border */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-green-500 to-green-600 transition-all group-hover:w-2"></div>

            <div className="p-4 pl-6 flex items-center gap-4 sm:gap-6">

              {/* Drag Handle & Index */}
              <div className="flex flex-col items-center justify-center w-8 shrink-0 text-gray-400 group-hover:text-green-600">
                <div className="text-xs font-bold bg-gray-100 w-6 h-6 rounded flex items-center justify-center mb-1">
                  {index + 1}
                </div>
                <span className="text-lg opacity-0 group-hover:opacity-100 transition-opacity">⋮⋮</span>
              </div>

              {/* Avatar */}
              <div className="relative shrink-0">
                {exec.imageUrl ? (
                  <img
                    src={`${exec.imageUrl}${exec.imageUrl?.includes('?') ? '&' : '?'}w=128`}
                    alt={exec.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shadow-sm group-hover:border-green-200"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl border-2 border-gray-50 text-gray-400">
                    👤
                  </div>
                )}
                {/* Status Indicator Dot */}
                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${exec.isPublished ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 py-1">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                  <h3 className="font-bold text-lg text-gray-800 truncate group-hover:text-green-700 transition-colors">
                    {exec.name}
                  </h3>
                </div>
                <p className="text-gray-500 text-sm truncate font-medium">{exec.position}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <div className="hidden sm:flex flex-col items-end mr-4">
                  {exec.isPublished ? (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      เผยแพร่
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                      ซ่อน
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { setEditingId(exec._id!); setShowForm(true) }}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="แก้ไข"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(exec._id!)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="ลบ"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export default ExecutivesManagement
