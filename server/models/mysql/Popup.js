import { query, exec } from '../../database.js'

const BASE_COLUMNS = `
  id, title, body, start_at, end_at, dismiss_for_days, is_active,
  cta_label, cta_url, image_url, image_mime, image_name, image_size,
  created_at, updated_at, (image_data IS NOT NULL) AS has_image
`

function normalizeRow(row) {
  if (!row) return null
  const toIso = (value) => (value ? new Date(value).toISOString() : null)
  const updatedTs = row.updated_at ? new Date(row.updated_at).getTime() : null
  const hasImage = Boolean(row.has_image)
  const inlineImageUrl = hasImage ? `/api/images/popups/${row.id}${updatedTs ? `?v=${updatedTs}` : ''}` : null
  const dismissDays = Number(row.dismiss_for_days)
  const imageSize = row.image_size !== undefined && row.image_size !== null ? Number(row.image_size) : null
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
    dismissForDays: Number.isFinite(dismissDays) ? dismissDays : 1,
    isActive: Boolean(row.is_active),
    ctaLabel: row.cta_label || '',
    ctaUrl: row.cta_url || '',
    imageUrl: row.image_url || '',
    image: hasImage ? {
      url: inlineImageUrl,
      mimeType: row.image_mime || null,
      size: Number.isFinite(imageSize) ? imageSize : null,
      fileName: row.image_name || null
    } : null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  }
}

function formatDateForMySQL(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export class Popup {
  static async findAll() {
    const rows = await query(`
      SELECT ${BASE_COLUMNS}
      FROM homepage_popups
      ORDER BY is_active DESC, COALESCE(start_at, created_at) DESC, id DESC
    `)
    return rows.map(normalizeRow)
  }

  static async findActive(now = new Date()) {
    const target = formatDateForMySQL(now)
    const rows = await query(`
      SELECT ${BASE_COLUMNS}
      FROM homepage_popups
      WHERE is_active = 1
        AND (start_at IS NULL OR start_at <= ?)
        AND (end_at IS NULL OR end_at >= ?)
      ORDER BY COALESCE(start_at, created_at) DESC, id DESC
    `, [target, target])
    return rows.map(normalizeRow)
  }

  static async findById(id) {
    const rows = await query(`
      SELECT ${BASE_COLUMNS}
      FROM homepage_popups
      WHERE id = ?
    `, [id])
    return normalizeRow(rows[0])
  }

  static async getImageData(id) {
    const rows = await query(`
      SELECT image_data, image_mime, image_name, image_size
      FROM homepage_popups
      WHERE id = ? AND image_data IS NOT NULL
    `, [id])
    return rows[0] || null
  }

  static async create(data) {
    const insert = {
      title: (data.title || '').trim(),
      body: (data.body || '').trim(),
      start_at: formatDateForMySQL(data.startAt || data.start_at || null),
      end_at: formatDateForMySQL(data.endAt || data.end_at || null),
      dismiss_for_days: Number.isFinite(Number(data.dismissForDays)) ? Math.max(0, Math.floor(Number(data.dismissForDays))) : 1,
      is_active: data.isActive ? 1 : 0,
      cta_label: data.ctaLabel?.trim() || null,
      cta_url: data.ctaUrl?.trim() || null,
      image_url: data.imageUrl?.trim() || null,
      image_data: data.imageData || null,
      image_mime: data.imageMime || null,
      image_name: data.imageName || null,
      image_size: data.imageSize || (data.imageData ? data.imageData.length : null)
    }

    const result = await exec(`
      INSERT INTO homepage_popups
        (title, body, start_at, end_at, dismiss_for_days, is_active, cta_label, cta_url, image_url, image_data, image_mime, image_name, image_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      insert.title,
      insert.body,
      insert.start_at,
      insert.end_at,
      insert.dismiss_for_days,
      insert.is_active,
      insert.cta_label,
      insert.cta_url,
      insert.image_url,
      insert.image_data,
      insert.image_mime,
      insert.image_name,
      insert.image_size
    ])

    return this.findById(result.insertId)
  }

  static async updateById(id, data) {
    const fields = []
    const params = []
    let imageUrlExplicit

    if (data.title !== undefined) {
      fields.push('title = ?')
      params.push((data.title || '').trim())
    }
    if (data.body !== undefined) {
      fields.push('body = ?')
      params.push((data.body || '').trim())
    }
    if (data.startAt !== undefined || data.start_at !== undefined) {
      fields.push('start_at = ?')
      params.push(formatDateForMySQL(data.startAt ?? data.start_at))
    }
    if (data.endAt !== undefined || data.end_at !== undefined) {
      fields.push('end_at = ?')
      params.push(formatDateForMySQL(data.endAt ?? data.end_at))
    }
    if (data.dismissForDays !== undefined || data.dismiss_for_days !== undefined) {
      const raw = Number(data.dismissForDays ?? data.dismiss_for_days)
      fields.push('dismiss_for_days = ?')
      params.push(Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 1)
    }
    if (data.isActive !== undefined || data.is_active !== undefined) {
      fields.push('is_active = ?')
      params.push((data.isActive ?? data.is_active) ? 1 : 0)
    }
    if (data.ctaLabel !== undefined || data.cta_label !== undefined) {
      const val = data.ctaLabel ?? data.cta_label
      fields.push('cta_label = ?')
      params.push(val ? String(val).trim() : null)
    }
    if (data.ctaUrl !== undefined || data.cta_url !== undefined) {
      const val = data.ctaUrl ?? data.cta_url
      fields.push('cta_url = ?')
      params.push(val ? String(val).trim() : null)
    }
    if (data.imageData) {
      fields.push('image_data = ?')
      params.push(data.imageData)
      fields.push('image_mime = ?')
      params.push(data.imageMime || null)
      fields.push('image_name = ?')
      params.push(data.imageName || null)
      fields.push('image_size = ?')
      params.push(data.imageSize || (data.imageData ? data.imageData.length : null))
      imageUrlExplicit = null
    }
    if (data.clearImage) {
      fields.push('image_data = NULL')
      fields.push('image_mime = NULL')
      fields.push('image_name = NULL')
      fields.push('image_size = NULL')
      imageUrlExplicit = null
    }
    if (data.imageUrl !== undefined || data.image_url !== undefined) {
      const val = data.imageUrl ?? data.image_url
      imageUrlExplicit = val ? String(val).trim() : null
    }

    if (imageUrlExplicit !== undefined) {
      fields.push('image_url = ?')
      params.push(imageUrlExplicit)
    }

    if (!fields.length) {
      return this.findById(id)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id)

    await exec(`
      UPDATE homepage_popups
      SET ${fields.join(', ')}
      WHERE id = ?
    `, params)

    return this.findById(id)
  }

  static async deleteById(id) {
    const result = await exec('DELETE FROM homepage_popups WHERE id = ?', [id])
    return result.affectedRows > 0
  }
}

export default Popup
