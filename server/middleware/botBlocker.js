import { logger } from '../utils/logger.js'

// In-memory storage for blocking (Note: Reset on server restart)
const ipViolations = new Map()
const blockedIps = new Map()

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
        if (Date.now() < unblockTime) {
            return res.status(403).send('Forbidden: Access denied due to suspicious activity.')
        }
        blockedIps.delete(ip)
        ipViolations.delete(ip)
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
            logger.warn(`[Security] IP Blocked`, { ip, duration: '24h' })
            return res.status(403).send('Forbidden: Too many suspicious requests. You are banned.')
        }

        // Return 404 to avoid leaking info that "we know you are scanning"
        // Or 403 if you prefer explicit denial
        return res.status(404).send('Not Found')
    }

    next()
}
