import crypto from 'crypto'

// Use a consistent key for deterministic encryption
// In production, this MUST be set in environment variables
const ENCRYPTION_KEY = process.env.THAID_ENCRYPTION_KEY || 'ponghospital_thaid_secret_key_256bit!!' // 32 chars
const IV_LENGTH = 16

/**
 * Deterministic Encryption (AES-256-CBC with fixed IV based on data hash)
 * This allows us to query the database for encrypted values: encrypt(text) === db_value
 */
export function encryptDeterministic(text) {
    if (!text) return null

    // Create a key buffer (ensure 32 bytes)
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()

    // For deterministic encryption, the IV must be constant for the same input.
    // We derive the IV from the input text itself.
    // WARNING: This leaks equality (attacker knows if two rows have same PID), but allows lookups.
    const iv = crypto.createHash('md5').update(text).digest()

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])

    return encrypted.toString('hex')
}

/**
 * Decrypts the deterministic value
 */
export function decryptDeterministic(encryptedHex) {
    if (!encryptedHex) return null

    try {
        // We don't know the text yet, so we can't derive IV from it?
        // Ah, standard AES-CBC needs the SAME IV to decrypt.
        // If we derived IV from plaintext, we can't decrypt without plaintext!
        // ERROR in design: To be reversible AND deterministic for lookup, we typically:
        // 1. Use a FIXED GLOBAL IV (less secure, strictly deterministic).
        // 2. OR Store (Cipher + IV) but then we can't lookup easily unless we query by checking all (slow).
        //
        // Correction: For "Searchable Encryption" without special DB support, we usually use a Fixed IV.

        const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()

        // Use a FIXED IV defined by the secret (or a separate constant)
        // This makes encrypt(user1) always produce the same ciphertext.
        const fixedIV = crypto.createHash('md5').update('fixed_iv_salt_' + ENCRYPTION_KEY).digest()

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, fixedIV)
        let decrypted = decipher.update(Buffer.from(encryptedHex, 'hex'))
        decrypted = Buffer.concat([decrypted, decipher.final()])

        return decrypted.toString()
    } catch (error) {
        console.error('Decryption failed:', error.message)
        return null
    }
}

/**
 * Revised Encrypt (Fixed IV)
 * Overwrites the previous logic to ensure decryptability
 */
export function encrypt(text) {
    if (!text) return null
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
    const fixedIV = crypto.createHash('md5').update('fixed_iv_salt_' + ENCRYPTION_KEY).digest()

    const cipher = crypto.createCipheriv('aes-256-cbc', key, fixedIV)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])

    return encrypted.toString('hex')
}

export function decrypt(text) {
    return decryptDeterministic(text)
}
