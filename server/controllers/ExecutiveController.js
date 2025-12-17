
import Executive from '../models/mysql/Executive.js'
import { userHasPermission } from '../middleware/auth.js'

export const ExecutiveController = {
    async index(req, res) {
        if (!req.app.locals.dbConnected) {
            return res.status(503).json({ error: 'Database unavailable' })
        }

        try {
            const { published, page, limit } = req.query
            const wantAll = published === 'false'
            const isAuthed = Boolean(req.user)
            const allowAll = wantAll && isAuthed && userHasPermission(req.user, 'executives')
            const publishedOnly = !allowAll

            // Pagination logic
            const pageNum = Math.max(1, parseInt(page) || 1)
            const limitVal = parseInt(limit) || 0

            // Use existing findAll
            const all = await Executive.findAll(publishedOnly)

            if (limitVal === 0) {
                return res.json(all)
            }

            // In-memory pagination
            const total = all.length
            const start = (pageNum - 1) * limitVal
            const end = start + limitVal
            const sliced = all.slice(start, end)

            res.setHeader('X-Total-Count', total)
            res.setHeader('X-Page', pageNum)
            res.setHeader('X-Per-Page', limitVal)
            res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))

            res.json(sliced)
        } catch (e) {
            console.error('[ExecutiveController] index error:', e?.message)
            res.status(500).json({ error: 'Failed to fetch executives', details: e?.message })
        }
    }
}
