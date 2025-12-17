
import Slide from '../models/mysql/SlideBlob.js'
import { userHasPermission } from '../middleware/auth.js'

export const SlideController = {
    async index(req, res) {
        if (!req.app.locals.dbConnected) {
            return res.json([])
        }

        try {
            const { published, status, page, limit, q } = req.query
            const isAuthed = Boolean(req.user)
            const canManage = isAuthed && userHasPermission(req.user, 'slides')

            let targetStatus = 'published'
            if (status && ['all', 'published', 'hidden'].includes(status)) {
                if (status === 'published' || canManage) targetStatus = status
            } else if (published === 'false' && canManage) {
                targetStatus = 'all'
            }

            const query = {
                status: targetStatus
            }
            if (q) query.search = q

            // Pagination logic
            const pageNum = Math.max(1, parseInt(page) || 1)
            const limitVal = Math.min(parseInt(limit) || 0, 100)
            const options = {
                sort: { order: 1, createdAt: -1 } // Default sort
            }

            if (limitVal > 0) {
                options.limit = limitVal
                options.skip = (pageNum - 1) * limitVal
            }

            const list = await Slide.find(query, options)

            if (limitVal > 0) {
                const total = await Slide.countDocuments(query)
                res.setHeader('X-Total-Count', total)
                res.setHeader('X-Page', pageNum)
                res.setHeader('X-Per-Page', limitVal)
                res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
            }

            res.json(list)
        } catch (e) {
            console.error('[SlideController] index error:', e?.message)
            res.status(500).json({ error: 'Failed to fetch slides' })
        }
    }
}
