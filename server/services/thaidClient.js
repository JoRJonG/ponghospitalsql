import * as openidClient from 'openid-client'
import dotenv from 'dotenv'
import { logger } from '../utils/logger.js'

dotenv.config()

let thaidClient = null
let thaidIssuer = null
let initializationAttempted = false
let initializationError = null

/**
 * ตรวจสอบว่ามี ThaID credentials หรือไม่
 */
function hasThaidCredentials() {
    return Boolean(
        process.env.THAID_CLIENT_ID &&
        process.env.THAID_CLIENT_SECRET &&
        process.env.THAID_REDIRECT_URI
    )
}

/**
 * ดึง ThaID OpenID Connect Client
 * Auto-discover configuration จาก ThaID issuer
 */
export async function getThaIDClient() {
    // ถ้าเคย initialize สำเร็จแล้ว ให้ return client
    if (thaidClient) return thaidClient

    // ถ้าเคยพยายามแล้วแต่ล้มเหลว ให้ throw error เดิม
    if (initializationAttempted && initializationError) {
        throw initializationError
    }

    // ตรวจสอบว่ามี credentials หรือไม่
    if (!hasThaidCredentials()) {
        const error = new Error(
            'ThaID credentials not configured. Please set THAID_CLIENT_ID, THAID_CLIENT_SECRET, and THAID_REDIRECT_URI in .env file.'
        )
        initializationError = error
        initializationAttempted = true
        logger.warn('[ThaID] Credentials not configured, ThaID login will be disabled')
        throw error
    }

    initializationAttempted = true

    try {
        // Auto-discover ThaID OpenID Connect configuration
        if (!thaidIssuer) {
            const issuerUrl = process.env.THAID_ISSUER || 'https://imauth.bora.dopa.go.th'
            logger.info('[ThaID] Discovering issuer:', issuerUrl)
            thaidIssuer = await openidClient.Issuer.discover(issuerUrl)
            logger.info('[ThaID] Issuer discovered:', thaidIssuer.metadata.issuer)
        }

        // สร้าง OpenID Client
        thaidClient = new thaidIssuer.Client({
            client_id: process.env.THAID_CLIENT_ID,
            client_secret: process.env.THAID_CLIENT_SECRET,
            redirect_uris: [process.env.THAID_REDIRECT_URI],
            response_types: ['code'],
            token_endpoint_auth_method: 'client_secret_basic', // Enforce Basic Auth header as per PDF
        })

        logger.info('[ThaID] Client created successfully')
        return thaidClient
    } catch (error) {
        initializationError = error
        logger.error('[ThaID] Failed to create client:', error.message)
        throw new Error(`ThaID client initialization failed: ${error.message}`)
    }
}

/**
 * ดึง ThaID Issuer (สำหรับ advanced use cases)
 */
export async function getThaIDIssuer() {
    if (!thaidIssuer) {
        await getThaIDClient() // จะสร้าง issuer ด้วย
    }
    return thaidIssuer
}

/**
 * ตรวจสอบว่า ThaID พร้อมใช้งานหรือไม่
 */
export function isThaidAvailable() {
    return hasThaidCredentials()
}

export default { getThaIDClient, getThaIDIssuer, isThaidAvailable }
