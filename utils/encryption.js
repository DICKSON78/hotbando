/**
 * Encryption Utility
 * Handles encryption/decryption of sensitive data like router passwords
 * Uses AES-256-GCM for authenticated encryption
 */

const crypto = require('crypto');
const logger = require('./logger');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;

// Encryption key from environment (must be 32 bytes hex)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Derive encryption key from passphrase using PBKDF2
 */
function deriveKey(passphrase, salt) {
    return crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha512');
}

/**
 * Encrypt sensitive data (e.g., router passwords)
 * Returns: salt:iv:tag:ciphertext (all hex-encoded)
 */
function encrypt(plaintext) {
    if (!plaintext) return plaintext;
    
    try {
        const salt = crypto.randomBytes(SALT_LENGTH / 2);
        const key = deriveKey(ENCRYPTION_KEY, salt);
        const iv = crypto.randomBytes(IV_LENGTH);
        
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const tag = cipher.getAuthTag();
        
        // Format: salt:iv:tag:ciphertext
        return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
        logger.error('Encryption failed', { error: error.message });
        throw new Error('Encryption failed');
    }
}

/**
 * Decrypt sensitive data
 * Input: salt:iv:tag:ciphertext (all hex-encoded)
 */
function decrypt(ciphertext) {
    if (!ciphertext) return ciphertext;
    
    // Check if already encrypted (has the expected format)
    const parts = ciphertext.split(':');
    if (parts.length !== 4) {
        // Not encrypted, return as-is (backward compatibility)
        return ciphertext;
    }
    
    try {
        const salt = Buffer.from(parts[0], 'hex');
        const iv = Buffer.from(parts[1], 'hex');
        const tag = Buffer.from(parts[2], 'hex');
        const encrypted = parts[3];
        
        const key = deriveKey(ENCRYPTION_KEY, salt);
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        logger.error('Decryption failed', { error: error.message });
        throw new Error('Decryption failed');
    }
}

/**
 * Check if a string is already encrypted
 */
function isEncrypted(data) {
    if (!data || typeof data !== 'string') return false;
    const parts = data.split(':');
    return parts.length === 4 && 
           parts.every(part => /^[0-9a-f]+$/i.test(part));
}

/**
 * Hash password for storage (one-way, for user passwords)
 */
function hashPassword(password) {
    const bcrypt = require('bcryptjs');
    return bcrypt.hash(password, 12);
}

/**
 * Verify password against hash
 */
function verifyPassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, hash);
}

module.exports = {
    encrypt,
    decrypt,
    isEncrypted,
    hashPassword,
    verifyPassword
};