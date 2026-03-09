
import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../../auth/AuthContext'
import PRPlanUploadModal from './PRPlanUploadModal'

type PRPlan = {
    id: number
    title: string
    description: string
    fileName: string
    fileSize: number
    downloadCount: number
    isPublished: boolean
    displayOrder: number
    createdAt: string
    updatedAt: string
}

export type PRPlanManagementHandle = {
    refresh: () => void
}

const PRPlanManagement = forwardRef<PRPlanManagementHandle>((_, ref) => {
    const { getToken } = useAuth()
    const [plans, setPlans] = useState<PRPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null)

    // Pagination
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const limit = 20

    const fetchPlans = useCallback(async () => {
        try {
            setLoading(true)
            // Admin ควรเห็นทั้งหมด ไม่กรอง isPublished
            const res = await fetch(`/api/pr-plans?page=${page}&limit=${limit}`)
            if (!res.ok) throw new Error('Failed to fetch PR plans')

            const data = await res.json()
            setPlans(data.data || [])
            setTotalPages(data.pagination?.totalPages || 1)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [page, limit])

    useEffect(() => {
        fetchPlans()
    }, [fetchPlans])

    useImperativeHandle(ref, () => ({
        refresh: fetchPlans
    }))

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // ตรวจสอบว่าเป็นไฟล์ PDF
        if (file.type !== 'application/pdf') {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ PDF เท่านั้น', 'warning')
            e.target.value = ''
            return
        }

        // ตรวจสอบขนาดไฟล์ (20MB)
        if (file.size > 20 * 1024 * 1024) {
            Swal.fire('แจ้งเตือน', 'ไฟล์ใหญ่เกิน 20MB', 'warning')
            e.target.value = ''
            return
        }

        // เซ็ตไฟล์ที่เลือกลง state และเปิด modal
        setSelectedUploadFile(file)
        setIsUploadModalOpen(true)

        // เคลียร์ input รูปแบบ file กลับเป็นค่าว่างเพื่อให้อัปโหลดไฟล์เดิมซ้ำได้ใหม่
        e.target.value = ''
    }

    const handleModalUploadSubmit = async (title: string, description: string, file: File) => {
        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', title)
        formData.append('description', description)
        formData.append('isPublished', 'true')

        try {
            const res = await fetch('/api/pr-plans', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Upload failed')
            }

            setPage(1)
            await fetchPlans()
            Swal.fire({
                title: 'สำเร็จ',
                text: 'อัปโหลดสำเร็จ',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
        } finally {
            setUploading(false)
        }
    }

    const handleEdit = async (plan: PRPlan) => {
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขข้อมูล',
            html: `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อแผน</label>
                        <input id="swal-title" class="swal2-input w-full" value="${plan.title}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                        <textarea id="swal-description" class="swal2-textarea w-full">${plan.description || ''}</textarea>
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
                const description = (document.getElementById('swal-description') as HTMLTextAreaElement).value

                if (!title) {
                    Swal.showValidationMessage('กรุณาระบุชื่อแผน')
                    return false
                }

                return { title, description }
            }
        })

        if (!formValues) return

        try {
            const formData = new FormData()
            formData.append('title', formValues.title)
            formData.append('description', formValues.description)

            const res = await fetch(`/api/pr-plans/${plan.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Update failed')
            }

            await fetchPlans()
            Swal.fire({
                title: 'สำเร็จ',
                text: 'แก้ไขสำเร็จ',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#10b981'
            })
        } catch (err: unknown) {
            Swal.fire('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
        }
    }

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'ลบแผนปฏิบัติการ?',
            text: 'คุณแน่ใจหรือไม่ที่จะลบแผนนี้?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        })
        if (!result.isConfirmed) return

        try {
            const res = await fetch(`/api/pr-plans/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Delete failed')
            }

            await fetchPlans()
            Swal.fire({
                title: 'สำเร็จ',
                text: 'ลบสำเร็จ',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#10b981'
            })
        } catch (err: unknown) {
            Swal.fire('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
        }
    }

    const handleTogglePublish = async (id: number, currentStatus: boolean) => {
        const action = currentStatus ? 'ซ่อน' : 'เผยแพร่'
        const result = await Swal.fire({
            title: `${action}แผนปฏิบัติการ?`,
            text: `คุณต้องการ${action}แผนนี้หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: action,
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: currentStatus ? '#f59e0b' : '#10b981'
        })
        if (!result.isConfirmed) return

        try {
            const formData = new FormData()
            formData.append('isPublished', String(!currentStatus))

            const res = await fetch(`/api/pr-plans/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Update failed')
            }

            await fetchPlans()
            Swal.fire({
                title: 'สำเร็จ',
                text: `${action}สำเร็จ`,
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#10b981'
            })
        } catch (err: unknown) {
            Swal.fire('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
        }
    }

    const handlePreview = (id: number) => {
        window.open(`/api/pr-plans/${id}/view`, '_blank')
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString)
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            <i className="fa-solid fa-shield-halved text-purple-600 mr-2" />
                            จัดการแผนปฏิบัติการ ป้องกัน ปราบปราม
                        </h2>
                        <p className="text-gray-600">อัปโหลดและจัดการไฟล์ PDF แผนปฏิบัติการ (ขนาดไม่เกิน 20MB)</p>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <i className="fa-solid fa-cloud-arrow-up text-green-600 mr-2" />
                    อัปโหลดไฟล์ PDF
                </h3>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <i className="fa-solid fa-file-pdf text-4xl text-red-500 mb-3" />
                        <p className="mb-2 text-sm text-gray-700">
                            <span className="font-semibold">คลิกเพื่ออัปโหลด</span> หรือลากไฟล์มาวาง
                        </p>
                        <p className="text-xs text-gray-500">PDF (ขนาดไม่เกิน 20MB)</p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept=".pdf,application/pdf"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                </label>
                {uploading && (
                    <div className="mt-4 flex items-center justify-center text-green-600">
                        <i className="fa-solid fa-spinner fa-spin mr-2" />
                        <span>กำลังอัปโหลด...</span>
                    </div>
                )}
            </div>

            {/* Plans List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        <i className="fa-solid fa-list text-blue-600 mr-2" />
                        รายการแผนปฏิบัติการ ({plans.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <i className="fa-solid fa-spinner fa-spin text-4xl text-gray-400 mb-4" />
                        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <i className="fa-solid fa-exclamation-circle text-4xl text-red-600 mb-4" />
                        <p className="text-red-800">{error}</p>
                    </div>
                ) : plans.length === 0 ? (
                    <div className="p-12 text-center">
                        <i className="fa-solid fa-inbox text-4xl text-gray-400 mb-4" />
                        <p className="text-gray-600">ยังไม่มีแผนปฏิบัติการ</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {plans.map((plan) => (
                            <div key={plan.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-4">
                                    {/* PDF Icon */}
                                    <div className="flex-shrink-0">
                                        <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                                            <i className="fa-solid fa-file-pdf text-3xl text-red-600" />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Title & Status */}
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex-1">
                                                <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                                    {plan.title}
                                                </h4>
                                                {plan.description && (
                                                    <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                                                )}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${plan.isPublished
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                <i className={`fa-solid ${plan.isPublished ? 'fa-eye' : 'fa-eye-slash'} mr-1`} />
                                                {plan.isPublished ? 'เผยแพร่' : 'ซ่อน'}
                                            </span>
                                        </div>

                                        {/* File Info */}
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                                            <span className="flex items-center gap-1">
                                                <i className="fa-solid fa-file text-gray-400" />
                                                {plan.fileName}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <i className="fa-solid fa-hard-drive text-gray-400" />
                                                {formatFileSize(plan.fileSize)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <i className="fa-solid fa-clock text-gray-400" />
                                                {formatDate(plan.createdAt)}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handlePreview(plan.id)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                <i className="fa-solid fa-eye mr-2" />
                                                ดูตัวอย่าง
                                            </button>
                                            <button
                                                onClick={() => handleEdit(plan)}
                                                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                                            >
                                                <i className="fa-solid fa-edit mr-2" />
                                                แก้ไข
                                            </button>
                                            <button
                                                onClick={() => handleTogglePublish(plan.id, plan.isPublished)}
                                                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${plan.isPublished
                                                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                    }`}
                                            >
                                                <i className={`fa-solid ${plan.isPublished ? 'fa-eye-slash' : 'fa-eye'} mr-2`} />
                                                {plan.isPublished ? 'ซ่อน' : 'เผยแพร่'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(plan.id)}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                            >
                                                <i className="fa-solid fa-trash mr-2" />
                                                ลบ
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-6 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <i className="fa-solid fa-chevron-left mr-2" />
                                ก่อนหน้า
                            </button>
                            <span className="text-sm text-gray-600">
                                หน้า {page} จาก {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                ถัดไป
                                <i className="fa-solid fa-chevron-right ml-2" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <PRPlanUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={handleModalUploadSubmit}
                initialFile={selectedUploadFile}
            />
        </div>
    )
})

PRPlanManagement.displayName = 'PRPlanManagement'

export default PRPlanManagement
