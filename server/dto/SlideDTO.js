/**
 * DTO (Data Transfer Object) สำหรับ Slide
 * ใช้กรองข้อมูลก่อนส่งให้ client เพื่อเพิ่มความปลอดภัยและลดขนาด payload
 */

/**
 * แปลงข้อมูล Slide เป็น Public DTO
 */
export function toPublicDTO(slide) {
    if (!slide) return null

    const imageUrl = slide.image?.url || null

    return {
        _id: slide._id,
        title: slide.title,
        caption: slide.caption,
        alt: slide.alt,
        href: slide.href,
        imageUrl,
        image: imageUrl ? { url: imageUrl } : null,
        duration: slide.duration,
        order: slide.order
    }
}

/**
 * แปลงข้อมูล Slide เป็น Admin DTO
 */
export function toAdminDTO(slide) {
    if (!slide) return null

    const imageUrl = slide.image?.url || null

    return {
        _id: slide._id,
        title: slide.title,
        caption: slide.caption,
        alt: slide.alt,
        href: slide.href,
        imageUrl,
        image: imageUrl ? { url: imageUrl } : null,
        duration: slide.duration,
        order: slide.order,
        isPublished: slide.isPublished
    }
}

export function toPublicDTOList(slides) {
    if (!Array.isArray(slides)) return []
    return slides.map(toPublicDTO).filter(Boolean)
}

export function toAdminDTOList(slides) {
    if (!Array.isArray(slides)) return []
    return slides.map(toAdminDTO).filter(Boolean)
}
