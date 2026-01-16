/**
 * DTO (Data Transfer Object) สำหรับ Unit
 * ใช้กรองข้อมูลก่อนส่งให้ client เพื่อเพิ่มความปลอดภัยและลดขนาด payload
 */

/**
 * แปลงข้อมูล Unit เป็น Public DTO
 */
export function toPublicDTO(unit) {
    if (!unit) return null

    const imageUrl = unit.image?.url || null

    return {
        _id: unit._id,
        name: unit.name,
        href: unit.href,
        imageUrl,
        image: imageUrl ? { url: imageUrl } : null,
        order: unit.order
    }
}

/**
 * แปลงข้อมูล Unit เป็น Admin DTO
 */
export function toAdminDTO(unit) {
    if (!unit) return null

    const imageUrl = unit.image?.url || null

    return {
        _id: unit._id,
        name: unit.name,
        href: unit.href,
        imageUrl,
        image: imageUrl ? { url: imageUrl } : null,
        order: unit.order,
        isPublished: unit.isPublished
    }
}

export function toPublicDTOList(units) {
    if (!Array.isArray(units)) return []
    return units.map(toPublicDTO).filter(Boolean)
}

export function toAdminDTOList(units) {
    if (!Array.isArray(units)) return []
    return units.map(toAdminDTO).filter(Boolean)
}
