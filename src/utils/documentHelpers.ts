/**
 * Helper functions สำหรับจัดการเอกสาร
 */

/**
 * แปลงขนาดไฟล์จาก bytes เป็น KB/MB
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * ดึง icon ตามประเภทไฟล์
 */
export function getFileIcon(mimeType?: string | null): string {
    if (!mimeType) return '📄' // Default for no file
    if (mimeType.includes('pdf')) {
        return '📄' // PDF
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
        return '📝' // Word
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
        return '📊' // Excel
    }
    return '📎' // Default
}

/**
 * ตรวจสอบประเภทไฟล์ที่อนุญาต
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        return {
            valid: false,
            error: 'ประเภทไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์ PDF, DOC, DOCX, XLS หรือ XLSX เท่านั้น'
        }
    }

    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'ขนาดไฟล์เกิน 50MB กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่า'
        }
    }

    return { valid: true }
}

/**
 * ดาวน์โหลดเอกสาร
 */
export async function downloadDocument(id: number, filename: string): Promise<void> {
    try {
        const response = await fetch(`/api/documents/${id}/download`)

        if (!response.ok) {
            throw new Error('ไม่สามารถดาวน์โหลดไฟล์ได้')
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    } catch (error) {
        console.error('Download error:', error)
        throw error
    }
}

/**
 * ดึงสีตามหมวดหมู่
 */
export function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        'แบบฟอร์ม': 'bg-blue-100 text-blue-800',
        'ประกาศ': 'bg-green-100 text-green-800',
        'คู่มือ': 'bg-purple-100 text-purple-800',
        'ระเบียบ': 'bg-yellow-100 text-yellow-800',
        'คำสั่ง': 'bg-red-100 text-red-800',
        'อื่นๆ': 'bg-gray-100 text-gray-800'
    }

    return colors[category] || 'bg-gray-100 text-gray-800'
}
