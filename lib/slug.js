/**
 * @file lib/slug.js
 * @description URL slug generation utilities with collision resolution for jobs and companies.
 */

import { connectToDatabase } from './db';
import Job from '@/models/Job';

/**
 * Converts a string into a clean, URL-safe kebab-case slug.
 *
 * @param {string} text - Raw input string
 * @returns {string} Lowercase hyphenated slug
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    .trim()
    .normalize('NFD') // Normalize unicode
    .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars (except spaces and hyphens)
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with single hyphen
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with one
    .replace(/^-+|-+$/g, ''); // Trim leading and trailing hyphens
}

/**
 * Generates a clean URL slug for a company.
 *
 * @param {string} companyName - Company name
 * @returns {string} Clean company slug
 */
export function generateCompanySlug(companyName) {
  return slugify(companyName) || 'company';
}

/**
 * Generates an automatic, collision-resistant unique slug for a job posting.
 * Format: `${title}-at-${companyName}` (with `-2`, `-3` if collision occurs).
 *
 * @param {string} title - Job title
 * @param {string} companyName - Company name
 * @param {string} [excludeJobId] - Optional job ID to ignore (for edits of the same job)
 * @returns {Promise<string>} Unique job slug
 */
export async function generateUniqueJobSlug(title, companyName, excludeJobId = null) {
  const baseTitle = slugify(title) || 'job';
  const baseCompany = slugify(companyName) || 'company';
  const baseSlug = `${baseTitle}-at-${baseCompany}`;

  await connectToDatabase();

  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug: candidateSlug };
    if (excludeJobId) {
      query._id = { $ne: excludeJobId };
    }

    const existing = await Job.findOne(query).select('_id').lean();
    if (!existing) {
      return candidateSlug;
    }

    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }
}

/**
 * Generates an automatic, collision-resistant unique slug for a guide article.
 *
 * @param {string} title - Guide title
 * @param {string} [excludeGuideId] - Optional guide ID to ignore (for edits)
 * @returns {Promise<string>} Unique guide slug
 */
export async function generateUniqueGuideSlug(title, excludeGuideId = null) {
  const baseSlug = slugify(title) || 'guide';

  await connectToDatabase();
  const Guide = (await import('@/models/Guide')).default;

  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug: candidateSlug };
    if (excludeGuideId) {
      query._id = { $ne: excludeGuideId };
    }

    const existing = await Guide.findOne(query).select('_id').lean();
    if (!existing) {
      return candidateSlug;
    }

    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }
}
