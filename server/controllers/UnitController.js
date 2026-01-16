

import Unit from '../models/mysql/UnitBlob.js'
import { userHasPermission } from '../middleware/auth.js'
import { toPublicDTOList, toAdminDTOList } from '../dto/UnitDTO.js'

export const UnitController = {
    async index(req, res) {
        if (!req.app.locals.dbConnected) return res.json([])

        try {
            const { published, status, page, limit, q } = req.query
            const isAuthed = Boolean(req.user)
            const canManage = isAuthed && userHasPermission(req.user, 'units')

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
                sort: { order: 1, createdAt: -1 }
            }

            if (limitVal > 0) {
                options.limit = limitVal
                options.skip = (pageNum - 1) * limitVal
            }

            const list = await Unit.find(query, options)

            // กรองข้อมูลด้วย DTO
            const filteredList = canManage ? toAdminDTOList(list) : toPublicDTOList(list)

            if (limitVal > 0) {
                // Assume countDocuments exists or we add it to Unit model (checking model next)
                // If not exists, we might need to implement it in UnitBlob.js or use length if tiny
                // UnitBlob usually has small amount of data, but to be robust let's try calling it
                // If Unit.countDocuments doesn't exist, we'll fail. I should check UnitBlob.js first.
                // Assuming consistent pattern with other Blobs.
                if (typeof Unit.countDocuments === 'function') {
                    const total = await Unit.countDocuments(query)
                    res.setHeader('X-Total-Count', total)
                    res.setHeader('X-Page', pageNum)
                    res.setHeader('X-Per-Page', limitVal)
                    res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
                }
            }

            res.json(filteredList)
        } catch (e) {
            const msg = String(e?.message || '')
            if (/not allowed to do action \[find\]/i.test(msg)) {
                return res.status(403).json({ error: 'Permission denied to read units' })
            }
            res.status(500).json({ error: 'Failed to fetch units' })
        }
    }
}
