import * as openidClient from 'openid-client'
import dotenv from 'dotenv'
import { logger } from '../utils/logger.js'

dotenv.config()

let thaidClient = null
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
 * ดึง ThaID OpenID Connect Configuration
 * Auto-discover หรือ Manual Config
 */
export async function getThaIDClient() {
    // ถ้าเคย initialize สำเร็จแล้ว ให้ return config object
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
        const issuerUrl = process.env.THAID_ISSUER || 'https://imauth.bora.dopa.go.th'
        let config


        // 2. ถ้า Auto-discovery พัง หรือต้องการ Force Config ให้ใช้ Manual Config
        // ThaID มักจะต้องการ client_secret_post 
        config = new openidClient.Issuer({
            issuer: issuerUrl,
            authorization_endpoint: `${issuerUrl}/api/v2/oauth2/auth/`,
            token_endpoint: `${issuerUrl}/api/v2/oauth2/token/`,
            userinfo_endpoint: `${issuerUrl}/api/v2/oauth2/userinfo/`,
            revocation_endpoint: `${issuerUrl}/api/v2/oauth2/revoke/`,
            introspection_endpoint: `${issuerUrl}/api/v2/oauth2/introspect/`,
        }).Client({
            client_id: process.env.THAID_CLIENT_ID,
            client_secret: process.env.THAID_CLIENT_SECRET,
            redirect_uris: [process.env.THAID_REDIRECT_URI],
            token_endpoint_auth_method: 'client_secret_post' // Force POST method
        })

        logger.info('[ThaID] Using Manual Configuration with client_secret_post')

        // เก็บ config ไว้ใช้
        thaidClient = config
        return thaidClient

    } catch (error) {
        initializationError = error
        logger.error('[ThaID] Failed to initialize client:', error.message)
        throw new Error(`ThaID client initialization failed: ${error.message}`)
    }
}

/**
 * Helper to get the redirect URI
 */
export function getRedirectUri() {
    return process.env.THAID_REDIRECT_URI
}

/**
 * ตรวจสอบว่า ThaID พร้อมใช้งานหรือไม่
 */
export function isThaidAvailable() {
    return hasThaidCredentials()
}

export default { getThaIDClient, getRedirectUri, isThaidAvailable }
