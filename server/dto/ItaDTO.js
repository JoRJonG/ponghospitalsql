/**
 * DTO (Data Transfer Object) สำหรับ ITA (Information Technology Accessibility)
 * ใช้กรองข้อมูลก่อนส่งให้ client เพื่อเพิ่มความปลอดภัยและลดขนาด payload
 */

/**
 * แปลงข้อมูล ITA เป็น Public DTO
 */
export function toPublicDTO(ita) {
    if (!ita) return null

    return {
        _id: ita._id,
        title: ita.title,
        url: ita.url,
        order: ita.order
    }
}

/**
 * แปลงข้อมูล ITA เป็น Admin DTO
 */
export function toAdminDTO(ita) {
    if (!ita) return null

    return {
        _id: ita._id,
        title: ita.title,
        url: ita.url,
        order: ita.order,
        isPublished: ita.isPublished
    }
}

export function toPublicDTOList(itaItems) {
    if (!Array.isArray(itaItems)) return []
    return itaItems.map(toPublicDTO).filter(Boolean)
}

export function toAdminDTOList(itaItems) {
    if (!Array.isArray(itaItems)) return []
    return itaItems.map(toAdminDTO).filter(Boolean)
}
