import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, lazy, Suspense } from 'react'
import { formatFileSize, getFileIcon } from '../utils/documentHelpers'
import { apiRequest } from '../utils/api'

// [bundle-dynamic-imports] Lazy load heavy component
const ITDocumentForm = lazy(() => import('./admin/ITDocumentForm'))

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

export interface ITCenterManagementHandle {
    refresh: () => Promise<void>
}

// Helper function for indentation based on numbering (e.g. 9.1.1)
const getIndentLevel = (title: string): number => {
    if (!title) return 0;
    const match = title.match(/^(\d+(?:\.\d+)*)/);
    if (!match) return 0;
    const parts = match[1].split('.');
    return Math.max(0, parts.length - 1);
};

const IT_CATEGORIES = [
    'ทั้งหมด',
    'Cybersecurity',
    'ระเบียบการใช้งานระบบสารสนเทศ',
    'ระบบประเมินมาตรฐานระบบบริการสุขภาพ',
    'ระบบประเมินโรงพยาบาลอัจฉริยะ (Smart hospital)',
    'คู่มือระบบสารสนเทศ'
]

const ITCenterManagement = forwardRef<ITCenterManagementHandle, object>(
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

        // Specific handlers for the new workflow
        const [pendingFile, setPendingFile] = useState<File | null>(null)

        // Debounce search
        useEffect(() => {
            const timer = setTimeout(() => {
                setDebouncedSearch(searchQuery)
                setCurrentPage(1)
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
                    search: debouncedSearch,
                    published: 'all' // Show all for admin
                })

                const response = await apiRequest(`/api/it-center?${params.toString()}`)
                if (!response.ok) return 

                const result = await response.json()
                if (result.pagination) {
                    setDocuments(result.data)
                    setTotalPages(result.pagination.totalPages)
                    setTotalItems(result.pagination.total)
                } else {
                    setDocuments(result.data || [])
                    setTotalPages(1)
                    setTotalItems(result.data?.length || 0)
                }
            } catch (error) {
                console.error('Error fetching IT documents:', error)
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
            Swal.fire({
                title: 'กำลังอัปโหลด...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading() }
            })

            try {
                const response = await apiRequest('/api/it-center', {
                    method: 'POST',
                    body: formData
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'ไม่สามารถเพิ่มเอกสารได้')
                }

                await fetchDocuments()
                handleCloseForm()

                Swal.fire({
                    icon: 'success',
                    title: 'เพิ่มเอกสารสำเร็จ',
                    timer: 2000,
                    showConfirmButton: false
                })
            } catch (error: unknown) {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: error instanceof Error ? error.message : 'ไม่สามารถเพิ่มเอกสารได้',
                })
            }
        }

        const handleUpdate = async (formData: FormData) => {
            if (!editingDocument) return 
            
            Swal.fire({
                title: 'กำลังอัปเดต...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading() }
            })

            try {
                const response = await apiRequest(`/api/it-center/${editingDocument.id}`, {
                    method: 'PUT',
                    body: formData
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'ไม่สามารถแก้ไขเอกสารได้')
                }

                await fetchDocuments()
                handleCloseForm()

                Swal.fire({
                    icon: 'success',
                    title: 'แก้ไขสำเร็จ',
                    timer: 2000,
                    showConfirmButton: false
                })
            } catch (error: unknown) {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: error instanceof Error ? error.message : 'ไม่สามารถแก้ไขเอกสารได้',
                })
            }
        }

        const handleDelete = async (id: number) => {
            const result = await Swal.fire({
                title: 'ยืนยันการลบ?',
                text: 'การกระทำนี้ไม่สามารถย้อนกลับได้',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'ลบข้อมูล',
                cancelButtonText: 'ยกเลิก'
            })

            if (!result.isConfirmed) return 

            try {
                const response = await apiRequest(`/api/it-center/${id}`, { method: 'DELETE' })
                if (!response.ok) throw new Error('ไม่สามารถลบเอกสารได้')
                await fetchDocuments()
                Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false })
            } catch (error: unknown) {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: error instanceof Error ? error.message : 'ไม่สามารถลบเอกสารได้',
                })
            }
        }

        const handleEdit = (doc: Document) => {
            setEditingDocument(doc)
            setPendingFile(null)
            setShowForm(true)
        }


        const handleCloseForm = () => {
            setShowForm(false)
            setEditingDocument(null)
            setPendingFile(null)
        }

        if (loading && documents.length === 0) {
            return (
                <div className="py-12 text-center text-emerald-600">
                    <i className="fa-solid fa-circle-notch fa-spin text-4xl" />
                </div>
            )
        }

        return (
            <div className="space-y-6">
                {showForm ? (
                    <Suspense fallback={<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-8 text-white font-medium animate-pulse">กำลังโหลดฟอร์ม...</div>}>
                        <ITDocumentForm
                            document={editingDocument}
                            pendingFile={pendingFile}
                            onSubmit={editingDocument ? handleUpdate : handleCreate}
                            onCancel={handleCloseForm}
                        />
                    </Suspense>
                ) : null}

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div className="relative">
                                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="ค้นหาเอกสาร IT..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                                />
                            </div>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                            >
                                {IT_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    setEditingDocument(null)
                                    setPendingFile(null)
                                    setShowForm(true)
                                }}
                                className="admin-btn admin-btn--add whitespace-nowrap"
                            >
                                <i className="fa-solid fa-plus-circle" /> เพิ่มเอกสารใหม่
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">เอกสาร</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {documents.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">ไม่พบข้อมูล</td></tr>
                                ) : (
                                    (() => {
                                        const baseDepth = documents.length > 0 ? Math.min(...documents.map(d => getIndentLevel(d.title))) : 0;
                                        return documents.map(doc => {
                                            const rawDepth = getIndentLevel(doc.title);
                                            const depth = Math.max(0, rawDepth - baseDepth);
                                            const isChild = depth > 0;
                                            
                                            return (
                                            <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        {isChild && (
                                                            <div className={`shrink-0 ${
                                                                depth === 1 ? 'w-6 sm:w-12' : 
                                                                depth === 2 ? 'w-12 sm:w-20' : 
                                                                'w-20 sm:w-28'
                                                            }`} />
                                                        )}
                                                        <span className={`${isChild ? 'text-xl mt-0.5' : 'text-2xl'}`}>{getFileIcon(doc.mimeType)}</span>
                                                        <div>
                                                            <div className={`font-bold text-gray-800 break-words ${isChild ? 'text-sm' : ''}`}>{doc.title}</div>
                                                            <div className="text-xs text-gray-400">
                                                                {doc.fileName ? (
                                                                    <>
                                                                        {formatFileSize(doc.fileSize)} • เข้าชม {doc.downloadCount} ครั้ง
                                                                    </>
                                                                ) : (
                                                                    <span className="text-rose-500 font-bold">⚠️ ยังไม่มีการแนบไฟล์</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 font-medium">
                                                    {doc.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${doc.isPublished ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                                    {doc.isPublished ? 'เผยแพร่' : 'ซ่อน'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEdit(doc)} className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-50"><i className="fa-solid fa-pen" /></button>
                                                    <button onClick={() => handleDelete(doc.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50"><i className="fa-solid fa-trash-can" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            })()
                        )}
                    </tbody>
                        </table>
                    </div>

                    {totalPages > 1 ? (
                        <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-500">
                                ทั้งหมด <span className="font-bold text-gray-700">{totalItems}</span> รายการ
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                                >
                                    <i className="fa-solid fa-chevron-left text-xs" />
                                </button>
                                <span className="px-4 text-sm font-medium text-gray-700">
                                    หน้า {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                                >
                                    <i className="fa-solid fa-chevron-right text-xs" />
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        )
    }
)

ITCenterManagement.displayName = 'ITCenterManagement'
export default ITCenterManagement
