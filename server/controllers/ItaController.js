
import { ItaItem } from '../models/mysql/ItaItem.js'
import { userHasPermission } from '../middleware/auth.js'

export const ItaController = {
    // Tree structure (usually no pagination)
    async tree(req, res) {
        if (!req.app.locals.dbConnected) {
            return res.json([])
        }
        try {
            const includeUnpublished = !!req.user && userHasPermission(req.user, 'ita')
            const tree = await ItaItem.findTree({ includeUnpublished })
            res.json(tree)
        } catch (e) {
            console.error('[ItaController] tree error:', e?.message)
            res.status(500).json({ error: 'Failed to fetch ITA tree', details: e?.message })
        }
    },

    // Flat list (standardizable)
    async index(req, res) {
        try {
            if (!req.app.locals.dbConnected) {
                return res.json([])
            }

            const includeUnpublished = !!req.user && userHasPermission(req.user, 'ita')
            const { page, limit } = req.query

            // Pagination logic
            const pageNum = Math.max(1, parseInt(page) || 1)
            const limitVal = parseInt(limit) || 0

            // If no limit, use existing findAll behavior
            if (limitVal === 0) {
                const all = await ItaItem.findAll({ includeUnpublished, excludeContent: true })
                return res.json(all)
            }

            // If limit exists, we ideally need a paginated find in ItaItem or slice the result.
            // Since ItaItem.js might abstract SQL, let's check if we can verify strict pagination support deeply.
            // For now, doing in-memory slicing if native support is missing is less efficient but safe for small datasets (ITA is usually small).
            // However, to be "standard" and if data grows, we should push down to SQL.
            // Let's assume for now we use the findAll and slice if the model doesn't support pagination, 
            // OR better, we check ItaItem.js content. I know from context it has findAll.

            // Optimize: Exclude content for list views
            const all = await ItaItem.findAll({ includeUnpublished, excludeContent: true })
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
            console.error('[ItaController] index error:', e?.message)
            res.status(500).json({ error: 'Failed to fetch ITA items', details: e?.message })
        }
    }
}
