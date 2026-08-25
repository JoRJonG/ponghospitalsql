export const toPublicDTO = (row) => {
  return {
    _id: row._id || row.id,
    title: row.title || '',
    description: row.description || '',
    image: {
      url: row.image?.url || row.imageUrl || ''
    },
    order: row.order ?? row.displayOrder ?? row.display_order ?? 0
  }
}

export const toAdminDTO = (row) => {
  return {
    _id: row._id || row.id,
    title: row.title || '',
    description: row.description || '',
    image: {
      url: row.image?.url || row.imageUrl || ''
    },
    displayOrder: row.displayOrder ?? row.display_order ?? 0,
    isPublished: Boolean(row.isPublished ?? row.is_published ?? true),
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at
  }
}

export const toPublicDTOList = (rows) => rows.map(toPublicDTO)
export const toAdminDTOList = (rows) => rows.map(toAdminDTO)
