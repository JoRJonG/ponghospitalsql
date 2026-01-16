/**
 * DTO (Data Transfer Object) สำหรับ Infographic
 * ใช้กรองข้อมูลก่อนส่งให้ client เพื่อเพิ่มความปลอดภัยและลดขนาด payload
 */

/**
 * แปลงข้อมูล Infographic เป็น Public DTO
 */
export function toPublicDTO(infographic) {
    if (!infographic) return null

    const imageUrl = infographic.image?.url || null

    return {
        _id: infographic._id,
        title: infographic.title,
        description: infographic.description,
        imageUrl,
        image: imageUrl ? { url: imageUrl } : null,
        order: infographic.order
    }
}

/**
 * แปลงข้อมูล Infographic เป็น Admin DTO
 */
export function toAdminDTO(infographic) {
    if (!infographic) return null

    const imageUrl = infographic.image?.url || null

    return {
        _id: infographic._id,
        title: infographic.title,
        description: infographic.description,
        imageUrl,
        image: imageUrl ? { url: imageUrl } : null,
        order: infographic.order,
        isPublished: infographic.isPublished
    }
}

export function toPublicDTOList(infographics) {
    if (!Array.isArray(infographics)) return []
    return infographics.map(toPublicDTO).filter(Boolean)
}

export function toAdminDTOList(infographics) {
    if (!Array.isArray(infographics)) return []
    return infographics.map(toAdminDTO).filter(Boolean)
}
