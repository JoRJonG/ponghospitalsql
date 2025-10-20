import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { compressImage } from '../utils/imageCompressor'

type Executive = {
  _id?: string
  name: string
  position: string
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
  const [form, setForm] = useState({ name: '', position: '', isPublished: true })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  
  useEffect(() => {
    if (initialId) {
      // Fetch existing data
      fetch(`/api/executives/${initialId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
        .then(r => r.json())
        .then(data => {
          setForm({
            name: data.name || '',
            position: data.position || '',
            isPublished: data.isPublished ?? true
          })
          if (data.imageUrl) setImagePreview(data.imageUrl)
        })
        .catch(console.error)
    }
  }, [initialId])
  
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
    } catch (err) {
      alert('ไม่สามารถประมวลผลรูปภาพได้')
    } finally {
      setUploading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.name.trim() || !form.position.trim()) {
      alert('กรุณากรอกชื่อและตำแหน่ง')
      return
    }
    
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('position', form.position)
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
        alert('บันทึกไม่สำเร็จ: ' + (err.details || err.error || 'Unknown error'))
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : 'Unknown'))
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full">
        <div className="card-header">
          {initialId ? 'แก้ไขผู้บริหาร' : 'เพิ่มผู้บริหาร'}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-body space-y-4">
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
              <label className="block text-sm mb-1">รูปภาพ</label>
              <div className="flex gap-2">
                <label className="btn btn-outline cursor-pointer">
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
              
              {imagePreview && (
                <div className="mt-3">
                  <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2" />
                </div>
              )}
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
          
          <div className="card-footer flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn btn-outline">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading || uploading} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
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
      </div>
    </div>
  )
}

export default forwardRef(function ExecutivesManagement(_props, ref) {
  const { getToken } = useAuth()
  const [executives, setExecutives] = useState<Executive[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  
  const { showToast } = useToast()
  
  const refreshExecutives = async () => {
    try {
      const token = getToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      const res = await fetch('/api/executives?published=false', { headers })
      if (res.ok) {
        const data = await res.json()
        setExecutives(data)
      }
    } catch (err) {
      console.error('Failed to fetch executives:', err)
    }
  }
  
  useImperativeHandle(ref, () => ({
    refreshExecutives
  }))
  
  useEffect(() => {
    refreshExecutives()
  }, [])
  
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
    } catch (err) {
      console.error('Failed to reorder:', err)
      alert('ไม่สามารถเรียงลำดับใหม่ได้')
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
    if (!confirm('ต้องการลบผู้บริหารท่านนี้หรือไม่?')) return
    
    try {
      const token = getToken()
      const res = await fetch(`/api/executives/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        await refreshExecutives()
        showToast('ลบผู้บริหารสำเร็จ', undefined, 'success', 3000)
      } else {
        showToast('ลบผู้บริหารไม่สำเร็จ', undefined, 'error', 4000)
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">จัดการผู้บริหาร</h2>
          <p className="text-sm text-gray-600">ลากเพื่อเรียงลำดับการแสดงผล</p>
        </div>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null) }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <span>➕</span>
          เพิ่มผู้บริหาร
        </button>
      </div>
      
      {showForm && (
        <ExecutiveForm
          initialId={editingId}
          onClose={() => { setShowForm(false); setEditingId(null) }}
          onSaved={() => {
            setShowForm(false)
            setEditingId(null)
            refreshExecutives()
            showToast(editingId ? 'แก้ไขผู้บริหารสำเร็จ' : 'เพิ่มผู้บริหารสำเร็จ', undefined, 'success', 3000)
          }}
        />
      )}
      
      {executives.length === 0 && (
        <div className="card">
          <div className="card-body text-center text-gray-500">
            ยังไม่มีข้อมูลผู้บริหาร
          </div>
        </div>
      )}
      
      <div className="grid gap-3">
        {executives.map((exec, index) => (
          <div
            key={exec._id}
            draggable
            onDragStart={(e) => handleDragStart(e, exec._id!)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, exec._id!)}
            className={`card cursor-move hover:shadow-md transition-shadow ${
              draggingId === exec._id ? 'opacity-50' : ''
            }`}
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                
                {exec.imageUrl && (
                  <img
                    src={exec.imageUrl}
                    alt={exec.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                
                <div className="flex-1">
                  <h3 className="font-bold">{exec.name}</h3>
                  <p className="text-sm text-gray-600">{exec.position}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {exec.isPublished ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">เผยแพร่</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800">ซ่อน</span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingId(exec._id!); setShowForm(true) }}
                    className="btn btn-outline btn-sm"
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(exec._id!)}
                    className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                  >
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
