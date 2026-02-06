/**
 * Data Transfer Objects สำหรับ PR Plan
 * กรองข้อมูลที่ส่งให้ client
 */

/**
 * DTO สำหรับผู้ใช้ทั่วไป - แสดงเฉพาะ PR Plans ที่เผยแพร่
 */
export function toPublicDTO(plan) {
    if (!plan) return null

    return {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        fileName: plan.file_name,
        mimeType: plan.mime_type,
        fileSize: plan.file_size,
        downloadCount: plan.download_count,
        displayOrder: plan.display_order,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
    }
}

/**
 * DTO สำหรับ Admin - แสดงข้อมูลเพิ่มเติม
 */
export function toAdminDTO(plan) {
    if (!plan) return null

    return {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        fileName: plan.file_name,
        mimeType: plan.mime_type,
        fileSize: plan.file_size,
        downloadCount: plan.download_count,
        isPublished: Boolean(plan.is_published),
        displayOrder: plan.display_order,
        createdBy: plan.created_by,
        updatedBy: plan.updated_by,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
    }
}

/**
 * แปลง array ของ PR Plans เป็น DTO
 */
export function toPublicDTOList(plans) {
    if (!Array.isArray(plans)) return []
    return plans.map(toPublicDTO).filter(Boolean)
}

export function toAdminDTOList(plans) {
    if (!Array.isArray(plans)) return []
    return plans.map(toAdminDTO).filter(Boolean)
}
