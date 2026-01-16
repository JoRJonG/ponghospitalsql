/**
 * DTO (Data Transfer Object) สำหรับ Activity
 * ใช้กรองข้อมูลก่อนส่งให้ client เพื่อเพิ่มความปลอดภัยและลดขนาด payload
 */

/**
 * แปลงข้อมูล Activity เป็น Public DTO
 */
export function toPublicDTO(activity) {
    if (!activity) return null

    return {
        _id: activity._id,
        title: activity.title,
        description: activity.description,
        date: activity.date,
        publishedAt: activity.publishedAt,
        // รักษา structure เดิมของ images
        images: activity.images?.map(img => ({
            _id: img._id,
            url: img.url
        })) || [],
        viewCount: activity.viewCount || 0
    }
}

/**
 * แปลงข้อมูล Activity เป็น Admin DTO
 */
export function toAdminDTO(activity) {
    if (!activity) return null

    return {
        _id: activity._id,
        title: activity.title,
        description: activity.description,
        date: activity.date,
        publishedAt: activity.publishedAt,
        isPublished: activity.isPublished,
        // รักษา structure เดิมของ images
        images: activity.images?.map(img => ({
            _id: img._id,
            url: img.url
        })) || [],
        viewCount: activity.viewCount || 0
    }
}

export function toPublicDTOList(activities) {
    if (!Array.isArray(activities)) return []
    return activities.map(toPublicDTO).filter(Boolean)
}

export function toAdminDTOList(activities) {
    if (!Array.isArray(activities)) return []
    return activities.map(toAdminDTO).filter(Boolean)
}
