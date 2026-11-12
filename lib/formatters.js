/**
 * @file lib/formatters.js
 * @description Client-safe formatting utilities for initials and WhatsApp broadcast text.
 * Contains zero server-only dependencies (no sharp, no mongoose) so it can safely be imported
 * into both React Client Components and server-side route handlers.
 */

import siteConfig from './siteConfig';

/**
 * Derives 1 to 3 uppercase initials from a company or user name.
 * e.g., "Google" -> "GO", "Tata Consultancy Services" -> "TCS", "Accenture" -> "A"
 *
 * @param {string} name - Entity name
 * @returns {string} Clean initials
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') {
    return 'JH';
  }

  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && /^[A-Za-z0-9]/.test(w));

  if (words.length === 0) {
    return 'JH';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  // Take first letter of up to 3 words
  return words
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Formats job posting details for easy copying to WhatsApp Channels and Communities.
 *
 * @param {Object} job - Complete job posting object
 * @returns {string} WhatsApp-ready text with bold formatting and emojis
 */
export function formatWhatsAppJobMessage(job) {
  const typeBadge = (job.type || 'Job').toUpperCase();
  const workModeBadge = (job.workMode || 'Work').toUpperCase();
  const locations = job.locations?.join(', ') || 'India';
  const batches = job.batches?.length ? `*Batches:* ${job.batches.join(', ')}\n` : '';
  const salary = job.salary ? `*Salary:* ${job.salary}\n` : '';
  const skills = job.skills?.length ? `*Skills:* ${job.skills.join(', ')}\n` : '';

  return (
    `🚀 *${job.title}*\n` +
    `🏢 *Company:* ${job.company?.name || 'Company'}\n` +
    `📌 *Type:* ${typeBadge} | *Mode:* ${workModeBadge}\n` +
    `📍 *Location:* ${locations}\n` +
    batches +
    salary +
    skills +
    `\n📝 *Job Summary:*\n${job.summary}\n\n` +
    `🔗 *Official Apply Link:* ${job.applyUrl}\n\n` +
    `🌐 *View on ${siteConfig.name}:* ${siteConfig.url}/jobs/${job.slug}\n\n` +
    `⚠️ _Apply directly on the official company careers page. We never charge any fees._`
  );
}
