import { describe, it, expect } from 'vitest';
import siteConfig from '@/lib/siteConfig';

describe('Site Configuration (lib/siteConfig.js)', () => {
  it('should load brand name and core metadata', () => {
    expect(siteConfig).toBeDefined();
    expect(siteConfig.name).toBe('JivikaHunt');
    expect(siteConfig.tagline).toBeTypeOf('string');
    expect(siteConfig.description).toBeTypeOf('string');
    expect(siteConfig.url).toBeTypeOf('string');
    expect(siteConfig.contactEmail).toBe('contact@jivikahunt.com');
  });

  it('should include all required social channels', () => {
    const { socials } = siteConfig;
    expect(socials).toBeDefined();
    expect(socials.linkedin).toContain('linkedin.com');
    expect(socials.telegram).toContain('t.me');
    expect(socials.whatsapp).toContain('whatsapp.com');
    expect(socials.instagram).toContain('instagram.com');
    expect(socials.facebook).toContain('facebook.com');
  });

  it('should specify correct primary navigation items', () => {
    expect(Array.isArray(siteConfig.nav)).toBe(true);
    expect(siteConfig.nav.length).toBeGreaterThanOrEqual(4);

    const labels = siteConfig.nav.map((item) => item.label);
    expect(labels).toContain('Freshers');
    expect(labels).toContain('Internships');
    expect(labels).toContain('Remote');
    expect(labels).toContain('Experienced');

    for (const item of siteConfig.nav) {
      expect(item.href).toMatch(/^\/jobs\//);
    }
  });

  it('should configure 4-column footer categories and quick links', () => {
    expect(Array.isArray(siteConfig.categories)).toBe(true);
    expect(siteConfig.categories.length).toBe(4);

    expect(Array.isArray(siteConfig.quickLinks)).toBe(true);
    const quickLabels = siteConfig.quickLinks.map((item) => item.label);
    expect(quickLabels).toContain('About Us');
    expect(quickLabels).toContain('Contact Us');
    expect(quickLabels).toContain('Disclaimer');
    expect(quickLabels).toContain('Privacy Policy');
  });

  it('should contain mandatory legal disclaimer note', () => {
    expect(siteConfig.disclaimerNote).toBe(
      'We are not a recruiter. Always apply on the official company site.'
    );
  });

  it('should specify pagination defaults', () => {
    expect(siteConfig.pagination).toBeDefined();
    expect(siteConfig.pagination.jobsPerPage).toBe(20);
    expect(siteConfig.pagination.adminJobsPerPage).toBe(25);
  });
});
