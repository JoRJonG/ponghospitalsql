

import Announcement from '../models/mysql/Announcement.js'
import { userHasPermission } from '../middleware/auth.js'
import { toPublicDTOList, toAdminDTOList } from '../dto/AnnouncementDTO.js'

export const AnnouncementController = {
    async index(req, res) {
        if (!req.app.locals.dbConnected) {
            return res.json([])
        }

        try {
            const { category, published, status, page, limit, q, sort } = req.query
            const isAuthed = Boolean(req.user)
            const canManage = isAuthed && userHasPermission(req.user, 'announcements')

            let targetStatus = 'published' // Default to public view
            if (status && ['all', 'published', 'scheduled', 'hidden'].includes(status)) {
                if (status === 'published' || canManage) {
                    targetStatus = status
                }
            } else if (published === 'false' && canManage) {
                targetStatus = 'all'
            }

            const query = {
                ...(category ? { category } : {}),
                ...(q ? { search: q } : {}),
                status: targetStatus
            }

            // Pagination logic
            const pageNum = Math.max(1, parseInt(page) || 1)
            const limitVal = Math.min(parseInt(limit) || 0, 100)
            const options = {
                sort: { publishedAt: -1, createdAt: -1 }
            }

            if (sort === 'oldest') {
                options.sort = { publishedAt: 1, createdAt: 1 }
            } else if (sort === 'newest') {
                options.sort = { publishedAt: -1, createdAt: -1 }
            }

            if (limitVal > 0) {
                options.limit = limitVal
                options.skip = (pageNum - 1) * limitVal
            }

            // Execute query
            const list = await Announcement.find(query, options)

            // กรองข้อมูลด้วย DTO ก่อนส่งให้ client
            const filteredList = canManage ? toAdminDTOList(list) : toPublicDTOList(list)

            // If pagination is requested, we should provide total count in headers
            if (limitVal > 0) {
                const total = await Announcement.countDocuments(query)
                res.setHeader('X-Total-Count', total)
                res.setHeader('X-Page', pageNum)
                res.setHeader('X-Per-Page', limitVal)
                res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
            }

            res.json(filteredList)
        } catch (e) {
            console.error('[AnnouncementController] index error:', e?.message)
            const msg = String(e?.message || '')
            if (/not allowed to do action \[find\]/i.test(msg)) {
                return res.status(403).json({ error: 'Permission denied to read announcements' })
            }
            res.status(500).json({ error: 'Failed to fetch announcements', details: e?.message })
        }
    }
}
