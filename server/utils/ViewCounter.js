
import { viewCache, VIEW_COOLDOWN_MS } from './viewCache.js'
import { isBotUserAgent } from './botDetector.js'

/**
 * Handles view counting with IP-based cooldown to prevent spam.
 * @param {import('express').Request} req The Express request object
 * @param {string} id The unique identifier of the item being viewed
 * @param {Function} incrementFn Async function to increment the count in DB
 * @returns {Promise<{success: boolean, counted: boolean, error?: string, reason?: string}>}
 */
export async function handleViewIncrement(req, id, incrementFn) {
    // Check if the request is from a bot
    const userAgent = req.get('user-agent') || req.headers['user-agent'] || ''
    if (isBotUserAgent(userAgent)) {
        return { success: true, counted: false, reason: 'bot' }
    }

    // Professional: Trust proxy for real IP, fallback to remoteAddress
    let clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown'
    if (Array.isArray(clientIP)) clientIP = clientIP[0]
    // Normalize IPv6 localhost
    if (clientIP === '::1') clientIP = '127.0.0.1'

    const cacheKey = `${clientIP}:${id}`
    const now = Date.now()

    // Check if this IP has viewed this content recently
    const lastViewTime = viewCache.get(cacheKey)
    if (lastViewTime && (now - lastViewTime) < VIEW_COOLDOWN_MS) {
        return { success: true, counted: false, reason: 'cooldown' }
    }

    // Optimistically reserve this slot to avoid race conditions from double triggers
    viewCache.set(cacheKey, now)

    try {
        await incrementFn(id)
        return { success: true, counted: true }
    } catch (e) {
        console.error(`[ViewCounter] increment error for ${id}:`, e?.message)
        viewCache.delete(cacheKey)
        return { success: false, counted: false, error: e?.message }
    }
}
