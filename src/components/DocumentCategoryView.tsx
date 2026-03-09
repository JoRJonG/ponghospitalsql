import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

type Document = {
    _id: string
    id?: number
    title: string
    category: string
    filePath: string
    fileName: string
    fileSize: number
    downloadCount: number
    createdAt: string
    isPublished: boolean
}

type Props = {
    title: string
    category: string
    apiEndpoint?: string
}

export default function DocumentCategoryView({ title, category, apiEndpoint = '/api/documents' }: Props) {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchDocuments = async () => {
            setLoading(true)
            try {
                const url = `${apiEndpoint}?category=${encodeURIComponent(category)}&limit=100`
                const res = await fetch(url)
                if (!res.ok) throw new Error('Failed to fetch documents')
                const data = await res.json()
                setDocuments(data.documents || [])
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setLoading(false)
            }
        }

        fetchDocuments()
    }, [category, apiEndpoint])

    const handleDownload = async (doc: Document) => {
        try {
            const baseEndpoint = apiEndpoint.split('?')[0] // Remove query params if any
            window.open(`${baseEndpoint}/download/${doc._id || doc.id}`, '_blank')
        } catch (error) {
            console.error('Download failed:', error)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Refined PageHeader replacement locally for seamless integration */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-8 border border-emerald-100/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <i className="fa-solid fa-file-pdf text-8xl text-emerald-600"></i>
                </div>
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {title}
                    </h1>
                    <div className="w-16 h-1 bg-emerald-500 rounded-full mt-4"></div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
                        <p>กำลังโหลดข้อมูล...</p>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">
                        <i className="fa-solid fa-exclamation-circle text-2xl mb-2"></i>
                        <p>{error}</p>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-folder-open text-2xl text-gray-400"></i>
                        </div>
                        <p className="text-lg">ยังไม่มีเอกสารในหมวดหมู่นี้</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {documents.map((doc, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={doc._id}
                                className="p-4 md:p-6 hover:bg-emerald-50/30 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group"
                            >
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100 group-hover:scale-105 transition-transform">
                                        <i className="fa-solid fa-file-pdf text-xl"></i>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors line-clamp-2">
                                            {doc.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <i className="fa-regular fa-calendar"></i>
                                                {formatDate(doc.createdAt)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <i className="fa-solid fa-hard-drive"></i>
                                                {formatFileSize(doc.fileSize)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <i className="fa-solid fa-download"></i>
                                                {doc.downloadCount} ดาวน์โหลด
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDownload(doc)}
                                    className="w-full md:w-auto mt-2 md:mt-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all duration-300 font-medium whitespace-nowrap"
                                >
                                    <i className="fa-solid fa-cloud-arrow-down"></i>
                                    ดาวน์โหลด
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
