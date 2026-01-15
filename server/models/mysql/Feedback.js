import pool from '../../database.js'

/**
 * Model สำหรับจัดการข้อมูล Feedback (ความคิดเห็น)
 */
class Feedback {
    /**
     * สร้างความคิดเห็นใหม่
     * @param {Object} data - ข้อมูลความคิดเห็น
     * @returns {Promise<Object>} ข้อมูลความคิดเห็นที่สร้างแล้ว
     */
    static async create(data) {
        const { name, email, phone, subject, message } = data

        const [result] = await pool.execute(
            `INSERT INTO feedback (name, email, phone, subject, message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'new', NOW(), NOW())`,
            [name, email || null, phone || null, subject, message]
        )

        return this.findById(result.insertId)
    }

    /**
     * ดึงข้อมูลความคิดเห็นทั้งหมด
     * @param {Object} options - ตัวเลือกการค้นหา
     * @returns {Promise<Array>} รายการความคิดเห็น
     */
    static async findAll(options = {}) {
        const { status, limit = 100, offset = 0, search } = options

        let query = 'SELECT * FROM feedback WHERE 1=1'
        const params = []

        // กรองตามสถานะ
        if (status) {
            query += ' AND status = ?'
            params.push(status)
        }

        // ค้นหาตามชื่อ, อีเมล, หรือหัวข้อ
        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)'
            const searchPattern = `%${search}%`
            params.push(searchPattern, searchPattern, searchPattern, searchPattern)
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.push(limit, offset)

        const [rows] = await pool.execute(query, params)
        return rows
    }

    /**
     * ดึงข้อมูลความคิดเห็นตาม ID
     * @param {number} id - ID ของความคิดเห็น
     * @returns {Promise<Object|null>} ข้อมูลความคิดเห็น
     */
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM feedback WHERE id = ?',
            [id]
        )
        return rows[0] || null
    }

    /**
     * อัปเดตสถานะความคิดเห็น
     * @param {number} id - ID ของความคิดเห็น
     * @param {string} status - สถานะใหม่
     * @param {string} readBy - ชื่อผู้อ่าน (optional)
     * @returns {Promise<Object|null>} ข้อมูลความคิดเห็นที่อัปเดตแล้ว
     */
    static async updateStatus(id, status, readBy = null) {
        const validStatuses = ['new', 'read', 'replied', 'archived']
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}`)
        }

        // ถ้าเปลี่ยนเป็น read ให้บันทึกผู้อ่านและเวลา
        if (status === 'read' && readBy) {
            await pool.execute(
                'UPDATE feedback SET status = ?, read_by = ?, read_at = NOW(), updated_at = NOW() WHERE id = ?',
                [status, readBy, id]
            )
        } else {
            await pool.execute(
                'UPDATE feedback SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, id]
            )
        }

        return this.findById(id)
    }

    /**
     * เพิ่มคำตอบจากผู้ดูแลระบบ
     * @param {number} id - ID ของความคิดเห็น
     * @param {string} reply - คำตอบ
     * @returns {Promise<Object|null>} ข้อมูลความคิดเห็นที่อัปเดตแล้ว
     */
    static async addReply(id, reply) {
        await pool.execute(
            `UPDATE feedback 
       SET admin_reply = ?, status = 'replied', updated_at = NOW() 
       WHERE id = ?`,
            [reply, id]
        )

        return this.findById(id)
    }

    /**
     * ลบความคิดเห็น
     * @param {number} id - ID ของความคิดเห็น
     * @returns {Promise<boolean>} ผลการลบ
     */
    static async delete(id) {
        const [result] = await pool.execute(
            'DELETE FROM feedback WHERE id = ?',
            [id]
        )

        return result.affectedRows > 0
    }

    /**
     * นับจำนวนความคิดเห็นตามสถานะ
     * @returns {Promise<Object>} สถิติความคิดเห็น
     */
    static async countByStatus() {
        const [rows] = await pool.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM feedback
      GROUP BY status
    `)

        const stats = {
            new: 0,
            read: 0,
            replied: 0,
            archived: 0,
            total: 0
        }

        rows.forEach(row => {
            stats[row.status] = parseInt(row.count)
            stats.total += parseInt(row.count)
        })

        return stats
    }

    /**
     * นับจำนวนความคิดเห็นทั้งหมด
     * @param {Object} options - ตัวเลือกการค้นหา
     * @returns {Promise<number>} จำนวนความคิดเห็น
     */
    static async count(options = {}) {
        const { status, search } = options

        let query = 'SELECT COUNT(*) as total FROM feedback WHERE 1=1'
        const params = []

        if (status) {
            query += ' AND status = ?'
            params.push(status)
        }

        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)'
            const searchPattern = `%${search}%`
            params.push(searchPattern, searchPattern, searchPattern, searchPattern)
        }

        const [rows] = await pool.execute(query, params)
        return rows[0].total
    }
}

export default Feedback
