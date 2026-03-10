import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Swal from 'sweetalert2'
import PRPlanManagement from './PRPlanManagement'
import { useAuth } from '../../auth/AuthContext'

// ─── Types ─────────────────────────────────────────────────────────────────────
type LegalEthicsDoc = {
    id: number
    title: string
    description: string
    category: string
    fileName: string
    fileSize: number
    downloadCount: number
    isPublished: boolean
    displayOrder: number
    createdAt: string
    updatedAt: string
}

export type LegalEthicsManagementHandle = { refresh: () => void }
type InnerTab = 'legalEthics' | 'prPlan'

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
    'กฏหมายที่เกี่ยวข้องกับการดำเนินงานหรือการปฏิบัติงานของหน่วยงาน',
    'พระราชบัญญัติมาตรฐานทางจริยธรรม พ.ศ.2562',
    'ประมวลจริยธรรมข้าราชการพลเรือน',
    'ข้อกำหนดจริยธรรมเจ้าหน้าที่ของรัฐสำนักงานปลัดกระทรวงสาธารณสุข พ.ศ. 2564',
]

const CATEGORY_META: Record<string, { color: string; short: string; icon: string }> = {
    'กฏหมายที่เกี่ยวข้องกับการดำเนินงานหรือการปฏิบัติงานของหน่วยงาน':
        { color: 'bg-blue-50 text-blue-700 border-blue-200', short: 'กฎหมายองค์กร', icon: '🏛️' },
    'พระราชบัญญัติมาตรฐานทางจริยธรรม พ.ศ.2562':
        { color: 'bg-violet-50 text-violet-700 border-violet-200', short: 'พ.ร.บ.จริยธรรม', icon: '📜' },
    'ประมวลจริยธรรมข้าราชการพลเรือน':
        { color: 'bg-amber-50 text-amber-700 border-amber-200', short: 'ประมวลจริยธรรม', icon: '📋' },
    'ข้อกำหนดจริยธรรมเจ้าหน้าที่ของรัฐสำนักงานปลัดกระทรวงสาธารณสุข พ.ศ. 2564':
        { color: 'bg-teal-50 text-teal-700 border-teal-200', short: 'สป.สธ. 2564', icon: '🏥' },
}

function getCategoryMeta(cat: string) {
    return CATEGORY_META[cat] ?? { color: 'bg-gray-100 text-gray-600 border-gray-200', short: cat, icon: '📄' }
}

