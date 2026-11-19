/**
 * @file lib/totp.js
 * @description RFC 6238 Time-based One-Time Password (TOTP) engine for admin two-factor authentication.
 */

import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import siteConfig from './siteConfig.js';

/**
 * Returns whether administrator 2FA is strictly required by environment configuration.
 * Only disabled when ADMIN_2FA_REQUIRED is explicitly the string 'false'.
 * @returns {boolean}
 */
export function isAdmin2FaRequired() {
  return process.env.ADMIN_2FA_REQUIRED !== 'false';
}

/**
 * Generates a new random Base32 encoded TOTP secret key.
 * @returns {string} 32-character base32 secret
 */
export function createTotpSecret() {
  return generateSecret();
}

/**
 * Generates the current 6-digit TOTP token for a given Base32 secret.
 * @param {string} secret
 * @returns {string}
 */
export function generateTotpToken(secret) {
  return generateSync({ secret });
}

/**
 * Validates a user-supplied 6-digit TOTP token against their secret.
 * Allows a +/- 1 step window to accommodate small device clock drift.
 * @param {string} secret - Admin's Base32 secret
 * @param {string} token - 6-digit token submitted by user
 * @returns {boolean} True if token matches
 */
export function verifyTotpToken(secret, token) {
  if (!secret || !token) {
    return false;
  }

  const cleanToken = token.trim();
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  try {
    const result = verifySync({
      secret,
      token: cleanToken,
      epochTolerance: 30,
    });
    return Boolean(result && result.valid);
  } catch (err) {
    return false;
  }
}

/**
 * Generates an otpauth:// URI and QR code data URL for mobile authenticator enrollment.
 * @param {string} email - Admin email address
 * @param {string} secret - Base32 TOTP secret
 * @returns {Promise<{ uri: string, qrCodeDataUrl: string }>}
 */
export async function generateTotpQrCode(email, secret) {
  const uri = generateURI({
    secret,
    label: email,
    issuer: siteConfig.name,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
  });

  return { uri, qrCodeDataUrl };
}
