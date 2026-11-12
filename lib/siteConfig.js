/**
 * @file lib/siteConfig.js
 * @description Centralized site configuration for JivikaHunt.
 * All brand names, contact details, social links, navigation items, and external service settings
 * reside here to prevent duplication and ensure consistency across the application.
 */

/**
 * @typedef {Object} NavItem
 * @property {string} label - Display text in navigation
 * @property {string} href - Destination path or URL
 */

/**
 * @typedef {Object} SocialLinks
 * @property {string} linkedin - LinkedIn channel/page URL
 * @property {string} telegram - Telegram channel URL
 * @property {string} whatsapp - WhatsApp channel/community URL
 * @property {string} instagram - Instagram profile URL
 * @property {string} facebook - Facebook page URL
 */

/**
 * @typedef {Object} SiteConfig
 * @property {string} name - Brand text wordmark
 * @property {string} tagline - Short slogan
 * @property {string} description - Meta description for SEO
 * @property {string} url - Canonical production base URL
 * @property {string} contactEmail - Shared contact email displayed in author box & footer
 * @property {SocialLinks} socials - Official social community links
 * @property {NavItem[]} nav - Top navigation links
 * @property {NavItem[]} categories - Footer job category links
 * @property {NavItem[]} quickLinks - Footer policy and informational links
 * @property {Object} ads - AdSense settings
 * @property {Object} pagination - Default list page sizes
 */

export const siteConfig = {
  name: 'JivikaHunt',
  tagline: 'Verified Freshers & Internships Job Board in India',
  description:
    'Browse clean, curated job listings for freshers and interns in India. Direct links to official company careers portals with zero spam.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://jivikahunt.com',
  contactEmail: 'contact@jivikahunt.com',

  // Social media community links (displayed in footer and share actions)
  socials: {
    linkedin: 'https://www.linkedin.com/company/jivikahunt',
    telegram: 'https://t.me/jivikahunt',
    whatsapp: 'https://whatsapp.com/channel/0029VaJivikaHunt',
    instagram: 'https://instagram.com/jivikahunt',
    facebook: 'https://facebook.com/jivikahunt',
  },

  // Top header navigation links
  nav: [
    { label: 'Freshers', href: '/jobs/type/fresher' },
    { label: 'Internships', href: '/jobs/type/intern' },
    { label: 'Remote', href: '/jobs/workmode/remote' },
    { label: 'Experienced', href: '/jobs/type/experienced' },
  ],

  // Footer column 2: Categories
  categories: [
    { label: 'Freshers Jobs', href: '/jobs/type/fresher' },
    { label: 'Internships', href: '/jobs/type/intern' },
    { label: 'Experienced Jobs', href: '/jobs/type/experienced' },
    { label: 'Remote Jobs', href: '/jobs/workmode/remote' },
  ],

  // Footer column 3: Quick links
  quickLinks: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Disclaimer', href: '/disclaimer' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],

  // Ads & Monetization configuration
  ads: {
    publisherId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '',
    enabled: Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID),
    adsTxtContent: `google.com, ${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'pub-0000000000000000'}, DIRECT, f08c47fec0942fa0`,
  },

  // Pagination parameters
  pagination: {
    jobsPerPage: 20,
    guidesPerPage: 10,
    adminJobsPerPage: 25,
  },

  // Legal footer notices
  disclaimerNote: 'We are not a recruiter. Always apply on the official company site.',
  copyrightText: `© ${new Date().getFullYear()} JivikaHunt. All rights reserved.`,
};

export default siteConfig;
