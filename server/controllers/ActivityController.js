
import Activity from '../models/mysql/ActivityBlob.js'
import { userHasPermission } from '../middleware/auth.js'

export const ActivityController = {
    async index(req, res) {
        if (!req.app.locals.dbConnected) {
            return res.json([])
        }

        try {
            const { published, status, page, limit, q, sort } = req.query
            const isAuthed = Boolean(req.user)
            const canManage = isAuthed && userHasPermission(req.user, 'activities')

            let targetStatus = 'published' // Default to public view
            if (status && ['all', 'published', 'scheduled', 'hidden'].includes(status)) {
                if (status === 'published' || canManage) {
                    targetStatus = status
                }
            } else if (published === 'false' && canManage) {
                targetStatus = 'all'
            }

            const query = {
                status: targetStatus
            }

            if (q) {
                query.search = q
            }

            // Pagination logic
            const pageNum = Math.max(1, parseInt(page) || 1)
            const limitVal = Math.min(parseInt(limit) || 0, 100)
            const options = {
                sort: { publishedAt: -1, updatedAt: -1, createdAt: -1, date: -1 }
            }

            if (sort === 'oldest') {
                options.sort = { publishedAt: 1, updatedAt: 1, createdAt: 1, date: 1 }
            } else if (sort === 'newest') {
                options.sort = { publishedAt: -1, updatedAt: -1, createdAt: -1, date: -1 }
            }

            if (limitVal > 0) {
                options.limit = limitVal
                options.skip = (pageNum - 1) * limitVal
            }

            const list = await Activity.find(query, options)

            if (limitVal > 0) {
                const total = await Activity.countDocuments(query)
                res.setHeader('X-Total-Count', total)
                res.setHeader('X-Page', pageNum)
                res.setHeader('X-Per-Page', limitVal)
                res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
            }

            res.json(list)
        } catch (e) {
            console.error('[ActivityController] index error:', e?.message)
            const msg = String(e?.message || '')
            if (/not allowed to do action \[find\]/i.test(msg)) {
                return res.status(403).json({ error: 'Permission denied to read activities' })
            }
            res.status(500).json({ error: 'Failed to fetch activities', details: e?.message })
        }
    }
}
