import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { validateFileType, formatFileSize } from '../../utils/documentHelpers'
import type { Document } from '../ITCenterManagement'

interface ITDocumentFormProps {
    document?: Document | null
    pendingFile?: File | null
    onSubmit: (data: FormData) => Promise<void>
    onCancel: () => void
}

const IT_CATEGORIES = [
    'Cybersecurity',
    'ระเบียบการใช้งานระบบสารสนเทศ',
    'ระบบประเมินมาตรฐานระบบบริการสุขภาพ',
    'ระบบประเมินโรงพยาบาลอัจฉริยะ (Smart hospital)',
    'คู่มือระบบสารสนเทศ'
]

export default function ITDocumentForm({ document, pendingFile, onSubmit, onCancel }: ITDocumentFormProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [isPublished, setIsPublished] = useState(true)
    const [displayOrder, setDisplayOrder] = useState(0)
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const titleRef = useRef<HTMLInputElement>(null)

    const isEditMode = !!document

    useEffect(() => {
        if (document) {
            setTitle(document.title || '')
            setDescription(document.description || '')
            setCategory(document.category || '')
            setIsPublished(document.isPublished ?? true)
            setDisplayOrder(document.displayOrder || 0)
        } else if (pendingFile) {
            setFile(pendingFile)
            // Auto-fill title from filename without extension
            const nameWithoutExt = pendingFile.name.replace(/\.[^/.]+$/, "")
            setTitle(nameWithoutExt)
        }
    }, [document, pendingFile])

    useEffect(() => {
        const t = setTimeout(() => titleRef.current?.focus(), 150)
        return () => clearTimeout(t)
    }, [])

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        window.document.addEventListener('keydown', onKey)
        return () => window.document.removeEventListener('keydown', onKey)
    }, [onCancel])

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

        // Auto-fill title if empty
        if (!title.trim()) {
            const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "")
            setTitle(nameWithoutExt)
        }
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

        // Removed mandatory file check to allow adding topic only

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

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />

            {/* Modal Card */}
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                                <i className={`fa-solid ${isEditMode ? 'fa-pen-to-square' : 'fa-cloud-arrow-up'} text-white text-lg`} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg leading-tight">
                                    {isEditMode ? 'แก้ไขข้อมูล' : 'เพิ่มรายการใหม่'}
                                </h3>
                                <p className="text-emerald-100 text-xs mt-0.5">
                                    {isEditMode ? 'ปรับปรุงรายละเอียดของเอกสาร' : 'สามารถเพิ่มเฉพาะหัวข้อก่อนแล้วค่อยแนบไฟล์ภายหลังได้'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onCancel}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <i className="fa-solid fa-circle-exclamation text-red-500" />
                            {error}
                        </div>
                    )}

                    {/* File Selection (Show only if not edit mode and no pending file) */}
                    {isEditMode ? (
                        <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <i className="fa-solid fa-file-pdf text-blue-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">เอกสารปัจจุบัน</p>
                                <p className="text-sm font-semibold text-gray-800 truncate">{document?.fileName}</p>
                            </div>
                            <label className="cursor-pointer bg-white border border-blue-200 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                                เปลี่ยนไฟล์
                                <input type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
                            </label>
                        </div>
                    ) : (
                        <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <i className="fa-solid fa-file-pdf text-emerald-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">ไฟล์เอกสาร</p>
                                <p className={`text-sm font-semibold truncate ${file ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                                    {file?.name || 'ยังไม่มีไฟล์ (แนบภายหลังได้)'}
                                </p>
                                {file && <p className="text-[10px] text-gray-400">{formatFileSize(file.size)}</p>}
                            </div>
                            {!pendingFile && (
                                <label className="cursor-pointer bg-white border border-emerald-200 text-emerald-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                                    {file ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์'}
                                    <input type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
                                </label>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                ชื่อเอกสาร <span className="text-red-500">*</span>
                            </label>
                            <input
                                ref={titleRef}
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all outline-none text-sm text-gray-800"
                                placeholder="ระบุชื่อที่จะแสดงบนเว็บไซต์"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                หมวดหมู่ <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all outline-none text-sm text-gray-800 cursor-pointer"
                                required
                            >
                                <option value="">-- เลือกหมวดหมู่ --</option>
                                {IT_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                ลำดับการแสดงผล
                            </label>
                            <input
                                type="number"
                                value={displayOrder}
                                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all outline-none text-sm text-gray-800 font-mono"
                                min="0"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                คำอธิบาย <span className="text-gray-400 font-normal text-xs">(หากมี)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all outline-none text-sm text-gray-800 resize-none"
                                placeholder="รายละเอียดเพิ่มเติมสั้นๆ..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="modalIsPublished"
                                checked={isPublished}
                                onChange={(e) => setIsPublished(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </div>
                        <label htmlFor="modalIsPublished" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                            เปิดการเผยแพร่ทันที
                        </label>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
                            {isEditMode ? 'บันทึกการแก้ไข' : (file ? 'ยืนยันการอัปโหลด' : 'บันทึกหัวข้อข้อมูล')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        window.document.body
    )
}
