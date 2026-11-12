/**
 * @file lib/auth.js
 * @description Authentication utilities for password hashing, Jose JWT issuance,
 * session cookie management, and database-backed active session verification.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { connectToDatabase } from './db';
import User from '@/models/User';

export const SESSION_COOKIE_NAME = 'jh_session';
const DEFAULT_EXPIRY = '12h';
const COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

/**
 * Encodes the JWT secret into a Uint8Array suitable for Jose.
 * @returns {Uint8Array}
 */
function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET || 'jivikahunt_insecure_default_secret_key_at_least_32_characters';
  return new TextEncoder().encode(secret);
}

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Bcrypt hash
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
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

/**
 * Creates and signs a new JWT session token.
 * @param {Object} params
 * @param {string} params.userId - User MongoDB ObjectId string
 * @param {string} params.email - User email address
 * @param {string} params.role - User role ('admin' | 'contributor')
 * @param {number} params.tokenVersion - User's current tokenVersion
 * @returns {Promise<string>} Signed compact JWT
 */
export async function createSessionToken({ userId, email, role, tokenVersion }) {
  const secret = getJwtSecret();
  const expiry = process.env.JWT_EXPIRY || DEFAULT_EXPIRY;

  return new SignJWT({
    userId,
    email,
    role,
    tokenVersion,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(secret);
}

/**
 * Verifies a JWT token signature and expiration.
 * @param {string} token - Compact JWT string
 * @returns {Promise<Object|null>} Decoded payload or null if invalid/expired
 */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Attaches the session JWT to HTTP response headers as a secure httpOnly cookie.
 * @param {NextResponse} response - Next.js Response object
 * @param {string} token - Signed JWT token
 * @returns {NextResponse} Response with Set-Cookie header attached
 */
export function setSessionCookie(response, token) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

/**
 * Clears the session cookie from the response.
 * @param {NextResponse} response - Next.js Response object
 * @returns {NextResponse}
 */
export function clearSessionCookie(response) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/**
 * Extracts and verifies the active session user from the incoming request.
 * Crucially re-checks `isActive` and `tokenVersion` against the database on every call.
 * @param {Request} request - Next.js route handler request
 * @returns {Promise<Object|null>} Active User document or null if unauthenticated / deactivated / revoked
 */
export async function getSessionUser(request) {
  let token = null;

  // Try extracting from request cookie header
  if (request && request.headers) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  // Fallback to Next.js cookies() helper if available in current context
  if (!token) {
    try {
      const cookieStore = await cookies();
      const cookieObj = cookieStore.get(SESSION_COOKIE_NAME);
      if (cookieObj) {
        token = cookieObj.value;
      }
    } catch (err) {
      // Ignored if outside Next.js request context
    }
  }

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload || !payload.userId) {
    return null;
  }

  await connectToDatabase();
  const user = await User.findById(payload.userId);

  // Security checks:
  // 1. User exists in DB
  // 2. User is marked active (isActive === true)
  // 3. User's tokenVersion in DB matches tokenVersion in JWT payload (invalidates old tokens on password change/deactivation)
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    return null;
  }

  return user;
}

/**
 * Authentication gatekeeper for route handlers requiring a valid user.
 * @param {Request} request
 * @returns {Promise<{ user: Object } | { errorResponse: NextResponse }>}
 */
export async function requireAuth(request) {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Session invalid or expired. Please log in.' },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Authorization gatekeeper for route handlers requiring an admin role.
 * @param {Request} request
 * @returns {Promise<{ user: Object } | { errorResponse: NextResponse }>}
 */
export async function requireAdmin(request) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth;
  }

  if (auth.user.role !== 'admin') {
    return {
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Administrator privileges required.' },
        { status: 403 }
      ),
    };
  }

  return auth;
}
