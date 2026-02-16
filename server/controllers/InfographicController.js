
import { query } from '../database.js'
import { userHasPermission } from '../middleware/auth.js'
import { toPublicDTOList, toAdminDTOList } from '../dto/InfographicDTO.js'

export const InfographicController = {
    async index(req, res) {
        if (!req.app.locals.dbConnected) {
            return res.status(503).json({ error: 'Database unavailable' })
        }

        try {
            const { published, page, limit } = req.query
            const wantAll = published === 'false'
            const isAuthed = Boolean(req.user)
            const allowAll = wantAll && isAuthed && userHasPermission(req.user, 'infographics')

            const whereClause = allowAll ? 'WHERE 1=1' : 'WHERE is_published = TRUE'

            // Pagination logic
            const pageNum = Math.max(1, parseInt(page) || 1)
            const limitVal = parseInt(limit) || 0
            let limitClause = ''
            const params = []

            if (limitVal > 0) {
                limitClause = 'LIMIT ? OFFSET ?'
                params.push(limitVal, (pageNum - 1) * limitVal)
            }

            // 1. Get Count (if needed)
            if (limitVal > 0) {
                const countRows = await query(`SELECT COUNT(*) as total FROM infographics ${whereClause}`, [])
                const total = countRows[0]?.total || 0
                res.setHeader('X-Total-Count', total)
                res.setHeader('X-Page', pageNum)
                res.setHeader('X-Per-Page', limitVal)
                res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
            }

            // 2. Get Data
            const rows = await query(
                `SELECT id, title, image_size, mime_type, display_order, is_published, created_at, updated_at 
         FROM infographics 
         ${whereClause}
         ORDER BY display_order ASC, created_at DESC
         ${limitClause}`,
                params
            )

            // Select DTO based on permission (allowAll = true implies admin/permission)
            const dtoList = allowAll ? toAdminDTOList : toPublicDTOList

            // Map rows to interim object structure expected by DTOs
            const rawObjects = rows.map(row => ({
                _id: row.id,
                title: row.title,
                description: '', // Infographics table doesn't have description yet, but DTO expects it
                image: { url: `/api/images/infographics/${row.id}` },
                displayOrder: row.display_order, // Needed for AdminDTO
                order: row.display_order,       // Needed for PublicDTO
                isPublished: Boolean(row.is_published),
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }))

            const list = dtoList(rawObjects)

            res.json(list)
        } catch (e) {
            console.error('[InfographicController] index error:', e?.message)
            res.status(500).json({ error: 'Failed to fetch infographics', details: e?.message })
        }
    }
}
