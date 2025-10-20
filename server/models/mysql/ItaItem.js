import { query, exec, transaction } from '../../database.js'

async function columnExists(table, column) {
  const safeTable = table.replace(/[^A-Za-z0-9_`]/g, '')
  const safeColumn = column.replace(/[^A-Za-z0-9_`]/g, '')
  try {
    const rows = await query(`SHOW COLUMNS FROM ${safeTable} LIKE '${safeColumn}'`)
    return rows.length > 0
  } catch {
    return false
  }
}

async function indexExists(table, index) {
  const safeTable = table.replace(/[^A-Za-z0-9_`]/g, '')
  const safeIndex = index.replace(/[^A-Za-z0-9_`]/g, '')
  try {
    const rows = await query(`SHOW INDEX FROM ${safeTable} WHERE Key_name = '${safeIndex}'`)
    return rows.length > 0
  } catch {
    return false
  }
}

async function foreignKeyExists(table, constraint) {
  const safeTable = table.replace(/[^A-Za-z0-9_`]/g, '')
  const safeConstraint = constraint.replace(/[^A-Za-z0-9_`]/g, '')
  try {
    const rows = await query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${safeTable.replace(/`/g, '')}' AND CONSTRAINT_NAME = '${safeConstraint}' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
    )
    return rows.length > 0
  } catch {
    return false
  }
}

async function ensureTable() {
  await exec(`CREATE TABLE IF NOT EXISTS ita_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NULL,
    content MEDIUMTEXT NULL,
    pdf_url VARCHAR(1024) NULL,
    display_order INT DEFAULT 0,
    is_published TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ita_parent FOREIGN KEY (parent_id) REFERENCES ita_items(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`, [])

  if (!(await indexExists('ita_items', 'idx_ita_parent_order'))) {
    await exec('CREATE INDEX idx_ita_parent_order ON ita_items(parent_id, display_order)', [])
  }

  if (!(await columnExists('ita_items', 'pdf_url'))) {
    await exec('ALTER TABLE ita_items ADD COLUMN pdf_url VARCHAR(1024) NULL', [])
  }
}

async function ensurePdfTable() {
  await ensureTable()
  await exec(`CREATE TABLE IF NOT EXISTS ita_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    bytes LONGBLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`, [])

  if (!(await columnExists('ita_files', 'ita_item_id'))) {
    await exec('ALTER TABLE ita_files ADD COLUMN ita_item_id INT NULL', [])
  }

  if (!(await indexExists('ita_files', 'idx_ita_files_item'))) {
    try {
      await exec('CREATE INDEX idx_ita_files_item ON ita_files(ita_item_id)', [])
    } catch (error) {
      console.warn('[ITA] could not create index idx_ita_files_item:', error?.message)
    }
  }

  if (!(await foreignKeyExists('ita_files', 'fk_ita_files_item'))) {
    try {
      await exec('ALTER TABLE ita_files ADD CONSTRAINT fk_ita_files_item FOREIGN KEY (ita_item_id) REFERENCES ita_items(id) ON DELETE CASCADE', [])
    } catch (error) {
      console.warn('[ITA] could not add FK fk_ita_files_item:', error?.message)
    }
  }
}

export class ItaItem {
  static async findAll({ includeUnpublished = false } = {}) {
    await ensureTable()
    const where = includeUnpublished ? '' : 'WHERE is_published = 1'
    const rows = await query(`SELECT id, parent_id, title, slug, content, pdf_url, display_order, is_published, created_at, updated_at FROM ita_items ${where} ORDER BY parent_id ASC, display_order ASC, id ASC`)
    return rows.map(r => ({
      _id: r.id,
      parentId: r.parent_id,
      title: r.title,
      slug: r.slug,
      content: r.content,
      pdfUrl: r.pdf_url,
      order: r.display_order,
      isPublished: !!r.is_published,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  }
  static async findTree({ includeUnpublished = false } = {}) {
    const flat = await this.findAll({ includeUnpublished })
    const byId = new Map(flat.map(i => [i._id, { ...i, children: [] }]))
    const roots = []
    for (const item of byId.values()) {
      if (item.parentId && byId.has(item.parentId)) {
        byId.get(item.parentId).children.push(item)
      } else roots.push(item)
    }
    return roots
  }
  static async create(data) {
    await ensureTable()
    return await transaction(async (conn) => {
      // determine next order
      const [rows] = await conn.query('SELECT COALESCE(MAX(display_order),-1) AS max_order FROM ita_items WHERE parent_id <=> ?', [data.parentId ?? null])
      const next = (rows[0]?.max_order ?? -1) + 1
      const [result] = await conn.execute(`INSERT INTO ita_items (parent_id, title, slug, content, pdf_url, display_order, is_published) VALUES (?,?,?,?,?,?,?)`, [
        data.parentId ?? null,
        data.title,
        data.slug || null,
        data.content || null,
        data.pdfUrl || null,
        data.order ?? next,
        data.isPublished !== false ? 1 : 0,
      ])
      return this.findById(result.insertId)
    })
  }
  static async findById(id) {
    await ensureTable()
    const rows = await query(`SELECT id, parent_id, title, slug, content, pdf_url, display_order, is_published, created_at, updated_at FROM ita_items WHERE id = ?`, [id])
    if (!rows[0]) return null
    const r = rows[0]
    return { _id: r.id, parentId: r.parent_id, title: r.title, slug: r.slug, content: r.content, pdfUrl: r.pdf_url, order: r.display_order, isPublished: !!r.is_published, createdAt: r.created_at, updatedAt: r.updated_at }
  }
  static async updateById(id, data) {
    await ensureTable()
    return await transaction(async (conn) => {
      const fields = []
      const params = []
      if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title) }
      if (data.slug !== undefined) { fields.push('slug = ?'); params.push(data.slug || null) }
      if (data.content !== undefined) { fields.push('content = ?'); params.push(data.content || null) }
      if (data.isPublished !== undefined) { fields.push('is_published = ?'); params.push(data.isPublished ? 1 : 0) }
      if (data.pdfUrl !== undefined) { fields.push('pdf_url = ?'); params.push(data.pdfUrl || null) }
      if (data.order !== undefined) { fields.push('display_order = ?'); params.push(data.order) }
      if (data.parentId !== undefined) { fields.push('parent_id = ?'); params.push(data.parentId || null) }
      if (!fields.length) return this.findById(id)
      params.push(id)
      await conn.execute(`UPDATE ita_items SET ${fields.join(', ')} WHERE id = ?`, params)
      return this.findById(id)
    })
  }
  static async deleteById(id) {
    await ensureTable()
    const item = await this.findById(id)
    if (!item) return null
    await exec('DELETE FROM ita_items WHERE id = ?', [id])
    return item
  }
  static async reorder(siblingOrders) {
    // siblingOrders: [{id, order}]
    await ensureTable()
    return await transaction(async (conn) => {
      for (const it of siblingOrders) {
        if (it && typeof it.id === 'number' && Number.isFinite(it.order)) {
          await conn.execute('UPDATE ita_items SET display_order = ? WHERE id = ?', [it.order, it.id])
        }
      }
      return true
    })
  }
}

export async function saveItaPdf({ filename, mimetype, buffer }) {
  await ensurePdfTable()
  const result = await exec('INSERT INTO ita_files (filename, mimetype, bytes) VALUES (?,?,?)', [filename, mimetype, buffer])
  return { id: result.insertId }
}
export async function getItaPdf(id) {
  await ensurePdfTable()
  const rows = await query('SELECT id, filename, mimetype, bytes FROM ita_files WHERE id = ?', [id])
  if (!rows[0]) return null
  const r = rows[0]
  return { id: r.id, filename: r.filename, mimetype: r.mimetype, bytes: r.bytes }
}

export async function attachPdfToItem(itemId, { filename, mimetype, buffer }) {
  await ensurePdfTable()
  const result = await exec('INSERT INTO ita_files (filename, mimetype, bytes, ita_item_id) VALUES (?,?,?,?)', [filename, mimetype, buffer, itemId])
  return { id: result.insertId }
}
export async function listItemPdfs(itemId) {
  await ensurePdfTable()
  const rows = await query('SELECT id, filename, mimetype, OCTET_LENGTH(bytes) AS size, created_at FROM ita_files WHERE ita_item_id = ? ORDER BY id ASC', [itemId])
  return rows.map(r => ({ id: r.id, filename: r.filename, mimetype: r.mimetype, size: r.size, url: `/api/ita/pdf/${r.id}`, createdAt: r.created_at }))
}
export async function deletePdf(fileId) {
  await ensurePdfTable()
  await exec('DELETE FROM ita_files WHERE id = ?', [fileId])
  return true
}

export default ItaItem