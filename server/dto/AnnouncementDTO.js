/**
 * DTO (Data Transfer Object) สำหรับ Announcement
 * ใช้กรองข้อมูลก่อนส่งให้ client เพื่อเพิ่มความปลอดภัยและลดขนาด payload
 */

/**
 * แปลงข้อมูล Announcement เป็น Public DTO
 */
export function toPublicDTO(announcement) {
    if (!announcement) return null

    return {
        _id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        categoryCode: announcement.categoryCode,
        publishedAt: announcement.publishedAt,
        // กรอง attachments - ส่งเฉพาะ id, url, kind
        attachments: announcement.attachments?.map(att => ({
            id: att.id,
            url: att.url,
            kind: att.kind
        })) || [],
        viewCount: announcement.viewCount || 0,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
    }
}

/**
 * แปลงข้อมูล Announcement เป็น Admin DTO
 */
export function toAdminDTO(announcement) {
    if (!announcement) return null

    return {
        _id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        categoryCode: announcement.categoryCode,
        publishedAt: announcement.publishedAt,
        isPublished: announcement.isPublished,
        // กรอง attachments - ส่งเฉพาะ id, url, kind, name
        attachments: announcement.attachments?.map(att => ({
            id: att.id,
            url: att.url,
            kind: att.kind,
            name: att.name
        })) || [],
        viewCount: announcement.viewCount || 0,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
    }
}

export function toPublicDTOList(announcements) {
    if (!Array.isArray(announcements)) return []
    return announcements.map(toPublicDTO).filter(Boolean)
}

export function toAdminDTOList(announcements) {
    if (!Array.isArray(announcements)) return []
    return announcements.map(toAdminDTO).filter(Boolean)
}
