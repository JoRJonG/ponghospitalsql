import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useAuth } from '../auth/AuthContext'

type Infographic = {
  _id: string
  title: string
  imageUrl: string
  displayOrder: number
  isPublished: boolean
}

export type InfographicsManagementHandle = {
  refresh: () => void
}

const InfographicsManagement = forwardRef<InfographicsManagementHandle>((_, ref) => {
  const { getToken } = useAuth()
  const [infographics, setInfographics] = useState<Infographic[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const fetchInfographics = async () => {
    try {
      const res = await fetch('/api/infographics?published=false')
      if (!res.ok) throw new Error('Failed to fetch infographics')
      const data = await res.json()
      setInfographics(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInfographics()
  }, [])

  useImperativeHandle(ref, () => ({
    refresh: fetchInfographics
  }))

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('ไฟล์ใหญ่เกิน 10MB')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)
    formData.append('title', file.name)
    formData.append('isPublished', 'true')
    formData.append('displayOrder', String(infographics.length))

    try {
      const res = await fetch('/api/infographics', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      await fetchInfographics()
      e.target.value = '' // Reset input
      alert('อัพโหลดสำเร็จ')
    } catch (err: unknown) {
      alert(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรูปนี้?')) return

    try {
      const res = await fetch(`/api/infographics/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }

      await fetchInfographics()
      alert('ลบสำเร็จ')
    } catch (err: unknown) {
      alert(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleTogglePublish = async (id: string | number, currentStatus: boolean) => {
    try {
      const formData = new FormData()
      formData.append('isPublished', String(!currentStatus))

      const res = await fetch(`/api/infographics/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Update failed')
      }

      await fetchInfographics()
    } catch (err: unknown) {
      alert(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    // Optimistic update
    const newList = [...infographics]
    const [moved] = newList.splice(fromIndex, 1)
    newList.splice(toIndex, 0, moved)

    // Update displayOrder property for local state
    const updatedList = newList.map((item, index) => ({
      ...item,
      displayOrder: index
    }))

    setInfographics(updatedList)

    // Prepare payload for backend: { order: [id1, id2, ...] }
    const orderIds = updatedList.map(item => item._id)

    try {
      const res = await fetch('/api/infographics/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ order: orderIds })
      })

      if (!res.ok) throw new Error('Reorder failed')

      // No need to refresh immediately if optimistic update was correct, 
      // but refreshing ensures consistency
      // await fetchInfographics() 
    } catch (err: unknown) {
      console.error('Failed to reorder:', err)
      alert('ไม่สามารถเรียงลำดับใหม่ได้')
      await fetchInfographics() // Revert on error
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    // Optional: Set drag image or data
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === dropId) return

    const fromIndex = infographics.findIndex(item => item._id === draggingId)
    const toIndex = infographics.findIndex(item => item._id === dropId)

    if (fromIndex >= 0 && toIndex >= 0) {
      handleReorder(fromIndex, toIndex)
    }

    setDraggingId(null)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <i className="fa-solid fa-exclamation-circle mr-2" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <i className="fa-solid fa-upload text-green-600" />
              อัพโหลด Infographic
            </h3>
            <span className="text-sm text-gray-500">ลากเพื่อเรียงลำดับการแสดงผล</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="btn btn-primary cursor-pointer">
              <i className="fa-solid fa-image mr-2" />
              {uploading ? 'กำลังอัพโหลด...' : 'เลือกรูปภาพ'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <span className="text-sm text-gray-600">รองรับไฟล์รูปภาพ ขนาดไม่เกิน 10MB</span>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fa-solid fa-list text-blue-600" />
            รายการ Infographics ({infographics.length})
          </h3>

          {infographics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fa-solid fa-image text-4xl mb-2" />
              <p>ยังไม่มีข้อมูล</p>
            </div>
          ) : (
            <div className="space-y-3">
              {infographics.map((item, index) => (
                <div
                  key={item._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item._id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item._id)}
                  className={`flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-move hover:shadow-md transition-shadow ${draggingId === item._id ? 'opacity-50 border-dashed border-blue-400' : ''
                    }`}
                >
                  {/* Thumbnail */}
                  <div className="w-32 h-32 flex-shrink-0 relative group">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover rounded border border-gray-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded flex items-center justify-center">
                      <i className="fa-solid fa-grip-vertical text-white/0 group-hover:text-white/80 text-2xl drop-shadow-md" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {index + 1}. {item.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <i className="fa-solid fa-sort-numeric-down" />
                            ลำดับที่ {index + 1}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${item.isPublished
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                            }`}>
                            {item.isPublished ? 'เผยแพร่' : 'ซ่อน'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleTogglePublish(item._id, item.isPublished)}
                          className="btn btn-sm btn-secondary"
                          title={item.isPublished ? 'ซ่อน' : 'เผยแพร่'}
                        >
                          <i className={`fa-solid ${item.isPublished ? 'fa-eye-slash' : 'fa-eye'}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="btn btn-sm btn-danger"
                          title="ลบ"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

InfographicsManagement.displayName = 'InfographicsManagement'

export default InfographicsManagement
