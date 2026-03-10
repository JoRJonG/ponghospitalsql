import pool from '../../database.js'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB สำหรับ PDF

class PRPlan {
    // สร้าง PR Plan ใหม่
    static async create({ title, description, filePath, fileName, mimeType, fileSize, isPublished = true, displayOrder = 0, createdBy }) {
        // ตรวจสอบขนาดไฟล์
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error(`ขนาดไฟล์เกินกำหนด (สูงสุด ${MAX_FILE_SIZE / 1024 / 1024}MB)`)
        }

        // ตรวจสอบว่าเป็น PDF
        if (mimeType !== 'application/pdf') {
            throw new Error('รองรับเฉพาะไฟล์ PDF เท่านั้น')
        }

        const [result] = await pool.execute(
            `INSERT INTO pr_plans 
       (title, description, file_path, file_name, mime_type, file_size, is_published, display_order, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, filePath, fileName, mimeType, fileSize, isPublished ? 1 : 0, displayOrder, createdBy]
        )

        return { id: result.insertId }
    }

    // ดึงรายการ PR Plans ทั้งหมด (พร้อม Pagination & Search)
    static async findAll({ isPublished, page, limit, search, excludeContent = false } = {}) {
        const columns = excludeContent
            ? 'id, title, file_name, mime_type, file_size, download_count, is_published, display_order, created_by, created_at, updated_at'
            : 'id, title, description, file_name, mime_type, file_size, download_count, is_published, display_order, created_by, created_at, updated_at'

        let query = `SELECT ${columns} FROM pr_plans WHERE 1=1`
        const params = []

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

    // นับจำนวน PR Plans ทั้งหมด (สำหรับ Pagination)
    static async count({ isPublished, search } = {}) {
        let query = 'SELECT COUNT(*) as total FROM pr_plans WHERE 1=1'
        const params = []

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

    // ดึงข้อมูล PR Plan ตาม ID (ไม่รวมไฟล์)
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, title, description, file_name, mime_type, file_size, download_count, is_published, display_order, created_by, created_at, updated_at FROM pr_plans WHERE id = ?',
            [id]
        )
        return rows[0]
    }

    // ดึง file path สำหรับดาวน์โหลด
    static async getFilePath(id) {
        const [rows] = await pool.execute(
            'SELECT file_path, file_name, mime_type FROM pr_plans WHERE id = ?',
            [id]
        )
        return rows[0]
    }

    // อัปเดต PR Plan
    static async findByIdAndUpdate(id, { title, description, filePath, fileName, mimeType, fileSize, isPublished, displayOrder, updatedBy }) {
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
        if (filePath !== undefined) {
            updates.push('file_path = ?')
            params.push(filePath)
        }
        if (fileName !== undefined) {
            updates.push('file_name = ?')
            params.push(fileName)
        }
        if (mimeType !== undefined) {
            // ตรวจสอบว่าเป็น PDF
            if (mimeType !== 'application/pdf') {
                throw new Error('รองรับเฉพาะไฟล์ PDF เท่านั้น')
            }
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

        const [result] = await pool.execute(
            `UPDATE pr_plans SET ${updates.join(', ')} WHERE id = ?`,
            params
        )

        if (result.affectedRows === 0) {
            throw new Error('PR Plan not found')
        }

        return { id }
    }

    // ลบ PR Plan
    static async findByIdAndDelete(id) {
        // ดึง file path ก่อนลบ เพื่อลบไฟล์จริง
        const doc = await this.getFilePath(id)

        const [result] = await pool.execute('DELETE FROM pr_plans WHERE id = ?', [id])

        if (result.affectedRows === 0) {
            throw new Error('PR Plan not found')
        }

        return { id, filePath: doc?.file_path }
    }

    // เพิ่มจำนวนดาวน์โหลด
    static async incrementDownloadCount(id) {
        await pool.execute(
            'UPDATE pr_plans SET download_count = download_count + 1 WHERE id = ?',
            [id]
        )
    }
}

export default PRPlan
