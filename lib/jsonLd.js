/**
 * @file lib/jsonLd.js
 * @description Generates schema.org JobPosting and BreadcrumbList structured data (JSON-LD)
 * fully compliant with Google Search Central specifications for Job Vacancies.
 */

import { getEndOfDayIST, formatIST } from '@/lib/time';
import siteConfig from '@/lib/siteConfig';

/**
 * Escapes &, <, > characters for safe HTML/XML embedding.
 * @param {any} val
 * @returns {string}
 */
export function escapeHtmlXml(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Safely serialises a JSON-LD object to a string.
 * Replaces characters that can break an inline <script> tag:
 *   - `<`      → \u003c  (prevents `</script>` injection)
 *   - U+2028   → \u2028  (line separator — invalid in JS string literals)
 *   - U+2029   → \u2029  (paragraph separator — invalid in JS string literals)
 *
 * @param {Record<string, any>} obj
 * @returns {string}
 */
export function safeJsonLd(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Maps JivikaHunt job types to schema.org employmentType enum.
 * @param {string} type
 * @returns {'FULL_TIME' | 'INTERN' | 'PART_TIME' | 'CONTRACTOR'}
 */
function mapEmploymentType(type) {
  switch (type) {
    case 'intern':
      return 'INTERN';
    case 'fresher':
    case 'experienced':
    default:
      return 'FULL_TIME';
  }
}

/**
 * Builds HTML-formatted role description for Google JobPosting schema.
 * Strictly uses only <p>, <ul>, and <li> tags, escaping all inserted values.
 *
 * @param {Object} job
 * @returns {string}
 */
export function buildSchemaDescription(job) {
  if (!job) return '';
  const parts = [];

  if (job.summary) {
    parts.push(`<p>${escapeHtmlXml(job.summary)}</p>`);
  }

  if (job.company?.name) {
    parts.push(`<p>Company: ${escapeHtmlXml(job.company.name)}</p>`);
  }

  const locations = Array.isArray(job.locations) && job.locations.length > 0 ? job.locations : [];
  if (locations.length > 0) {
    parts.push(`<p>Location: ${escapeHtmlXml(locations.join(', '))}</p>`);
  }

  if (job.workMode) {
    parts.push(`<p>Work Mode: ${escapeHtmlXml(job.workMode)}</p>`);
  }

  if (job.type) {
    parts.push(`<p>Job Type: ${escapeHtmlXml(job.type)}</p>`);
  }

  if (job.salary && typeof job.salary === 'string' && job.salary.trim()) {
    parts.push(`<p>Salary: ${escapeHtmlXml(job.salary.trim())}</p>`);
  }

  if (Array.isArray(job.batches) && job.batches.length > 0) {
    parts.push(`<p>Eligible Batches: ${escapeHtmlXml(job.batches.join(', '))}</p>`);
  }

  if (job.lastDate) {
    const lastDateStr = formatIST(job.lastDate);
    if (lastDateStr) {
      parts.push(`<p>Last Date to Apply: ${escapeHtmlXml(lastDateStr)}</p>`);
    }
  }

  if (Array.isArray(job.responsibilities) && job.responsibilities.length > 0) {
    parts.push('<p>Key Responsibilities:</p>');
    parts.push(
      `<ul>${job.responsibilities.map((r) => `<li>${escapeHtmlXml(r)}</li>`).join('')}</ul>`
    );
  }

  if (Array.isArray(job.eligibility) && job.eligibility.length > 0) {
    parts.push('<p>Eligibility Criteria:</p>');
    parts.push(`<ul>${job.eligibility.map((e) => `<li>${escapeHtmlXml(e)}</li>`).join('')}</ul>`);
  }

  if (Array.isArray(job.skills) && job.skills.length > 0) {
    parts.push(`<p>Skills: ${escapeHtmlXml(job.skills.join(', '))}</p>`);
  }

  return parts.join('');
}

/**
 * Generates JobPosting JSON-LD object for a job posting.
 *
 * @param {Object} job - Job document
 * @returns {Object} schema.org JobPosting object
 */
export function generateJobPostingJsonLd(job) {
  if (!job) return null;

  const validThroughDate = job.lastDate ? getEndOfDayIST(job.lastDate) : null;
  const canonicalUrl = `${siteConfig.url}/jobs/${job.slug}`;
  const postedDate = job.publishedAt || job.createdAt || new Date();

  /** @type {Record<string, any>} */
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: buildSchemaDescription(job),
    datePosted: new Date(postedDate).toISOString(),
    employmentType: mapEmploymentType(job.type),
    identifier: {
      '@type': 'PropertyValue',
      name: job.company?.name || 'Company',
      value: String(job._id || ''),
    },
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company?.name || 'Company',
      logo: job.company?.logoId ? `${siteConfig.url}/img/${job.company.logoId}` : undefined,
    },
    // Since candidates apply directly on company careers portal, directApply MUST be false per Google spec
    directApply: false,
    url: canonicalUrl,
  };

  // IST application deadline expiration
  if (validThroughDate) {
    schema.validThrough = validThroughDate.toISOString();
  }

  // Work mode & Location mapping
  if (job.workMode === 'remote') {
    schema.jobLocationType = 'TELECOMMUTE';
    schema.applicantLocationRequirements = {
      '@type': 'Country',
      name: 'India',
    };
  } else {
    const locations =
      Array.isArray(job.locations) && job.locations.length > 0 ? job.locations : ['India'];
    schema.jobLocation = locations.map((loc) => {
      const trimmed = loc.trim();
      const lower = trimmed.toLowerCase();

      // Pan India / Anywhere in India / India -> addressCountry 'IN' with no locality
      if (lower === 'india' || lower === 'pan india' || lower === 'anywhere in india') {
        return {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'IN',
          },
        };
      }

      // City, State
      if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map((p) => p.trim());
        const locality = parts[0];
        const region = parts.slice(1).join(', ').trim();
        const address = {
          '@type': 'PostalAddress',
          addressLocality: locality,
          addressCountry: 'IN',
        };
        if (region) {
          address.addressRegion = region;
        }
        return {
          '@type': 'Place',
          address,
        };
      }

      // Plain city
      return {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: trimmed,
          addressCountry: 'IN',
        },
      };
    });
  }

  return schema;
}

/**
 * Generates BreadcrumbList JSON-LD object.
 *
 * @param {Array<{ name: string, url: string }>} items
 * @returns {Object} schema.org BreadcrumbList object
 */
export function generateBreadcrumbJsonLd(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
