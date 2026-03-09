import React, { useState, useEffect } from 'react'

type PRPlanUploadModalProps = {
    isOpen: boolean
    onClose: () => void
    onUpload: (title: string, description: string, file: File) => Promise<void>
    initialFile: File | null
}

export default function PRPlanUploadModal({ isOpen, onClose, onUpload, initialFile }: PRPlanUploadModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showModal, setShowModal] = useState(false)

    // Handle animations
    useEffect(() => {
        if (isOpen) {
            setShowModal(true)
            setFile(initialFile)
            setTitle(initialFile ? initialFile.name.replace(/\.[^/.]+$/, "") : '')
            setDescription('')
            setError(null)
            setIsSubmitting(false)
        } else {
            // Delay unmounting to allow exit animation to play
            const timer = setTimeout(() => setShowModal(false), 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen, initialFile])

    useEffect(() => {
        if (file && !title) {
            setTitle(file.name.replace(/\.[^/.]+$/, ""))
        }
    }, [file, title])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        if (selectedFile.type !== 'application/pdf') {
            setError('กรุณาเลือกไฟล์ PDF เท่านั้น')
            return
        }

        if (selectedFile.size > 20 * 1024 * 1024) {
            setError('ไฟล์มีขนาดใหญ่เกิน 20MB')
            return
        }

        setError(null)
        setFile(selectedFile)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!file) {
            setError('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด')
            return
        }

        if (!title.trim()) {
            setError('กรุณาระบุชื่อแผนปฏิบัติการ')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await onUpload(title.trim(), description.trim(), file)
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปโหลด')
            setIsSubmitting(false)
        }
    }

    // ขนาดไฟล์เป็นมนุษย์อ่าน
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    if (!showModal && !isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                onClick={!isSubmitting ? onClose : undefined}
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'
                    }`}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/40 z-10 transition-all duration-300 transform ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
                    }`}
            >
                {/* Elegant Header with Gradient */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-6 sm:p-8 border-b border-emerald-100">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-cloud-arrow-up text-emerald-600 justify-center items-center flex text-xl" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
                                    อัปโหลดแผนปฏิบัติการ
                                </h2>
                                <p className="text-emerald-700/80 text-sm mt-1 font-medium">
                                    เพิ่มเอกสาร P&P รูปแบบ PDF เข้าสู่ระบบ
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={!isSubmitting ? onClose : undefined}
                            disabled={isSubmitting}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                    {/* File Selection Area */}
                    <div className="space-y-4">
                        <label className="block text-sm font-semibold text-gray-900">
                            เอกสารที่เลือก <span className="text-red-500">*</span>
                        </label>

                        {file ? (
                            <div className="relative group overflow-hidden rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-4 transition-all hover:border-emerald-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-emerald-100">
                                        <i className="fa-solid fa-file-pdf text-red-500 text-2xl" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-emerald-600 mt-1 font-medium">
                                            {formatFileSize(file.size)} • พร้อมอัปโหลด
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFile(null)}
                                        disabled={isSubmitting}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                        title="ลบไฟล์นี้"
                                    >
                                        <i className="fa-solid fa-trash-can" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100/80 hover:border-emerald-300 transition-all group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="w-10 h-10 mb-3 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center group-hover:scale-110 group-hover:border-emerald-200 transition-transform">
                                        <i className="fa-solid fa-arrow-up-from-bracket text-gray-400 group-hover:text-emerald-500" />
                                    </div>
                                    <p className="mb-1 text-sm text-gray-700 font-medium">
                                        คลิกเพื่อเลือกไฟล์ PDF
                                    </p>
                                    <p className="text-xs text-gray-500">ขนาดไม่เกิน 20MB</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileChange}
                                    disabled={isSubmitting}
                                />
                            </label>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-5">
                        <div className="space-y-1.5 focus-within:text-emerald-600 transition-colors">
                            <label htmlFor="plan-title" className="block text-sm font-semibold text-gray-900 inherit">
                                ชื่อแผนปฏิบัติการ <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="plan-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={isSubmitting}
                                    placeholder="ระบุชื่อเรียกเอกสาร"
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 focus-within:text-emerald-600 transition-colors">
                            <label htmlFor="plan-desc" className="block text-sm font-semibold text-gray-900 inherit">
                                คำอธิบาย <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                            </label>
                            <textarea
                                id="plan-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="ระบุรายละเอียดเพิ่มเติมเกี่ยวกับแผนฯ ฉบับนี้..."
                                rows={3}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm resize-none disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {Boolean(error) && (
                        <div className="p-3 sm:p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 transition-all animate-fade-in">
                            <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5" />
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-all disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !file || !title.trim()}
                            className="flex-[2] px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg hover:shadow-emerald-500/25 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden group"
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fa-solid fa-circle-notch fa-spin" />
                                    <span>กำลังอัปโหลด...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-arrow-up-from-bracket group-hover:-translate-y-1 transition-transform" />
                                    <span>ยืนยันอัปโหลด</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
