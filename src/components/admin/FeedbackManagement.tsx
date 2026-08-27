import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../auth/AuthContext'
import Modal from './Modal'
import Swal from 'sweetalert2'

interface Feedback {
    id: number
    name: string
    email: string | null
    phone: string | null
    subject: string
    message: string
    status: 'new' | 'read'
    read_by: string | null
    read_at: string | null
    created_at: string
    updated_at: string
}

interface FeedbackStats {
    new: number
    read: number
    total: number
}

export default function FeedbackManagement() {
    const { showToast } = useToast()
    const { getToken, refreshToken } = useAuth()
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
    const [stats, setStats] = useState<FeedbackStats>({
        new: 0,
        read: 0,
        total: 0
    })
    const [loading, setLoading] = useState(true)
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Filters & Pagination
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [totalItems, setTotalItems] = useState(0)

    const totalPages = Math.ceil(totalItems / limit)

    const fetchFeedbacks = useCallback(async () => {
        setLoading(true)
        try {
            let token = getToken()
            const params = new URLSearchParams()

            if (statusFilter !== 'all') {
                params.append('status', statusFilter)
            }

            if (debouncedSearchQuery) {
                params.append('search', debouncedSearchQuery)
            }

            // คำนวณ offset
            const offset = (page - 1) * limit
            params.append('limit', limit.toString())
            params.append('offset', offset.toString())

            let response = await fetch(`/api/feedback?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            // ถ้า 401 ให้ลอง refresh token
            if (response.status === 401) {
                const refreshSuccess = await refreshToken()
                if (refreshSuccess) {
                    token = getToken()
                    response = await fetch(`/api/feedback?${params.toString()}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                }
            }

            if (response.ok) {
                const data = await response.json()
                setFeedbacks(data.data)
                // อัปเดต totalItems จาก pagination response
                if (data.pagination) {
                    setTotalItems(data.pagination.total)
                }
            } else {
                showToast('ไม่สามารถโหลดข้อมูลได้', undefined, 'error')
            }
        } catch (error) {
            console.error('Error fetching feedbacks:', error)
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', undefined, 'error')
        } finally {
            setLoading(false)
        }
    }, [getToken, refreshToken, statusFilter, debouncedSearchQuery, page, limit, showToast])

    const fetchStats = useCallback(async () => {
        try {
            let token = getToken()
            let response = await fetch('/api/feedback/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            // ถ้า 401 ให้ลอง refresh token
            if (response.status === 401) {
                const refreshSuccess = await refreshToken()
                if (refreshSuccess) {
                    token = getToken()
                    response = await fetch('/api/feedback/stats', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                }
            }

            if (response.ok) {
                const data = await response.json()
                setStats(data.data)
            }
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }, [getToken, refreshToken])

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
            // รีเซ็ตหน้าเมื่อค้นหาเปลี่ยน
            if (searchQuery !== debouncedSearchQuery) {
                setPage(1)
            }
        }, 500) // รอ 500ms หลังจากพิมพ์เสร็จ

        return () => clearTimeout(timer)
    }, [searchQuery, debouncedSearchQuery])

    // รีเซ็ตหน้าเมื่อ filter เปลี่ยน
    useEffect(() => {
        setPage(1)
    }, [statusFilter, limit])

    // Fetch feedbacks เมื่อ dependencies เปลี่ยน
    useEffect(() => {
        fetchFeedbacks()
    }, [fetchFeedbacks])

    useEffect(() => {
        fetchStats()
    }, [fetchStats]) // stats ไม่ขึ้นกับ pagination แต่ขึ้นกับ action ต่างๆ

    // เปิด Modal และเปลี่ยนสถานะเป็น 'read'
    const handleViewFeedback = async (feedback: Feedback) => {
        setSelectedFeedback(feedback)
        setIsModalOpen(true)

        // ถ้าสถานะเป็น 'new' ให้เปลี่ยนเป็น 'read'
        if (feedback.status === 'new') {
            await updateStatus(feedback.id, 'read')
        }
    }

    const updateStatus = async (id: number, status: string) => {
        try {
            let token = getToken()
            let response = await fetch(`/api/feedback/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            })

            // ถ้า 401 ให้ลอง refresh token แล้วลองใหม่
            if (response.status === 401) {
                const refreshSuccess = await refreshToken()
                if (refreshSuccess) {
                    token = getToken()
                    response = await fetch(`/api/feedback/${id}/status`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status })
                    })
                }
            }

            if (response.ok) {
                fetchFeedbacks()
                fetchStats()
            } else {
                showToast('ไม่สามารถอัปเดตสถานะได้', undefined, 'error')
            }
        } catch (error) {
            console.error('Error updating status:', error)
            showToast('เกิดข้อผิดพลาด', undefined, 'error')
        }
    }


    // ลบความคิดเห็น
    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: 'ต้องการลบความคิดเห็นนี้หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#3085d6'
        })

        if (!result.isConfirmed) {
            return
        }

        try {
            const token = getToken()
            const response = await fetch(`/api/feedback/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                showToast('ลบความคิดเห็นสำเร็จ', undefined, 'success')
                fetchFeedbacks()
                fetchStats()
            } else {
                showToast('ไม่สามารถลบได้', undefined, 'error')
            }
        } catch (error) {
            console.error('Error deleting feedback:', error)
            showToast('เกิดข้อผิดพลาดในการลบ', undefined, 'error')
        }
    }

    // ฟังก์ชันแสดงสถานะ
    const getStatusBadge = (status: string) => {
        const badges = {
            new: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
            read: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
        }

        const labels = {
            new: 'ใหม่',
            read: 'อ่านแล้ว'
        }

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
                {labels[status as keyof typeof labels]}
            </span>
        )
    }

    // ฟังก์ชันจัดรูปแบบวันที่
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-emerald-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">จัดการความคิดเห็น</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-emerald-50 rounded-lg p-4 ring-1 ring-emerald-100">
                        <div className="text-sm text-emerald-700 font-medium">ใหม่</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">{stats.new}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 ring-1 ring-gray-100">
                        <div className="text-sm text-gray-600 font-medium">อ่านแล้ว</div>
                        <div className="text-2xl font-bold text-gray-700 mt-1">{stats.read}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 ring-1 ring-purple-100">
                        <div className="text-sm text-purple-600 font-medium">ทั้งหมด</div>
                        <div className="text-2xl font-bold text-purple-700 mt-1">{stats.total}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="ค้นหาตามชื่อ, อีเมล, หัวข้อ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="new">ใหม่</option>
                        <option value="read">อ่านแล้ว</option>
                    </select>
                </div>
            </div>

            {/* Feedback List */}
            {feedbacks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-3" />
                    <p className="text-gray-500">ไม่พบความคิดเห็น</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        วันที่
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        ชื่อ
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        หัวข้อ
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        สถานะ
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        จัดการ
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {feedbacks.map((feedback) => (
                                    <tr key={feedback.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                            {formatDate(feedback.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">{feedback.name}</div>
                                            {feedback.email && (
                                                <div className="text-xs text-gray-500">{feedback.email}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                                {feedback.subject}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {getStatusBadge(feedback.status)}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewFeedback(feedback)}
                                                    className="text-emerald-600 hover:text-emerald-700 p-2"
                                                    title="ดูรายละเอียด"
                                                >
                                                    <i className="fa-solid fa-eye" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(feedback.id)}
                                                    className="text-rose-600 hover:text-rose-700 p-2"
                                                    title="ลบ"
                                                >
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-600">
                        แสดง {Math.min((page - 1) * limit + 1, totalItems)} ถึง {Math.min(page * limit, totalItems)} จาก {totalItems} รายการ
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center mr-4">
                            <span className="text-sm text-gray-600 mr-2">จำนวนต่อหน้า:</span>
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className={`px-3 py-1 rounded-md text-sm font-medium ${page === 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                        >
                            ก่อนหน้า
                        </button>

                        <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-md">
                            หน้า {page} / {totalPages || 1}
                        </span>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || totalPages === 0}
                            className={`px-3 py-1 rounded-md text-sm font-medium ${page === totalPages || totalPages === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            )}

            {/* Modal สำหรับดูรายละเอียดและตอบกลับ */}
            {selectedFeedback && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="รายละเอียดความคิดเห็น">
                    <div className="space-y-4">
                        {/* ข้อมูลผู้ส่ง */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">ข้อมูลผู้ส่ง</h3>
                                {getStatusBadge(selectedFeedback.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-600">ชื่อ:</span>
                                    <span className="ml-2 text-gray-900 font-medium">{selectedFeedback.name}</span>
                                </div>
                                {selectedFeedback.email && (
                                    <div>
                                        <span className="text-gray-600">อีเมล:</span>
                                        <span className="ml-2 text-gray-900">{selectedFeedback.email}</span>
                                    </div>
                                )}
                                {selectedFeedback.phone && (
                                    <div>
                                        <span className="text-gray-600">เบอร์โทร:</span>
                                        <span className="ml-2 text-gray-900">{selectedFeedback.phone}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-600">วันที่:</span>
                                    <span className="ml-2 text-gray-900">{formatDate(selectedFeedback.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        {/* หัวข้อและข้อความ */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">หัวข้อ</label>
                            <div className="bg-gray-50 rounded-lg p-3 text-gray-900">
                                {selectedFeedback.subject}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ข้อความ</label>
                            <div className="bg-gray-50 rounded-lg p-3 text-gray-900 whitespace-pre-wrap">
                                {selectedFeedback.message}
                            </div>
                        </div>

                        {/* ข้อมูลการอ่าน */}
                        {selectedFeedback.read_by && selectedFeedback.read_at && (
                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                <div className="flex items-center gap-2 text-sm text-emerald-700">
                                    <i className="fa-solid fa-eye" />
                                    <span className="font-medium">อ่านโดย:</span>
                                    <span>{selectedFeedback.read_by}</span>
                                    <span className="text-emerald-600">•</span>
                                    <span className="text-emerald-600">{formatDate(selectedFeedback.read_at)}</span>
                                </div>
                            </div>
                        )}


                        {/* ปุ่มดำเนินการ */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="admin-btn admin-btn--outline w-full justify-center"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
