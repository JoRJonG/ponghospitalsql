import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../../auth/AuthContext'
import { buildApiUrl } from '../../utils/api'

type OrganizationChart = {
    _id: string
    title: string
    imageUrl: string
    displayOrder: number
    isPublished: boolean
}

export type OrganizationChartManagementHandle = {
    refresh: () => void
}

const OrganizationChartManagement = forwardRef<OrganizationChartManagementHandle>((_, ref) => {
    const { getToken } = useAuth()
    const [charts, setCharts] = useState<OrganizationChart[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [draggingId, setDraggingId] = useState<string | null>(null)

    const fetchCharts = async () => {
        try {
            const res = await fetch('/api/organization?published=false')
            if (!res.ok) throw new Error('Failed to fetch charts')
            const data = await res.json()
            setCharts(data)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCharts()
    }, [])

    useImperativeHandle(ref, () => ({
        refresh: fetchCharts
    }))

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'warning')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            Swal.fire('แจ้งเตือน', 'ไฟล์ใหญ่เกิน 10MB', 'warning')
            return
        }

        setUploading(true)
        const formData = new FormData()
        formData.append('image', file)
        formData.append('title', file.name)
        formData.append('isPublished', 'true')
        formData.append('displayOrder', String(charts.length))

        try {
            const res = await fetch('/api/organization', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Upload failed')
            }

            await fetchCharts()
            e.target.value = ''
            Swal.fire({
                title: 'สำเร็จ',
                text: 'อัพโหลดสำเร็จ',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
        } catch (err: unknown) {
            Swal.fire({ title: 'ข้อผิดพลาด', text: `เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`, icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id: string | number) => {
        const result = await Swal.fire({
            title: 'ลบรูปภาพ?',
            text: 'คุณแน่ใจหรือไม่ที่จะลบรูปนี้?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        })
        if (!result.isConfirmed) return

        try {
            const res = await fetch(`/api/organization/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Delete failed')
            }

            await fetchCharts()
            Swal.fire({
                title: 'สำเร็จ',
                text: 'ลบสำเร็จ',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
        } catch (err: unknown) {
            Swal.fire('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
        }
    }

    const handleTogglePublish = async (id: string | number, currentStatus: boolean) => {
        try {
            const formData = new FormData()
            formData.append('isPublished', String(!currentStatus))

            const res = await fetch(`/api/organization/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Update failed')
            }

            await fetchCharts()
        } catch (err: unknown) {
            Swal.fire('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
        }
    }

    const handleEdit = async (chart: OrganizationChart) => {
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขข้อมูลผู้บริหาร',
            html: `
                <div class="space-y-4 text-left">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                        <input id="swal-title" class="swal2-input w-full" value="${chart.title}" placeholder="ระบุชื่อ">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">เปลี่ยนรูปภาพ (ไม่บังคับ)</label>
                        <input id="swal-image" type="file" accept="image/*" class="swal2-file w-full">
                        <p class="text-xs text-gray-500 mt-1">หากต้องการเปลี่ยนรูป ให้เลือกไฟล์ใหม่ (ขนาดไม่เกิน 10MB)</p>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#10b981',
            preConfirm: () => {
                const title = (document.getElementById('swal-title') as HTMLInputElement).value
                const imageInput = document.getElementById('swal-image') as HTMLInputElement
                const imageFile = imageInput.files?.[0]

                if (!title.trim()) {
                    Swal.showValidationMessage('กรุณาระบุชื่อ')
                    return false
                }

                if (imageFile && imageFile.size > 10 * 1024 * 1024) {
                    Swal.showValidationMessage('ไฟล์รูปภาพใหญ่เกิน 10MB')
                    return false
                }

                if (imageFile && !imageFile.type.startsWith('image/')) {
                    Swal.showValidationMessage('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
                    return false
                }

                return { title, imageFile }
            }
        })

        if (!formValues) return

        try {
            const formData = new FormData()
            formData.append('title', formValues.title)

            // ถ้ามีการเลือกรูปใหม่ ให้เพิ่มเข้า FormData
            if (formValues.imageFile) {
                formData.append('image', formValues.imageFile)
            }

            const res = await fetch(`/api/organization/${chart._id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Update failed')
            }

            await fetchCharts()
            Swal.fire({
                title: 'สำเร็จ',
                text: 'แก้ไขข้อมูลสำเร็จ',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
        } catch (err: unknown) {
            Swal.fire('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
        }
    }

    const handleReorder = async (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return

        const newList = [...charts]
        const [moved] = newList.splice(fromIndex, 1)
        newList.splice(toIndex, 0, moved)

        const updatedList = newList.map((item, index) => ({
            ...item,
            displayOrder: index
        }))

        setCharts(updatedList)

        const orderIds = updatedList.map(item => item._id)

        try {
            const res = await fetch('/api/organization/reorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ order: orderIds })
            })

            if (!res.ok) throw new Error('Reorder failed')
        } catch (err: unknown) {
            console.error('Failed to reorder:', err)
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเรียงลำดับใหม่ได้', 'error')
            await fetchCharts()
        }
    }

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e: React.DragEvent, dropId: string) => {
        e.preventDefault()
        if (!draggingId || draggingId === dropId) return

        const fromIndex = charts.findIndex(item => item._id === draggingId)
        const toIndex = charts.findIndex(item => item._id === dropId)

        if (fromIndex >= 0 && toIndex >= 0) {
            handleReorder(fromIndex, toIndex)
        }

        setDraggingId(null)
    }

    if (loading) {
        return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i></div>
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
                            อัพโหลดแผนผังองค์กร
                        </h3>
                        <span className="text-sm text-gray-500">ลากเพื่อเรียงลำดับการแสดงผล</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className={`btn btn-primary cursor-pointer ${uploading ? 'opacity-75 pointer-events-none' : ''}`}>
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
                        <i className="fa-solid fa-sitemap text-blue-600" />
                        รายการแผนผังองค์กร ({charts.length})
                    </h3>

                    {charts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                <i className="fa-solid fa-sitemap text-gray-300"></i>
                            </div>
                            <p>ยังไม่มีข้อมูลแผนผังองค์กร</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {charts.map((item, index) => (
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
                                    <div className="w-32 h-auto flex-shrink-0 relative group">
                                        <img
                                            src={buildApiUrl(item.imageUrl)}
                                            alt={item.title}
                                            className="w-full h-auto object-cover rounded border border-gray-300"
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
                                                    onClick={() => handleEdit(item)}
                                                    className="btn btn-sm btn-warning"
                                                    title="แก้ไข"
                                                >
                                                    <i className="fa-solid fa-edit" />
                                                </button>
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

OrganizationChartManagement.displayName = 'OrganizationChartManagement'

export default OrganizationChartManagement
