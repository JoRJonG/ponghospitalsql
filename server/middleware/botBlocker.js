import { logger } from '../utils/logger.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BANNED_FILE = path.join(__dirname, '../banned-ips.json')

// In-memory storage for blocking
const ipViolations = new Map()
const blockedIps = new Map()

// Load bans from file
const loadBans = () => {
    try {
        if (fs.existsSync(BANNED_FILE)) {
            const data = fs.readFileSync(BANNED_FILE, 'utf-8')
            const bannedList = JSON.parse(data)
            for (const item of bannedList) {
                if (item.ip) {
                    // If no unblockTime (permanent) or future time, add to memory
                    if (!item.unblockTime || item.unblockTime > Date.now()) {
                        blockedIps.set(item.ip, item.unblockTime || Infinity)
                    }
                }
            }
        }
    } catch (e) {
        logger.error('[BotBlocker] Failed to load banned IPs:', e)
    }
}

// Save bans to file
const saveBans = () => {
    try {
        const list = []
        for (const [ip, unblockTime] of blockedIps.entries()) {
            // Save only if future ban or permanent
            if (unblockTime === Infinity || unblockTime > Date.now()) {
                list.push({ ip, unblockTime: unblockTime === Infinity ? null : unblockTime })
            }
        }
        fs.writeFileSync(BANNED_FILE, JSON.stringify(list, null, 2))
    } catch (e) {
        logger.error('[BotBlocker] Failed to save banned IPs:', e)
    }
}

// Initial load
loadBans()

// Export function to manually unban
export const unbanIp = (ip) => {
    if (blockedIps.has(ip)) {
        blockedIps.delete(ip)
        ipViolations.delete(ip)
        saveBans()
        logger.info(`[BotBlocker] IP ${ip} manually unbanned`)
        return true
    }
    // Check if it's in file even if not in memory (edge case)
    try {
        if (fs.existsSync(BANNED_FILE)) {
            const data = fs.readFileSync(BANNED_FILE, 'utf-8')
            const list = JSON.parse(data)
            const newList = list.filter(item => item.ip !== ip)
            if (list.length !== newList.length) {
                fs.writeFileSync(BANNED_FILE, JSON.stringify(newList, null, 2))
                return true
            }
        }
    } catch (e) { }
    return false
}

// Export function to manually ban
export const banIp = (ip, time = null) => {
    // time: null = permanent, number = timestamp
    const unblockTime = time ? time : Infinity
    blockedIps.set(ip, unblockTime)
    // Clear violation count as we are banning directly
    ipViolations.delete(ip)
    saveBans()
    logger.info(`[BotBlocker] IP ${ip} manually banned until ${unblockTime}`)
    return true
}

// 1. Block Bad User-Agents (Scanners/Bots)
const BAD_USER_AGENTS = [
    /sqlmap/i,
    /nikto/i,
    /wpscan/i,
    /acunetix/i,
    /nessus/i,
    /qualys/i,
    /nmap/i,
    /python-requests/i, // Often used by scripts (Warning: might block legit scripts if not careful)
    /curl/i,            // Often used by scripts (Warning: legit devs use curl too)
    /wget/i,
    /go-http-client/i,
    /masscan/i,
    /zgrab/i,
]

// 2. Suspicious Path Patterns (Honeypots)
const SUSPICIOUS_PATHS = [
    // Version Control
    /\/\.git/, /\/\.svn/, /\/\.hg/, /\/\.bzr/, /\/\.DS_Store/,

    // Config & Secrets
    /\.env/, /config\.js/, /wp-config\.php/, /\/storage\/logs/,
    /\/composer\.json/, /\/package\.json/, /\/package-lock\.json/,
    /\/actuator/, /\/jolokia/, // Spring Boot / Java probes

    // CMS & Admin Panels (PHP/ASP usually not in Node app)
    /wp-admin/, /wp-login/, /wp-includes/, /xmlrpc\.php/,
    /phpmyadmin/, /pma/, /adminer/,
    /\.php/i,  // Block all PHP requests (Except specific allowed ones if any)
    /\.asp/i, /\.aspx/i, /\.jsp/i, /\.cgi/i,

    // Backups & Archives
    /\.bak$/, /\.old$/, /\.swp$/, /\.sql$/, /\.zip$/, /\.tar\.gz$/, /\.rar$/,

    // System Files
    /\/etc\/passwd/, /\/win\.ini/, /\/boot\.ini/,
]

// Exceptions: Allow specific paths that might match patterns but are valid
const ALLOWED_PATHS = [
    '/sitemap.php', // Allow if you use sitemap.php
    '/api/images',  // Example
]

const BAN_THRESHOLD = 5 // Block after 5 violations
const BAN_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export const botBlocker = (req, res, next) => {
    const ip = req.ip
    const userAgent = req.get('User-Agent') || ''

    // 1. Clean up old blocks
    if (blockedIps.has(ip)) {
        const unblockTime = blockedIps.get(ip)
        if (unblockTime !== Infinity && Date.now() > unblockTime) {
            blockedIps.delete(ip)
            ipViolations.delete(ip)
            saveBans() // Update file on auto-unban
        } else {
            return res.status(403).send('Forbidden: Access denied due to suspicious activity.')
        }
    }

    // 2. Check Allowed Paths (Whitelist)
    if (ALLOWED_PATHS.some(path => req.path.startsWith(path) || req.path === path)) {
        return next()
    }

    let violation = false
    let reason = ''

    // 3. Check User-Agent (Immediate Block/Warn)
    // We won't ban immediately for UA, just block the request to avoid false positives on legitimate tools
    // But for aggressive scanners like sqlmap, we can count it as violation.
    /*
    if (BAD_USER_AGENTS.some(regex => regex.test(userAgent))) {
       // Optional: stricter handling for known bad tools
       violation = true
       reason = `Bad User-Agent: ${userAgent}`
    }
    */

    // 4. Check Suspicious Paths
    if (!violation) {
        if (SUSPICIOUS_PATHS.some(pattern => pattern.test(req.path))) {
            violation = true
            reason = `Suspicious Path: ${req.path}`
        }
    }

    if (violation) {
        const count = (ipViolations.get(ip) || 0) + 1
        ipViolations.set(ip, count)

        logger.warn(`[Security] Suspicious access attempt`, { ip, reason, count, userAgent })

        if (count >= BAN_THRESHOLD) {
            const unblockTime = Date.now() + BAN_DURATION
            blockedIps.set(ip, unblockTime)
            saveBans() // Save to file
            logger.warn(`[Security] IP Blocked`, { ip, duration: '24h' })
            return res.status(403).send('Forbidden: Too many suspicious requests. You are banned.')
        }

        // Return 404 to avoid leaking info that "we know you are scanning"
        // Or 403 if you prefer explicit denial
        return res.status(404).send('Not Found')
    }

    next()
}
