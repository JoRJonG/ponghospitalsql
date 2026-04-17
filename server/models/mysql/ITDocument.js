import pool from '../../database.js'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// หมวดหมู่หลักของศูนย์คอมพิวเตอร์
const ALLOWED_CATEGORIES = [
    'Cybersecurity',
    'ระเบียบการใช้งานระบบสารสนเทศ',
    'ระบบประเมินมาตรฐานระบบบริการสุขภาพ',
    'ระบบประเมินโรงพยาบาลอัจฉริยะ (Smart hospital)',
    'คู่มือระบบสารสนเทศ'
]

class ITDocument {
    // เริ่มต้นสร้างตารางถ้ายังไม่มี
    static async initTable() {
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS it_center_docs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(255) NOT NULL,
        file_path VARCHAR(512) NULL,
        file_name VARCHAR(255) NULL,
        mime_type VARCHAR(100) NULL DEFAULT 'application/pdf',
        file_size INT NULL,
        download_count INT DEFAULT 0,
        is_published BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 0,
        created_by VARCHAR(100),
        updated_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    }

    // เพิ่มเอกสาร
    static async create({ title, description, category, filePath, fileName, mimeType, fileSize, isPublished = true, displayOrder = 0, createdBy }) {
        if (filePath) {
            if (fileSize > MAX_FILE_SIZE) {
                throw new Error(`ขนาดไฟล์เกินกำหนด (สูงสุด ${MAX_FILE_SIZE / 1024 / 1024}MB)`)
            }
            if (mimeType !== 'application/pdf') {
                throw new Error('รองรับเฉพาะไฟล์ PDF เท่านั้น')
            }
        }

        if (!ALLOWED_CATEGORIES.includes(category)) {
            throw new Error('หมวดหมู่ไม่ถูกต้อง')
        }

        const [result] = await pool.execute(
            `INSERT INTO it_center_docs 
       (title, description, category, file_path, file_name, mime_type, file_size, is_published, display_order, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, category, filePath, fileName, mimeType, fileSize, isPublished ? 1 : 0, displayOrder, createdBy]
        )

        return { id: result.insertId }
    }

    // ดึงเอกสาร
    static async findAll({ category, isPublished, page, limit, search, excludeContent = false } = {}) {
        const columns = excludeContent
            ? 'id, title, category, file_name, mime_type, file_size, download_count, is_published, display_order, created_by, created_at, updated_at'
            : 'id, title, description, category, file_name, mime_type, file_size, download_count, is_published, display_order, created_by, created_at, updated_at'

        let query = `SELECT ${columns} FROM it_center_docs WHERE 1=1`
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

    // นับจำนวน
    static async count({ category, isPublished, search } = {}) {
        let query = 'SELECT COUNT(*) as total FROM it_center_docs WHERE 1=1'
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

    // ค้นหาด้วย ID
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, title, description, category, file_name, mime_type, file_size, download_count, is_published, display_order, created_by, created_at, updated_at FROM it_center_docs WHERE id = ?',
            [id]
        )
        return rows[0]
    }

    static async getFilePath(id) {
        const [rows] = await pool.execute(
            'SELECT file_path, file_name, mime_type FROM it_center_docs WHERE id = ?',
            [id]
        )
        return rows[0]
    }

    // อัปเดตข้อมูล
    static async findByIdAndUpdate(id, { title, description, category, filePath, fileName, mimeType, fileSize, isPublished, displayOrder, updatedBy }) {
        const updates = []
        const params = []

        if (title !== undefined) { updates.push('title = ?'); params.push(title) }
        if (description !== undefined) { updates.push('description = ?'); params.push(description) }
        if (category !== undefined) { updates.push('category = ?'); params.push(category) }
        if (filePath !== undefined) { updates.push('file_path = ?'); params.push(filePath) }
        if (fileName !== undefined) { updates.push('file_name = ?'); params.push(fileName) }
        if (mimeType !== undefined) { updates.push('mime_type = ?'); params.push(mimeType) }
        if (fileSize !== undefined) { updates.push('file_size = ?'); params.push(fileSize) }
        if (isPublished !== undefined) { updates.push('is_published = ?'); params.push(isPublished ? 1 : 0) }
        if (displayOrder !== undefined) { updates.push('display_order = ?'); params.push(displayOrder) }
        if (updatedBy !== undefined) { updates.push('updated_by = ?'); params.push(updatedBy) }

        if (updates.length > 0) {
            params.push(id)
            await pool.execute(`UPDATE it_center_docs SET ${updates.join(', ')} WHERE id = ?`, params)
        }

        return await this.findById(id)
    }

    // ลบข้อมูล
    static async findByIdAndDelete(id) {
        const fileData = await this.getFilePath(id)
        await pool.execute('DELETE FROM it_center_docs WHERE id = ?', [id])
        return fileData
    }

    // เพิ่มยอดดาวน์โหลด/เปิดดู
    static async incrementDownload(id) {
        await pool.execute('UPDATE it_center_docs SET download_count = download_count + 1 WHERE id = ?', [id])
    }

    // เรียงลำดับใหม่
    static async reorder(orderData) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            for (const item of orderData) {
                await connection.execute(
                    'UPDATE it_center_docs SET display_order = ? WHERE id = ?',
                    [item.displayOrder, item.id]
                )
            }
            await connection.commit()
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }
}

export default ITDocument
