/**
 * @file lib/password.js
 * @description Password hashing and temporary credential generation utilities.
 * Plain Node.js compatible with zero Next.js runtime dependencies.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds.
 * Cost 12 is the recommended minimum for 2025+ hardware.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Bcrypt hash
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * @param {string} password - Plain text password
 * @param {string} hash - Bcrypt hash from database
 * @returns {Promise<boolean>} True if match
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Generates a high-entropy random temporary password for contributor invitations.
 * @param {number} [length=14] - Password length
 * @returns {string} Temporary password containing upper, lower, numbers, and symbols
 */
export function generateTemporaryPassword(length = 14) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}
