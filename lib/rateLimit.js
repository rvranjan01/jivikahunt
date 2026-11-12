/**
 * @file lib/rateLimit.js
 * @description Brute-force protection and rate limiting using MongoDB TTL collection LoginAttempt.
 * Tracks failed attempts by both IP and email address.
 */

import { connectToDatabase } from './db';
import LoginAttempt from '@/models/LoginAttempt';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const TTL_EXPIRY_MS = 60 * 60 * 1000; // 1 hour TTL document expiry

/**
 * Checks whether an IP or email address is currently locked out from logging in.
 * @param {string} ip - Client IP address
 * @param {string} email - Attempted login email address
 * @returns {Promise<{ allowed: boolean, reason?: string, remainingSeconds?: number }>}
 */
export async function checkLoginRateLimit(ip, email) {
  await connectToDatabase();

  const now = new Date();
  const keys = [`ip:${ip.trim()}`, `email:${email.trim().toLowerCase()}`];

  const attempts = await LoginAttempt.find({
    key: { $in: keys },
  });

  for (const record of attempts) {
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        reason: `Account temporarily locked due to repeated failed logins. Please try again in ${Math.ceil(remainingSeconds / 60)} minute(s).`,
        remainingSeconds,
      };
    }
  }

  return { allowed: true };
}

/**
 * Increments failed attempt counter for both IP and email.
 * Triggers temporary lockout if threshold is reached.
 * @param {string} ip - Client IP address
 * @param {string} email - Attempted login email address
 */
export async function recordFailedLogin(ip, email) {
  await connectToDatabase();

  const now = new Date();
  const keys = [`ip:${ip.trim()}`, `email:${email.trim().toLowerCase()}`];
  const expiresAt = new Date(now.getTime() + TTL_EXPIRY_MS);

  for (const key of keys) {
    const existing = await LoginAttempt.findOne({ key });

    if (!existing) {
      await LoginAttempt.create({
        key,
        attempts: 1,
        expiresAt,
      });
    } else {
      const newAttempts = (existing.attempts || 0) + 1;
      const updates = {
        attempts: newAttempts,
        expiresAt,
      };

      if (newAttempts >= MAX_ATTEMPTS) {
        updates.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
      }

      await LoginAttempt.updateOne({ key }, { $set: updates });
    }
  }
}

/**
 * Resets failed login counters for IP and email upon successful authentication.
 * @param {string} ip - Client IP address
 * @param {string} email - Authenticated email address
 */
export async function clearLoginRateLimit(ip, email) {
  try {
    await connectToDatabase();
    const keys = [`ip:${ip.trim()}`, `email:${email.trim().toLowerCase()}`];
    await LoginAttempt.deleteMany({ key: { $in: keys } });
  } catch (err) {
    console.error('Failed to clear login rate limit:', err.message);
  }
}

const REPORT_MAX_ATTEMPTS = 5;
const REPORT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Checks whether an IP hash has exceeded the maximum allowed report submissions per hour.
 *
 * @param {string} ipHash - Salted IP hash
 * @returns {Promise<{ allowed: boolean, remainingCount: number }>}
 */
export async function checkReportRateLimit(ipHash) {
  await connectToDatabase();
  const key = `report:${ipHash}`;
  const record = await LoginAttempt.findOne({ key });

  if (record && record.attempts >= REPORT_MAX_ATTEMPTS) {
    return {
      allowed: false,
      remainingCount: 0,
    };
  }

  const currentAttempts = record ? record.attempts : 0;
  return {
    allowed: true,
    remainingCount: REPORT_MAX_ATTEMPTS - currentAttempts,
  };
}

/**
 * Increments the report submission counter for an IP hash.
 *
 * @param {string} ipHash - Salted IP hash
 */
export async function recordReportSubmission(ipHash) {
  await connectToDatabase();
  const now = new Date();
  const key = `report:${ipHash}`;
  const expiresAt = new Date(now.getTime() + REPORT_WINDOW_MS);

  const existing = await LoginAttempt.findOne({ key });
  if (!existing) {
    await LoginAttempt.create({
      key,
      attempts: 1,
      expiresAt,
    });
  } else {
    await LoginAttempt.updateOne(
      { key },
      {
        $inc: { attempts: 1 },
        $set: { expiresAt },
      }
    );
  }
}
