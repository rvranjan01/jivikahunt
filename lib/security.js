/**
 * @file lib/security.js
 * @description Security utilities for IP hashing, NoSQL injection neutralization,
 * and client request origin validation.
 */

import crypto from 'crypto';

const HASH_SALT = process.env.HASH_SALT || 'jivikahunt_default_secure_salt_2026';

/**
 * Creates a salted SHA-256 hash of an IP address to preserve user privacy while enabling rate limiting.
 * @param {string} ip - Client IP address
 * @returns {string} Salted hex hash
 */
export function hashIp(ip) {
  if (!ip || typeof ip !== 'string') {
    return 'unknown_ip';
  }
  return crypto.createHmac('sha256', HASH_SALT).update(ip.trim()).digest('hex');
}

/**
 * Recursively sanitizes object keys to prevent MongoDB NoSQL operator injection.
 * Strips any key that starts with '$' or contains a period ('.').
 * @template T
 * @param {T} data - Object or value to sanitize
 * @returns {T} Sanitized object
 */
export function sanitizeNoSql(data) {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeNoSql(item));
  }

  const cleanObject = {};
  for (const [key, value] of Object.entries(data)) {
    // Drop keys that are operators ($where, $gt) or attempt sub-document traversal with '.'
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleanObject[key] = sanitizeNoSql(value);
  }

  return cleanObject;
}

/**
 * Extracts the real client IP address from request headers.
 * Handles Cloudflare, standard reverse proxies, and direct connections.
 * @param {Request} request - Next.js / Web Fetch Request
 * @returns {string} Detected client IP
 */
export function getClientIp(request) {
  const headers = request.headers;
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0];
    if (firstIp) return firstIp.trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}
