import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { formatFileSize, getFileIcon, getCategoryColor } from '../utils/documentHelpers'
import { apiRequest } from '../utils/api'
import DocumentForm from './admin/DocumentForm'

import Swal from 'sweetalert2'

export interface Document {
    id: number
    title: string
    description: string
    category: string
    fileName: string
    mimeType: string
    fileSize: number
    downloadCount: number
    isPublished: boolean
    displayOrder: number
    createdBy: string
    createdAt: string
    updatedAt: string
}

export interface DocumentsManagementHandle {
    refresh: () => Promise<void>
}

interface DocumentsManagementProps { }

const DocumentsManagement = forwardRef<DocumentsManagementHandle, DocumentsManagementProps>(
    (_props, ref) => {
        const [documents, setDocuments] = useState<Document[]>([])
        const [loading, setLoading] = useState(true)
        const [showForm, setShowForm] = useState(false)
        const [editingDocument, setEditingDocument] = useState<Document | null>(null)
        const [searchQuery, setSearchQuery] = useState('')
        const [debouncedSearch, setDebouncedSearch] = useState('')
        const [filterCategory, setFilterCategory] = useState('ทั้งหมด')

        // Pagination state
        const [currentPage, setCurrentPage] = useState(1)
        const [totalPages, setTotalPages] = useState(1)
        const [totalItems, setTotalItems] = useState(0)
        const [itemsPerPage] = useState(20)

        // Debouce search
        useEffect(() => {
            const timer = setTimeout(() => {
                setDebouncedSearch(searchQuery)
                setCurrentPage(1) // Reset to page 1 on new search
            }, 500)
            return () => clearTimeout(timer)
        }, [searchQuery])

        const fetchDocuments = useCallback(async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: itemsPerPage.toString(),
                    category: filterCategory === 'ทั้งหมด' ? '' : filterCategory,
                    search: debouncedSearch
                })

                const response = await apiRequest(`/api/documents?${params.toString()}`)
                if (response.ok) {
                    const result = await response.json()
                    // Check if response has pagination structure
                    if (result.pagination) {
                        setDocuments(result.data)
                        setTotalPages(result.pagination.totalPages)
                        setTotalItems(result.pagination.total)
                    } else {
                        // Fallback for flat array (backward compatibility)
                        setDocuments(result)
                        setTotalPages(1)
                        setTotalItems(result.length)
                    }
                }
            } catch (error) {
                console.error('Error fetching documents:', error)
            } finally {
                setLoading(false)
            }
        }, [currentPage, itemsPerPage, filterCategory, debouncedSearch])

        useImperativeHandle(ref, () => ({
            refresh: fetchDocuments
        }))

        useEffect(() => {
            fetchDocuments()
        }, [fetchDocuments])

        const handleCreate = async (formData: FormData) => {
            // แสดง progress dialog
            Swal.fire({
                title: 'กำลังอัปโหลด...',
                html: 'กรุณารอสักครู่ กำลังบันทึกข้อมูลและอัปโหลดไฟล์',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading()
                }
            })

            try {
                const response = await apiRequest('/api/documents', {
                    method: 'POST',
                    body: formData
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'ไม่สามารถเพิ่มเอกสารได้')
                }

                await fetchDocuments()
                setShowForm(false)

                Swal.fire({
                    icon: 'success',
                    title: 'เพิ่มเอกสารสำเร็จ',
                    text: 'เอกสารถูกเพิ่มเข้าระบบและไฟล์ถูกบันทึกเรียบร้อยแล้ว',
                    timer: 2000,
                    showConfirmButton: false
                })
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถเพิ่มเอกสารได้'
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: errorMessage,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'ตกลง'
                })
            }
        }

        const handleUpdate = async (formData: FormData) => {
            if (!editingDocument) return

            // แสดง progress dialog
            Swal.fire({
                title: 'กำลังอัปเดต...',
                html: 'กรุณารอสักครู่ กำลังบันทึกการเปลี่ยนแปลง',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading()
                }
            })

            try {
                const response = await apiRequest(`/api/documents/${editingDocument.id}`, {
                    method: 'PUT',
                    body: formData
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'ไม่สามารถแก้ไขเอกสารได้')
                }

                await fetchDocuments()
                setEditingDocument(null)
                setShowForm(false)

                Swal.fire({
                    icon: 'success',
                    title: 'แก้ไขเอกสารสำเร็จ',
                    text: 'ข้อมูลเอกสารถูกปรับปรุงเรียบร้อยแล้ว',
                    timer: 2000,
                    showConfirmButton: false
                })
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถแก้ไขเอกสารได้'
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: errorMessage,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'ตกลง'
                })
            }
        }

        const handleDelete = async (id: number) => {
            const result = await Swal.fire({
                title: 'ยืนยันการลบ?',
                text: 'คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้? การกระทำนี้ไม่สามารถย้อนกลับได้',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ลบข้อมูล',
                cancelButtonText: 'ยกเลิก'
            })

            if (!result.isConfirmed) {
                return
            }

            Swal.fire({
                title: 'กำลังลบ...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading()
                }
            })

            try {
                const response = await apiRequest(`/api/documents/${id}`, {
                    method: 'DELETE'
                })

                if (!response.ok) {
                    throw new Error('ไม่สามารถลบเอกสารได้')
                }

                await fetchDocuments()

                Swal.fire({
                    icon: 'success',
                    title: 'ลบสำเร็จ',
                    text: 'เอกสารถูกลบออกจากระบบแล้ว',
                    timer: 1500,
                    showConfirmButton: false
                })
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถลบเอกสารได้'
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: errorMessage,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'ตกลง'
                })
            }
        }

        const handleEdit = (doc: Document) => {
            setEditingDocument(doc)
            setShowForm(true)
        }

        const handleCancelForm = () => {
            setShowForm(false)
            setEditingDocument(null)
        }

        const [categories, setCategories] = useState<string[]>(['ทั้งหมด'])

        // Fetch categories
        useEffect(() => {
            const fetchCategories = async () => {
                try {
                    const response = await fetch('/api/documents/categories')
                    if (response.ok) {
                        const data = await response.json()
                        setCategories(['ทั้งหมด', ...data])
                    }
                } catch (error) {
                    console.error('Error fetching categories:', error)
                }
            }
            fetchCategories()
        }, [])

        // Remove filteredDocuments logic since filtering is now done on the server


        if (loading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                </div>
            )
        }

        return (
            <div className="space-y-6">
                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fade-in-up">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                {editingDocument ? (
                                    <>
                                        <span className="text-blue-600"><i className="fa-solid fa-pen-to-square"></i></span>
                                        แก้ไขเอกสาร
                                    </>
                                ) : (
                                    <>
                                        <span className="text-green-600"><i className="fa-solid fa-cloud-arrow-up"></i></span>
                                        เพิ่มเอกสารใหม่
                                    </>
                                )}
                            </h2>
                            <DocumentForm
                                document={editingDocument}
                                onSubmit={editingDocument ? handleUpdate : handleCreate}
                                onCancel={handleCancelForm}
                            />
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            {/* Search */}
                            <div className="relative">
                                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input
                                    type="text"
                                    placeholder="ค้นหาเอกสาร..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                />
                            </div>

                            {/* Category Filter */}
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow flex items-center gap-2 whitespace-nowrap"
                        >
                            <i className="fa-solid fa-plus"></i>
                            เพิ่มเอกสาร
                        </button>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">เอกสารทั้งหมด</div>
                            <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                            <i className="fa-solid fa-file-lines text-lg"></i>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">เผยแพร่แล้ว</div>
                            <div className="text-2xl font-bold text-green-600">
                                {documents.filter(d => d.isPublished).length}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <i className="fa-solid fa-check text-lg"></i>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">ยังไม่เผยแพร่</div>
                            <div className="text-2xl font-bold text-amber-600">
                                {documents.filter(d => !d.isPublished).length}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <i className="fa-solid fa-eye-slash text-lg"></i>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">ดาวน์โหลดทั้งหมด</div>
                            <div className="text-2xl font-bold text-blue-600">
                                {documents.reduce((sum, d) => sum + d.downloadCount, 0)}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <i className="fa-solid fa-download text-lg"></i>
                        </div>
                    </div>
                </div>

                {/* Documents Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        เอกสาร
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        หมวดหมู่
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        ขนาด
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        โหลด
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        สถานะ
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        จัดการ
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {documents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-regular fa-folder-open text-4xl text-gray-300 mb-2"></i>
                                                <p>ไม่พบเอกสาร</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    documents.map(doc => (
                                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl mt-1">{getFileIcon(doc.mimeType)}</span>
                                                    <div>
                                                        <div className="font-medium text-gray-900 line-clamp-2" title={doc.title}>{doc.title}</div>
                                                        <div className="text-xs text-gray-400 mt-0.5">{doc.fileName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(doc.category)}`}>
                                                    {doc.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-gray-500 whitespace-nowrap">
                                                {formatFileSize(doc.fileSize)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-gray-500 whitespace-nowrap">
                                                {doc.downloadCount}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    {doc.isPublished ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            เผยแพร่
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                                            ซ่อน
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(doc)}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="แก้ไข"
                                                    >
                                                        <i className="fa-solid fa-pen"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(doc.id)}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"
                                                        title="ลบ"
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                แสดงรายการที่ <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> จาก <span className="font-medium">{totalItems}</span> รายการ
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ก่อนหน้า
                                </button>

                                <div className="hidden md:flex gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        // Simple logic to show window around current page
                                        let pageNum = currentPage;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${currentPage === pageNum
                                                    ? 'bg-green-600 text-white border border-green-600'
                                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ถัดไป
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }
)

DocumentsManagement.displayName = 'DocumentsManagement'

export default DocumentsManagement