function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024; const sz = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sz[i]}`
}

// ─── Upload / Edit Modal ────────────────────────────────────────────────────────
type ModalMode = 'upload' | 'edit'

interface DocModalProps {
    mode: ModalMode
    /** upload mode: pending file; edit mode: existing doc */
    file?: File
    doc?: LegalEthicsDoc
    onClose: () => void
    onSuccess: () => void
}

function DocModal({ mode, file, doc, onClose, onSuccess }: DocModalProps) {
    const { getToken } = useAuth()
    const [category, setCategory] = useState(doc?.category ?? '')
    const [title, setTitle] = useState(doc?.title ?? file?.name.replace('.pdf', '') ?? '')
    const [description, setDescription] = useState(doc?.description ?? '')
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<{ category?: string; title?: string }>({})
    const titleRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Focus title on open
        const t = setTimeout(() => titleRef.current?.focus(), 80)
        return () => clearTimeout(t)
    }, [])

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    const validate = () => {
        const e: typeof errors = {}
        if (!category) e.category = 'กรุณาเลือกหมวดหมู่'
        if (!title.trim()) e.title = 'กรุณาระบุชื่อเอกสาร'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setSubmitting(true)

        // AbortController สำหรับ timeout 5 นาที (รองรับไฟล์ขนาดใหญ่ถึง 20MB)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)

        try {
            const fd = new FormData()
            fd.append('category', category)
            fd.append('title', title.trim())
            fd.append('description', description)

            // Helper อ่าน server error message จาก response
            const readError = async (r: Response, fallback: string) => {
                try {
                    const data = await r.json()
                    return data?.error || data?.message || fallback
                } catch {
                    return fallback
                }
            }

            if (mode === 'upload' && file) {
                fd.append('file', file)
                fd.append('isPublished', 'true')
                const r = await fetch('/api/legal-ethics', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${getToken()}` },
                    body: fd,
                    signal: controller.signal,
                })
                if (!r.ok) {
                    const msg = await readError(r, `อัปโหลดไม่สำเร็จ (${r.status})`)
                    throw new Error(msg)
                }
            } else if (mode === 'edit' && doc) {
                const r = await fetch(`/api/legal-ethics/${doc.id}`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${getToken()}` },
                    body: fd,
                    signal: controller.signal,
                })
                if (!r.ok) {
                    const msg = await readError(r, `บันทึกไม่สำเร็จ (${r.status})`)
                    throw new Error(msg)
                }
            }
            onSuccess()
            onClose()
        } catch (err: unknown) {
            // ตรวจสอบกรณี timeout (AbortError)
            if (err instanceof Error && err.name === 'AbortError') {
                setErrors({ title: 'การอัปโหลดใช้เวลานานเกินไป กรุณาลองใหม่ด้วยไฟล์ที่เล็กกว่า' })
            } else {
                setErrors({ title: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
            }
        } finally {
            clearTimeout(timeoutId)
            setSubmitting(false)
        }
    }

    // Portal — render above everything
    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

            {/* Modal Card */}
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                                {mode === 'upload'
                                    ? <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    : <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                }
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base leading-tight">
                                    {mode === 'upload' ? 'เพิ่มเอกสารใหม่' : 'แก้ไขข้อมูลเอกสาร'}
                                </h3>
                                <p className="text-emerald-100 text-xs mt-0.5">
                                    {mode === 'upload' ? 'กรอกข้อมูลเพื่อจัดหมวดหมู่เอกสาร' : 'แก้ไขข้อมูลเมตาเดตาของเอกสาร'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* File preview strip (upload only) */}
                {mode === 'upload' && file && (
                    <div className="flex items-center gap-3 mx-6 mt-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                        <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-5">

                    {/* Category selector — card-style */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                            หมวดหมู่ <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {CATEGORIES.map(cat => {
                                const meta = getCategoryMeta(cat)
                                const selected = category === cat
                                return (
                                    <label
                                        key={cat}
                                        className={`relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150
                                            ${selected
                                                ? 'border-emerald-400 bg-emerald-50 shadow-sm shadow-emerald-100'
                                                : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/80'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="category"
                                            value={cat}
                                            checked={selected}
                                            onChange={() => { setCategory(cat); setErrors(p => ({ ...p, category: undefined })) }}
                                            className="sr-only"
                                        />
                                        <span className="text-lg leading-none flex-shrink-0">{meta.icon}</span>
                                        <span className="text-sm text-gray-700 leading-snug flex-1">{cat}</span>
                                        {/* Checkmark */}
                                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                            ${selected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-white'}`}>
                                            {selected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>
                        {errors.category && (
                            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {errors.category}
                            </p>
                        )}
                    </div>

                    {/* Title input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            ชื่อเอกสาร <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={titleRef}
                            type="text"
                            value={title}
                            onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: undefined })) }}
                            placeholder="ระบุชื่อเอกสารที่ต้องการแสดงบนเว็บไซต์"
                            className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-800 placeholder-gray-400 transition-all duration-150 outline-none
                                ${errors.title
                                    ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200'
                                    : 'border-gray-200 bg-gray-50 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100'
                                }`}
                        />
                        {errors.title && (
                            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {errors.title}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            คำอธิบาย <span className="text-gray-400 font-normal text-xs">(ไม่บังคับ)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            placeholder="รายละเอียดเพิ่มเติม เช่น ปีที่บังคับใช้ หน่วยงานที่ออก"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 resize-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-150"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-semibold shadow-sm shadow-emerald-200 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting
                                ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>กำลังบันทึก...</>
                                : mode === 'upload' ? 'อัปโหลดเอกสาร' : 'บันทึกการแก้ไข'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

// ─── Legal Ethics Documents Panel ──────────────────────────────────────────────
function LegalEthicsDocs() {
    const { getToken } = useAuth()
    const [docs, setDocs] = useState<LegalEthicsDoc[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterCategory, setFilterCategory] = useState<string>('ทั้งหมด')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const limit = 20

    // Modal state
    const [modal, setModal] = useState<
        | { mode: 'upload'; file: File }
        | { mode: 'edit'; doc: LegalEthicsDoc }
        | null
    >(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchDocs = useCallback(async () => {
        try {
            setLoading(true)
            const catQ = filterCategory !== 'ทั้งหมด' ? `&category=${encodeURIComponent(filterCategory)}` : ''
            const res = await fetch(`/api/legal-ethics?page=${page}&limit=${limit}${catQ}&published=all`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
            const data = await res.json()
            setDocs(data.data || [])
            setTotalPages(data.pagination?.totalPages || 1)
            setTotalCount(data.pagination?.total || data.data?.length || 0)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
        } finally {
            setLoading(false)
        }
    }, [page, limit, filterCategory])

    useEffect(() => { fetchDocs() }, [fetchDocs])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        if (file.type !== 'application/pdf') {
            Swal.fire({ icon: 'warning', title: 'ไฟล์ไม่ถูกต้อง', text: 'กรุณาเลือกไฟล์ PDF เท่านั้น', confirmButtonColor: '#059669' })
            return
        }
        if (file.size > 20 * 1024 * 1024) {
            Swal.fire({ icon: 'warning', title: 'ไฟล์ใหญ่เกินไป', text: 'ขนาดไฟล์ต้องไม่เกิน 20 MB', confirmButtonColor: '#059669' })
            return
        }
        setModal({ mode: 'upload', file })
    }

    const handleDelete = async (id: number) => {
        const r = await Swal.fire({
            title: 'ลบเอกสารนี้?',
            text: 'การดำเนินนี้ไม่สามารถกู้คืนได้',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ยืนยันการลบ',
            cancelButtonText: 'ยกเลิก',
        })
        if (!r.isConfirmed) return
        try {
            const res = await fetch(`/api/legal-ethics/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } })
            if (!res.ok) throw new Error()
            await fetchDocs()
        } catch { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบข้อมูลได้', confirmButtonColor: '#059669' }) }
    }

    const togglePublish = async (doc: LegalEthicsDoc) => {
        try {
            const fd = new FormData(); fd.append('isPublished', String(!doc.isPublished))
            const r = await fetch(`/api/legal-ethics/${doc.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${getToken()}` }, body: fd })
            if (!r.ok) throw new Error()
            setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, isPublished: !d.isPublished } : d))
        } catch { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเปลี่ยนสถานะได้', confirmButtonColor: '#059669' }) }
    }

    return (
        <div className="space-y-4">
            {/* Modal */}
            {modal?.mode === 'upload' && (
                <DocModal
                    mode="upload"
                    file={modal.file}
                    onClose={() => setModal(null)}
                    onSuccess={() => { fetchDocs(); Swal.fire({ icon: 'success', title: 'อัปโหลดสำเร็จ', timer: 1400, showConfirmButton: false }) }}
                />
            )}
            {modal?.mode === 'edit' && (
                <DocModal
                    mode="edit"
                    doc={modal.doc}
                    onClose={() => setModal(null)}
                    onSuccess={() => { fetchDocs(); Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1400, showConfirmButton: false }) }}
                />
            )}

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="application/pdf" className="sr-only" onChange={handleFileSelect} />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">กรอง:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {['ทั้งหมด', ...CATEGORIES].map(cat => {
                            const active = filterCategory === cat
                            const meta = cat === 'ทั้งหมด'
                                ? { color: 'bg-gray-200 text-gray-700 border-gray-300', short: 'ทั้งหมด' }
                                : getCategoryMeta(cat)
                            return (
                                <button
                                    key={cat}
                                    onClick={() => { setFilterCategory(cat); setPage(1) }}
                                    title={cat}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all duration-150
                                        ${active
                                            ? `${meta.color} ring-2 ring-offset-1 ring-emerald-400 scale-105 shadow-sm`
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}
                                >
                                    {meta.short}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm shadow-emerald-200 transition-all duration-150 flex-shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    อัปโหลด PDF
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        เอกสารทั้งหมด {!loading && <strong className="text-gray-700 ml-1">{totalCount} รายการ</strong>}
                    </span>
                    {loading && <span className="text-xs text-emerald-600 flex items-center gap-1.5"><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>กำลังโหลด</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest w-10">#</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">ชื่อเอกสาร</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">หมวดหมู่</th>
                                <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-widest">ขนาด</th>
                                <th className="px-3 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-widest">สถานะ</th>
                                <th className="px-5 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-widest">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-300">
                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <p className="text-sm text-gray-400">ยังไม่มีเอกสารในหมวดหมู่นี้</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : docs.map((doc, idx) => {
                                const meta = getCategoryMeta(doc.category)
                                return (
                                    <tr key={doc.id} className="group border-b border-gray-50 hover:bg-emerald-50/40 transition-colors duration-100">
                                        <td className="px-5 py-3.5 text-xs text-gray-300 tabular-nums font-mono">{(page - 1) * limit + idx + 1}</td>
                                        <td className="px-3 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 truncate max-w-[260px]" title={doc.title}>{doc.title}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{new Date(doc.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${meta.color}`} title={doc.category}>
                                                <span className="text-[10px]">{meta.icon}</span>
                                                {meta.short}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3.5 text-right text-xs text-gray-400 tabular-nums font-mono">{formatFileSize(doc.fileSize)}</td>
                                        <td className="px-3 py-3.5 text-center">
                                            <button
                                                onClick={() => togglePublish(doc)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150
                                                    ${doc.isPublished
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${doc.isPublished ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                {doc.isPublished ? 'เผยแพร่' : 'ซ่อน'}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setModal({ mode: 'edit', doc })} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all" title="แก้ไข">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={() => handleDelete(doc.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all" title="ลบ">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                        <span className="text-xs text-gray-400">หน้า <strong className="text-gray-700">{page}</strong> / {totalPages}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">‹ ก่อนหน้า</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">ถัดไป ›</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────────────────
const LegalEthicsManagement = forwardRef<LegalEthicsManagementHandle>((_, ref) => {
    const [activeTab, setActiveTab] = useState<InnerTab>('legalEthics')
    useImperativeHandle(ref, () => ({ refresh: () => { } }))

    const TABS: { id: InnerTab; label: string; sublabel: string; icon: string }[] = [
        { id: 'legalEthics', label: 'กฎหมายและจริยธรรม', sublabel: 'เอกสาร PDF กฎหมาย พรบ. และจริยธรรม', icon: '⚖️' },
        { id: 'prPlan', label: 'แผนปฏิบัติการ', sublabel: 'ป้องกัน ปราบปราม การทุจริต', icon: '🛡️' },
    ]

    return (
        <div className="space-y-5">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 p-6 shadow-sm">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #059669 0%, transparent 60%), radial-gradient(circle at 80% 20%, #0d9488 0%, transparent 60%)' }} />
                <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.02]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #059669 0, #059669 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
                <div className="relative flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">⚖️</span>
                    </div>
                    <div>
                        <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-1">ระบบจัดการเอกสาร</p>
                        <h2 className="text-gray-900 text-xl font-bold">กฎหมาย จริยธรรม และแผนปฏิบัติการ</h2>
                        <p className="text-gray-500 text-sm mt-1.5 leading-relaxed font-medium">อัปโหลด แก้ไข และจัดการเอกสารสำหรับการเผยแพร่ข้อมูลบนเว็บไซต์</p>
                    </div>
                </div>
            </div>

            {/* Tab Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex-1 relative flex flex-col sm:flex-row items-center sm:items-start gap-2 px-5 py-4 text-left transition-all duration-200
                                ${activeTab === t.id ? 'bg-white text-emerald-700' : 'bg-gray-50/60 text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                        >
                            <span className="text-xl leading-none flex-shrink-0">{t.icon}</span>
                            <div>
                                <p className="text-sm font-bold leading-tight">{t.label}</p>
                                <p className="text-[11px] text-gray-400 leading-snug hidden sm:block">{t.sublabel}</p>
                            </div>
                            {activeTab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-full" />}
                        </button>
                    ))}
                </div>
                <div className="p-5 sm:p-6">
                    {activeTab === 'legalEthics' ? <LegalEthicsDocs /> : <PRPlanManagement />}
                </div>
            </div>
        </div>
    )
})

LegalEthicsManagement.displayName = 'LegalEthicsManagement'
export default LegalEthicsManagement
