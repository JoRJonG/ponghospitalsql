export const toOrganizationChartDTO = (row) => {
    const safelyConvertBoolean = (val) => {
        if (Buffer.isBuffer(val)) return val[0] === 1
        if (typeof val === 'number') return val === 1
        if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true'
        return Boolean(val)
    }

    return {
        _id: row.id,
        title: row.title,
        imageUrl: `/api/images/organization/${row.id}?t=${new Date(row.updated_at).getTime()}`,
        displayOrder: row.display_order,
        isPublished: safelyConvertBoolean(row.is_published)
    }
}
