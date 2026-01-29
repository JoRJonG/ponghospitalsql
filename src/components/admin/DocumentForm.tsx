import { useState, useEffect } from 'react'
import { validateFileType } from '../../utils/documentHelpers'
import type { Document } from '../DocumentsManagement'

interface DocumentFormProps {
    document?: Document | null
    onSubmit: (data: FormData) => Promise<void>
    onCancel: () => void
}

export default function DocumentForm({ document, onSubmit, onCancel }: DocumentFormProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [isPublished, setIsPublished] = useState(true)
    const [displayOrder, setDisplayOrder] = useState(0)
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isEditMode = !!document

    useEffect(() => {
        if (document) {
            setTitle(document.title || '')
            setDescription(document.description || '')
            setCategory(document.category || '')
            setIsPublished(document.isPublished ?? true)
            setDisplayOrder(document.displayOrder || 0)
        }
    }, [document])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        const validation = validateFileType(selectedFile)
        if (!validation.valid) {
            setError(validation.error || 'ไฟล์ไม่ถูกต้อง')
            setFile(null)
            e.target.value = ''
            return
        }

        setError('')
        setFile(selectedFile)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!title.trim()) {
            setError('กรุณากรอกชื่อเอกสาร')
            return
        }

        if (!category.trim()) {
            setError('กรุณาเลือกหมวดหมู่')
            return
        }

        if (!isEditMode && !file) {
            setError('กรุณาเลือกไฟล์')
            return
        }

        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('title', title.trim())
            formData.append('description', description.trim())
            formData.append('category', category.trim())
            formData.append('isPublished', String(isPublished))
            formData.append('displayOrder', String(displayOrder))

            if (file) {
                formData.append('file', file)
            }

            await onSubmit(formData)
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* ชื่อเอกสาร */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อเอกสาร <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="เช่น แบบฟอร์มใบลา"
                    required
                />
            </div>

            {/* คำอธิบาย */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    คำอธิบาย
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับเอกสาร..."
                />
            </div>

            {/* หมวดหมู่ */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                >
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    <option value="แบบฟอร์ม">แบบฟอร์ม</option>
                    <option value="ประกาศ">ประกาศ</option>
                    <option value="คู่มือ">คู่มือ</option>
                    <option value="ระเบียบ">ระเบียบ</option>
                    <option value="คำสั่ง">คำสั่ง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                </select>
            </div>

            {/* อัปโหลดไฟล์ */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    ไฟล์เอกสาร {!isEditMode && <span className="text-red-500">*</span>}
                </label>
                <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required={!isEditMode}
                />
                <p className="mt-2 text-sm text-gray-500">
                    รองรับไฟล์: PDF, DOC, DOCX, XLS, XLSX (ขนาดไม่เกิน 50MB)
                </p>
                {file && (
                    <p className="mt-2 text-sm text-green-600">
                        ✓ เลือกไฟล์: {file.name}
                    </p>
                )}
            </div>

            {/* ลำดับการแสดงผล */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    ลำดับการแสดงผล
                </label>
                <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="0"
                />
                <p className="mt-2 text-sm text-gray-500">
                    ตัวเลขน้อยจะแสดงก่อน (0 = แสดงก่อนสุด)
                </p>
            </div>

            {/* สถานะการเผยแพร่ */}
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="isPublished"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
                    เผยแพร่เอกสาร (ผู้ใช้ทั่วไปสามารถดาวน์โหลดได้)
                </label>
            </div>

            {/* ปุ่ม */}
            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มเอกสาร'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    ยกเลิก
                </button>
            </div>
        </form>
    )
}
