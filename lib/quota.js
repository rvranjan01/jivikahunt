/**
 * @file lib/quota.js
 * @description Contributor daily publication quota management and WhatsApp broadcast text formatter.
 */

import { connectToDatabase } from './db';
import Job from '@/models/Job';
export { formatWhatsAppJobMessage } from './formatters';

export const DEFAULT_DAILY_LIMIT = 30;

/**
 * Returns the maximum daily jobs a contributor can create.
 * @returns {number}
 */
export function getDailyLimit() {
  const envVal = parseInt(process.env.CONTRIBUTOR_DAILY_LIMIT || '', 10);
  return isNaN(envVal) || envVal <= 0 ? DEFAULT_DAILY_LIMIT : envVal;
}

/**
 * Checks if a contributor has exceeded their 24-hour job creation quota.
 * Admins have unlimited posting capacity.
 *
 * @param {Object} user - User document
 * @returns {Promise<{ allowed: boolean, remaining: number, totalToday: number, limit: number }>}
 */
export async function checkContributorDailyQuota(user) {
  const limit = getDailyLimit();

  // Admin accounts are exempt from daily limits
  if (user.role === 'admin') {
    return { allowed: true, remaining: 9999, totalToday: 0, limit };
  }

  await connectToDatabase();
  const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const count = await Job.countDocuments({
    createdBy: user._id,
    createdAt: { $gte: past24Hours },
  });

  const remaining = Math.max(0, limit - count);

  return {
    allowed: count < limit,
    remaining,
    totalToday: count,
    limit,
  };
}

/**
 * Returns the number of job postings remaining for a user today.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<number>}
 */
export async function getContributorQuotaRemaining(userId) {
  const limit = getDailyLimit();
  await connectToDatabase();
  const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await Job.countDocuments({
    createdBy: userId,
    createdAt: { $gte: past24Hours },
  });
  return Math.max(0, limit - count);
}
