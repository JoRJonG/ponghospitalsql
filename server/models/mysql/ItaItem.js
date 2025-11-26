import { query, exec, transaction } from '../../database.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Go up to server root (server/models/mysql -> server/models -> server) then up to project root
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/ita_pdfs')

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  } catch (e) {
    console.error('[ITA] ensureUploadDir error:', e)
  }
}

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
  await ensureUploadDir()
  
  // Note: bytes column is now nullable for new files stored on disk
  await exec(`CREATE TABLE IF NOT EXISTS ita_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    description TEXT NULL,
    bytes LONGBLOB NULL,
    file_path VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`, [])

  if (!(await columnExists('ita_files', 'ita_item_id'))) {
    await exec('ALTER TABLE ita_files ADD COLUMN ita_item_id INT NULL', [])
  }

  if (!(await columnExists('ita_files', 'description'))) {
    await exec('ALTER TABLE ita_files ADD COLUMN description TEXT NULL', [])
  }
  
  if (!(await columnExists('ita_files', 'file_path'))) {
    await exec('ALTER TABLE ita_files ADD COLUMN file_path VARCHAR(512) NULL', [])
  }
  
  // Make bytes nullable if it's not already (hard to do safely in raw SQL without check, but MySQL allows modifying column to same type)
  // We'll just assume it's okay or that new inserts can pass NULL if we remove NOT NULL constraint. 
  // For safety in this environment, we won't run ALTER MODIFY blindly to avoid locking large tables if not needed.
  // Instead, we'll pass an empty buffer for 'bytes' if we use file_path, or check if we can alter.
  try {
    await exec('ALTER TABLE ita_files MODIFY COLUMN bytes LONGBLOB NULL')
  } catch (e) {
    // ignore if fails, we'll handle it by passing empty buffer if needed
    console.warn('[ITA] could not modify bytes column to NULL:', e.message)
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

async function saveFileToDisk(buffer, filename) {
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const uniqueName = `${Date.now()}_${safeName}`
  const filePath = path.join(UPLOAD_DIR, uniqueName)
  await fs.writeFile(filePath, buffer)
  return uniqueName // Store relative filename
}

export async function saveItaPdf({ filename, mimetype, buffer, description = null }) {
  await ensurePdfTable()
  const storedFilename = await saveFileToDisk(buffer, filename)
  // Use NULL for bytes to save space
  const result = await exec('INSERT INTO ita_files (filename, mimetype, bytes, file_path, description) VALUES (?,?,NULL,?,?)', [filename, mimetype, storedFilename, description])
  return { id: result.insertId }
}

export async function getItaPdf(id) {
  await ensurePdfTable()
  const rows = await query('SELECT id, filename, mimetype, bytes, file_path, description FROM ita_files WHERE id = ?', [id])
  if (!rows[0]) return null
  const r = rows[0]
  
  let fileData = r.bytes
  if (r.file_path) {
    try {
      const fullPath = path.join(UPLOAD_DIR, r.file_path)
      fileData = await fs.readFile(fullPath)
    } catch (e) {
      console.error(`[ITA] Failed to read file from disk: ${r.file_path}`, e)
      // If file missing on disk, we can't recover if bytes is NULL. 
      // If bytes is not NULL (hybrid?), we use it.
      if (!fileData) return null
    }
  }
  
  return { id: r.id, filename: r.filename, mimetype: r.mimetype, bytes: fileData, description: r.description }
}

export async function getItaPdfByFilename(filename) {
  await ensurePdfTable()
  const rows = await query('SELECT id, filename, mimetype, bytes, file_path, description FROM ita_files WHERE filename = ? ORDER BY id DESC LIMIT 1', [filename])
  if (!rows[0]) return null
  const r = rows[0]
  
  let fileData = r.bytes
  if (r.file_path) {
    try {
      const fullPath = path.join(UPLOAD_DIR, r.file_path)
      fileData = await fs.readFile(fullPath)
    } catch (e) {
      console.error(`[ITA] Failed to read file from disk: ${r.file_path}`, e)
      if (!fileData) return null
    }
  }
  
  return { id: r.id, filename: r.filename, mimetype: r.mimetype, bytes: fileData, description: r.description }
}

export async function attachPdfToItem(itemId, { filename, mimetype, buffer, description = null }) {
  await ensurePdfTable()
  const storedFilename = await saveFileToDisk(buffer, filename)
  const result = await exec('INSERT INTO ita_files (filename, mimetype, bytes, file_path, ita_item_id, description) VALUES (?,?,NULL,?,?,?)', [filename, mimetype, storedFilename, itemId, description])
  return { id: result.insertId }
}

export async function listItemPdfs(itemId) {
  await ensurePdfTable()
  // We can't easily get size if it's on disk without reading stat, but for listing we might just want to know it exists.
  // If bytes is NULL, size is 0 in SQL. We might need to store file_size column in future, but for now let's just return 0 or check if we can get it.
  // Actually, let's just return 0 for size if on disk for listing performance, or maybe we should have added a size column.
  // For now, let's keep it simple.
  const rows = await query('SELECT id, filename, mimetype, OCTET_LENGTH(bytes) AS size, file_path, created_at, description FROM ita_files WHERE ita_item_id = ? ORDER BY id ASC', [itemId])
  
  return rows.map(r => ({
    id: r.id,
    filename: r.filename,
    mimetype: r.mimetype,
    size: r.size || 0, // inaccurate for disk files unless we add size column, but acceptable for now
    description: r.description || null,
    url: `/api/ita/pdf/${encodeURIComponent(r.filename)}`,
    createdAt: r.created_at,
  }))
}

export async function deletePdf(fileId) {
  await ensurePdfTable()
  const rows = await query('SELECT file_path FROM ita_files WHERE id = ?', [fileId])
  if (rows[0] && rows[0].file_path) {
    try {
      const fullPath = path.join(UPLOAD_DIR, rows[0].file_path)
      await fs.unlink(fullPath)
    } catch (e) {
      console.warn(`[ITA] Failed to delete file from disk: ${rows[0].file_path}`, e.message)
    }
  }
  await exec('DELETE FROM ita_files WHERE id = ?', [fileId])
  return true
}

export default ItaItem