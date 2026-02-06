/**
 * DTO (Data Transfer Object) สำหรับ Executive
 * ใช้กรองข้อมูลก่อนส่งให้ client เพื่อเพิ่มความปลอดภัยและลดขนาด payload
 */

/**
 * แปลงข้อมูล Executive เป็น Public DTO
 */
export function toPublicDTO(executive) {
    if (!executive) return null

    return {
        _id: executive._id,
        name: executive.name,
        position: executive.position,
        phone: executive.phone,
        imageUrl: executive.imageUrl,
        displayOrder: executive.displayOrder,
        updatedAt: executive.updatedAt
    }
}

/**
 * แปลงข้อมูล Executive เป็น Admin DTO
 */
export function toAdminDTO(executive) {
    if (!executive) return null

    return {
        _id: executive._id,
        name: executive.name,
        position: executive.position,
        phone: executive.phone,
        imageUrl: executive.imageUrl,
        displayOrder: executive.displayOrder,
        isPublished: executive.isPublished,
        createdAt: executive.createdAt,
        updatedAt: executive.updatedAt
    }
}

export function toPublicDTOList(executives) {
    if (!Array.isArray(executives)) return []
    return executives.map(toPublicDTO).filter(Boolean)
}

export function toAdminDTOList(executives) {
    if (!Array.isArray(executives)) return []
    return executives.map(toAdminDTO).filter(Boolean)
}
