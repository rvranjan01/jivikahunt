/**
 * @file lib/jsonLd.js
 * @description Generates schema.org JobPosting and BreadcrumbList structured data (JSON-LD)
 * fully compliant with Google Search Central specifications for Job Vacancies.
 */

import { getEndOfDayIST } from '@/lib/time';
import siteConfig from '@/lib/siteConfig';

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
 * @param {Object} job
 * @returns {string}
 */
function buildSchemaDescription(job) {
  let desc = `<p>${job.summary || ''}</p>`;

  if (Array.isArray(job.responsibilities) && job.responsibilities.length > 0) {
    desc += '<h3>Key Responsibilities</h3><ul>';
    job.responsibilities.forEach((r) => {
      desc += `<li>${r}</li>`;
    });
    desc += '</ul>';
  }

  if (Array.isArray(job.eligibility) && job.eligibility.length > 0) {
    desc += '<h3>Eligibility & Qualifications</h3><ul>';
    job.eligibility.forEach((e) => {
      desc += `<li>${e}</li>`;
    });
    desc += '</ul>';
  }

  if (Array.isArray(job.skills) && job.skills.length > 0) {
    desc += `<p><strong>Skills:</strong> ${job.skills.join(', ')}</p>`;
  }

  return desc;
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

  /** @type {Record<string, any>} */
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: buildSchemaDescription(job),
    datePosted: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
    employmentType: mapEmploymentType(job.type),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company?.name || 'Company',
      sameAs: job.company?.slug ? `${siteConfig.url}/companies/${job.company.slug}` : undefined,
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
    schema.jobLocation = locations.map((loc) => ({
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: loc,
        addressCountry: 'IN',
      },
    }));
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
