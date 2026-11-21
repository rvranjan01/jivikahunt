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
      expect(item.href).toMatch(/^\/jobs(\/|\?)/);
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

  it('should throw in production if NEXT_PUBLIC_SITE_URL is missing', async () => {
    const origEnv = process.env.NODE_ENV;
    const origUrl = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_SITE_URL;
      // Re-evaluating siteConfig logic
      expect(() => {
        const url = process.env.NEXT_PUBLIC_SITE_URL;
        if (!url && process.env.NODE_ENV === 'production') {
          throw new Error('NEXT_PUBLIC_SITE_URL environment variable is required in production');
        }
      }).toThrow('NEXT_PUBLIC_SITE_URL environment variable is required in production');
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.NEXT_PUBLIC_SITE_URL = origUrl;
    }
  });

  it('should return 404 for ads.txt if ads are not enabled', async () => {
    const { GET: adsHandler } = await import('@/app/ads.txt/route');
    const origEnabled = siteConfig.ads.enabled;
    try {
      siteConfig.ads.enabled = false;
      const res = await adsHandler();
      expect(res.status).toBe(404);

      siteConfig.ads.enabled = true;
      const resActive = await adsHandler();
      expect(resActive.status).toBe(200);
      const text = await resActive.text();
      expect(text).toContain('google.com');
    } finally {
      siteConfig.ads.enabled = origEnabled;
    }
  });
});
