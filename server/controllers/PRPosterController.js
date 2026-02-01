
import { query } from '../database.js'
import { userHasPermission } from '../middleware/auth.js'
import { toPRPosterDTO } from '../dto/PRPosterDTO.js'

export const PRPosterController = {
    async index(req, res) {
        if (!req.app.locals.dbConnected) {
            return res.status(503).json({ error: 'Database unavailable' })
        }

        try {
            const { published, page, limit } = req.query
            const wantAll = published === 'false'
            const isAuthed = Boolean(req.user)
            const allowAll = wantAll && isAuthed && userHasPermission(req.user, 'infographics') // Reuse infographic permission or add new one later

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
                const countRows = await query(`SELECT COUNT(*) as total FROM pr_posters ${whereClause}`, [])
                const total = countRows[0]?.total || 0
                res.setHeader('X-Total-Count', total)
                res.setHeader('X-Page', pageNum)
                res.setHeader('X-Per-Page', limitVal)
                res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
            }

            // 2. Get Data
            const rows = await query(
                `SELECT id, title, image_size, mime_type, display_order, is_published, created_at, updated_at 
         FROM pr_posters 
         ${whereClause}
         ORDER BY display_order ASC, created_at DESC
         ${limitClause}`,
                params
            )

            const list = rows.map(toPRPosterDTO)

            res.json(list)
        } catch (e) {
            console.error('[PRPosterController] index error:', e?.message)
            res.status(500).json({ error: 'Failed to fetch PR posters', details: e?.message })
        }
    }
}
