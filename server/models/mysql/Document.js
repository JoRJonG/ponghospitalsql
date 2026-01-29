import pool from '../../database.js'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

class Document {
    // สร้างเอกสารใหม่
    static async create({ title, description, category, filePath, fileName, mimeType, fileSize, isPublished = true, displayOrder = 0, createdBy }) {
        // ตรวจสอบขนาดไฟล์
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error(`ขนาดไฟล์เกินกำหนด (สูงสุด ${MAX_FILE_SIZE / 1024 / 1024}MB)`)
        }

        const [result] = await pool.execute(
            `INSERT INTO documents 
       (title, description, category, file_path, file_name, mime_type, file_size, is_published, display_order, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, category, filePath, fileName, mimeType, fileSize, isPublished ? 1 : 0, displayOrder, createdBy]
        )

        return { id: result.insertId }
    }

    // ดึงรายการเอกสารทั้งหมด (พร้อม Pagination & Search)
    static async findAll({ category, isPublished, page, limit, search } = {}) {
        let query = 'SELECT id, title, description, category, file_name, mime_type, file_size, download_count, is_published, display_order, created_by, created_at, updated_at FROM documents WHERE 1=1'
        const params = []

        if (category && category !== 'ทั้งหมด') {
            query += ' AND category = ?'
            params.push(category)
        }

        if (isPublished !== undefined) {
            query += ' AND is_published = ?'
            params.push(isPublished ? 1 : 0)
        }

        if (search) {
            query += ' AND (title LIKE ? OR description LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        query += ' ORDER BY display_order ASC, created_at DESC'

        if (page && limit) {
            const offset = (page - 1) * limit
            query += ' LIMIT ? OFFSET ?'
            params.push(parseInt(limit), parseInt(offset))
        }

        const [rows] = await pool.execute(query, params)
        return rows
    }

    // นับจำนวนเอกสารทั้งหมด (สำหรับ Pagination)
    static async count({ category, isPublished, search } = {}) {
        let query = 'SELECT COUNT(*) as total FROM documents WHERE 1=1'
        const params = []

        if (category && category !== 'ทั้งหมด') {
            query += ' AND category = ?'
            params.push(category)
        }

        if (isPublished !== undefined) {
            query += ' AND is_published = ?'
            params.push(isPublished ? 1 : 0)
        }

        if (search) {
            query += ' AND (title LIKE ? OR description LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        const [rows] = await pool.execute(query, params)
        return rows[0].total
    }

    // ดึงข้อมูลเอกสารตาม ID (ไม่รวมไฟล์)
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, title, description, category, file_name, mime_type, file_size, download_count, is_published, display_order, created_by, created_at, updated_at FROM documents WHERE id = ?',
            [id]
        )
        return rows[0]
    }

    // ดึง file path สำหรับดาวน์โหลด
    static async getFilePath(id) {
        const [rows] = await pool.execute(
            'SELECT file_path, file_name, mime_type FROM documents WHERE id = ?',
            [id]
        )
        return rows[0]
    }

    // อัปเดตเอกสาร
    static async findByIdAndUpdate(id, { title, description, category, filePath, fileName, mimeType, fileSize, isPublished, displayOrder, updatedBy }) {
        const updates = []
        const params = []

        if (title !== undefined) {
            updates.push('title = ?')
            params.push(title)
        }
        if (description !== undefined) {
            updates.push('description = ?')
            params.push(description)
        }
        if (category !== undefined) {
            updates.push('category = ?')
            params.push(category)
        }
        if (filePath !== undefined) {
            updates.push('file_path = ?')
            params.push(filePath)
        }
        if (fileName !== undefined) {
            updates.push('file_name = ?')
            params.push(fileName)
        }
        if (mimeType !== undefined) {
            updates.push('mime_type = ?')
            params.push(mimeType)
        }
        if (fileSize !== undefined) {
            // ตรวจสอบขนาดไฟล์
            if (fileSize > MAX_FILE_SIZE) {
                throw new Error(`ขนาดไฟล์เกินกำหนด (สูงสุด ${MAX_FILE_SIZE / 1024 / 1024}MB)`)
            }
            updates.push('file_size = ?')
            params.push(fileSize)
        }
        if (isPublished !== undefined) {
            updates.push('is_published = ?')
            params.push(isPublished ? 1 : 0)
        }
        if (displayOrder !== undefined) {
            updates.push('display_order = ?')
            params.push(displayOrder)
        }
        if (updatedBy !== undefined) {
            updates.push('updated_by = ?')
            params.push(updatedBy)
        }

        if (updates.length === 0) {
            throw new Error('ไม่มีข้อมูลที่ต้องการอัปเดต')
        }

        params.push(id)

        await pool.execute(
            `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`,
            params
        )

        return { id }
    }

    // ลบเอกสาร
    static async findByIdAndDelete(id) {
        // ดึง file path ก่อนลบ เพื่อลบไฟล์จริง
        const doc = await this.getFilePath(id)

        await pool.execute('DELETE FROM documents WHERE id = ?', [id])

        return { id, filePath: doc?.file_path }
    }

    // เพิ่มจำนวนดาวน์โหลด
    static async incrementDownloadCount(id) {
        await pool.execute(
            'UPDATE documents SET download_count = download_count + 1 WHERE id = ?',
            [id]
        )
    }

    // ดึงรายการหมวดหมู่ทั้งหมด
    static async getCategories() {
        const [rows] = await pool.execute(
            'SELECT DISTINCT category FROM documents ORDER BY category'
        )
        return rows.map(row => row.category)
    }
}

export default Document
