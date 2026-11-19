/**
 * @file lib/security.js
 * @description Security utilities for IP hashing, NoSQL injection neutralization,
 * and client request origin validation.
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';

if (process.env.NODE_ENV === 'production' && !process.env.HASH_SALT) {
  throw new Error('HASH_SALT must be set in production');
}

/**
 * Creates a salted SHA-256 hash of an IP address to preserve user privacy while enabling rate limiting.
 * @param {string} ip - Client IP address
 * @returns {string} Salted hex hash
 */
export function hashIp(ip) {
  if (!ip || typeof ip !== 'string') {
    return 'unknown_ip';
  }
  const salt = process.env.HASH_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('HASH_SALT must be set in production');
    }
  }
  return crypto.createHmac('sha256', salt || '').update(ip.trim()).digest('hex');
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
 *
 * SECURITY: Do NOT trust cf-connecting-ip or the leftmost x-forwarded-for value.
 * Both can be spoofed by the client. On Heroku, the trusted proxy appends the
 * real client IP as the LAST entry in x-forwarded-for. We use that entry only.
 * cf-connecting-ip is set by Cloudflare, but a client can forge it on the
 * Heroku→origin leg if Cloudflare is misconfigured, so we ignore it.
 *
 * @param {Request} request - Next.js / Web Fetch Request
 * @returns {string} Detected client IP
 */
export function getClientIp(request) {
  const headers = request.headers;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const entries = forwarded.split(',');
    const lastIp = entries[entries.length - 1]?.trim();
    if (lastIp) return lastIp;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Checks that the request Origin matches the configured NEXT_PUBLIC_SITE_URL host.
 * Returns null when the origin is acceptable, or a 403 NextResponse to return immediately.
 *
 * Rules:
 *  - GET and HEAD requests with no Origin header are always allowed (browser navigation).
 *  - POST/PATCH/DELETE with no Origin header are rejected.
 *  - Any Origin whose host does not match NEXT_PUBLIC_SITE_URL is rejected.
 *
 * @param {Request} request
 * @returns {NextResponse|null} null means "origin OK, continue"; a response means "stop here"
 */
export function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  const method = request.method?.toUpperCase();

  // Safe read-only methods without an Origin are normal browser navigations — allow
  if (!origin && (method === 'GET' || method === 'HEAD')) return null;

  if (!origin) {
    return NextResponse.json({ error: 'Forbidden: Missing Origin header' }, { status: 403 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  try {
    const originHost = new URL(origin).host;
    const siteHost = new URL(siteUrl).host;
    if (originHost !== siteHost) {
      return NextResponse.json(
        { error: 'Forbidden: Cross-origin request rejected' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json({ error: 'Forbidden: Invalid Origin header' }, { status: 403 });
  }

  return null; // origin is valid, caller may proceed
}
