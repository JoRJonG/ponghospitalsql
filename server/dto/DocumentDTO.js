/**
 * Data Transfer Objects สำหรับ Document
 * กรองข้อมูลที่ส่งให้ client (ไม่ส่ง file_data ที่เป็น BLOB)
 */

/**
 * DTO สำหรับผู้ใช้ทั่วไป - แสดงเฉพาะเอกสารที่เผยแพร่
 */
export function toPublicDTO(doc) {
    if (!doc) return null

    return {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        fileName: doc.file_name,
        mimeType: doc.mime_type,
        fileSize: doc.file_size,
        downloadCount: doc.download_count,
        displayOrder: doc.display_order,
        createdAt: doc.created_at,
    }
}

/**
 * DTO สำหรับ Admin - แสดงข้อมูลเพิ่มเติม
 */
export function toAdminDTO(doc) {
    if (!doc) return null

    return {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        fileName: doc.file_name,
        mimeType: doc.mime_type,
        fileSize: doc.file_size,
        downloadCount: doc.download_count,
        isPublished: Boolean(doc.is_published),
        displayOrder: doc.display_order,
        createdBy: doc.created_by,
        updatedBy: doc.updated_by,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
    }
}

/**
 * แปลง array ของ documents เป็น DTO
 */
export function toPublicDTOList(docs) {
    if (!Array.isArray(docs)) return []
    return docs.map(toPublicDTO).filter(Boolean)
}

export function toAdminDTOList(docs) {
    if (!Array.isArray(docs)) return []
    return docs.map(toAdminDTO).filter(Boolean)
}
