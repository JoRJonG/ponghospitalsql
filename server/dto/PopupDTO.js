/**
 * DTO (Data Transfer Object) สำหรับ Popup
 * ใช้กรองข้อมูลก่อนส่งให้ client เพื่อเพิ่มความปลอดภัยและลดขนาด payload
 */

/**
 * แปลงข้อมูล Popup เป็น Public DTO
 * ใช้สำหรับ public endpoints เช่น /api/popups/active
 * 
 * @param {Object} popup - ข้อมูล popup จาก Model
 * @returns {Object} DTO สำหรับ public
 */
export function toPublicDTO(popup) {
    if (!popup) return null

    // รวม imageUrl จาก image.url หรือ imageUrl field
    const imageUrl = popup.image?.url || popup.imageUrl || null

    return {
        id: popup.id,
        title: popup.title,
        body: popup.body,
        dismissForDays: popup.dismissForDays,
        ctaLabel: popup.ctaLabel,
        ctaUrl: popup.ctaUrl,
        imageUrl
    }
}

/**
 * แปลงข้อมูล Popup เป็น Admin DTO
 * ใช้สำหรับ admin endpoints เช่น /api/popups
 * 
 * @param {Object} popup - ข้อมูล popup จาก Model
 * @returns {Object} DTO สำหรับ admin
 */
export function toAdminDTO(popup) {
    if (!popup) return null

    // รวม imageUrl จาก image.url หรือ imageUrl field
    const imageUrl = popup.image?.url || popup.imageUrl || null
    const hasImage = Boolean(popup.image)

    return {
        id: popup.id,
        title: popup.title,
        body: popup.body,
        startAt: popup.startAt,
        endAt: popup.endAt,
        dismissForDays: popup.dismissForDays,
        isActive: popup.isActive,
        ctaLabel: popup.ctaLabel,
        ctaUrl: popup.ctaUrl,
        imageUrl,
        hasImage
    }
}

/**
 * แปลง array ของ popups เป็น Public DTO
 * 
 * @param {Array} popups - array ของ popup objects
 * @returns {Array} array ของ public DTOs
 */
export function toPublicDTOList(popups) {
    if (!Array.isArray(popups)) return []
    return popups.map(toPublicDTO).filter(Boolean)
}

/**
 * แปลง array ของ popups เป็น Admin DTO
 * 
 * @param {Array} popups - array ของ popup objects
 * @returns {Array} array ของ admin DTOs
 */
export function toAdminDTOList(popups) {
    if (!Array.isArray(popups)) return []
    return popups.map(toAdminDTO).filter(Boolean)
}
