import { describe, it, expect } from 'vitest';
import { generateJobPostingJsonLd, generateBreadcrumbJsonLd, safeJsonLd } from '@/lib/jsonLd';

describe('JobPosting & Breadcrumbs Structured Data (lib/jsonLd.js)', () => {
  it('should generate valid Google JobPosting schema for an onsite job', () => {
    const job = {
      title: 'Junior Software Engineer',
      slug: 'junior-software-engineer-at-techcorp',
      company: {
        name: 'TechCorp',
        slug: 'techcorp',
        logoId: 'img_logo_1',
      },
      type: 'fresher',
      workMode: 'onsite',
      locations: ['Bengaluru'],
      summary: 'Exciting fresher engineering position.',
      responsibilities: ['Write clean code', 'Collaborate with team'],
      eligibility: ['BE/BTech in CS', '2025 passout'],
      skills: ['JavaScript', 'Node.js'],
      lastDate: new Date('2026-12-31'),
      createdAt: new Date('2026-11-01'),
    };

    const schema = generateJobPostingJsonLd(job);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('JobPosting');
    expect(schema.title).toBe('Junior Software Engineer');
    expect(schema.employmentType).toBe('FULL_TIME');
    expect(schema.directApply).toBe(false); // Mandated by Google for aggregators
    expect(schema.hiringOrganization.name).toBe('TechCorp');
    expect(schema.hiringOrganization.logo).toContain('img_logo_1');
    expect(schema.jobLocation).toBeDefined();
    expect(schema.jobLocation[0].address.addressLocality).toBe('Bengaluru');
    expect(schema.validThrough).toBeDefined();
    expect(schema.description).toContain('Key Responsibilities');
    expect(schema.description).toContain('Eligibility & Qualifications');
  });

  it('should format remote jobs with TELECOMMUTE and India requirements', () => {
    const job = {
      title: 'Remote React Intern',
      slug: 'remote-react-intern-at-startup',
      company: { name: 'Startup', slug: 'startup' },
      type: 'intern',
      workMode: 'remote',
      locations: ['Remote'],
      summary: 'Remote internship for frontend enthusiasts.',
      createdAt: new Date(),
    };

    const schema = generateJobPostingJsonLd(job);

    expect(schema.employmentType).toBe('INTERN');
    expect(schema.jobLocationType).toBe('TELECOMMUTE');
    expect(schema.applicantLocationRequirements.name).toBe('India');
    expect(schema.jobLocation).toBeUndefined();
  });

  it('should generate valid BreadcrumbList schema', () => {
    const breadcrumbs = [
      { name: 'Home', url: 'https://jivikahunt.com' },
      { name: 'Jobs', url: 'https://jivikahunt.com/jobs' },
      { name: 'Python Developer', url: 'https://jivikahunt.com/jobs/python-dev' },
    ];

    const schema = generateBreadcrumbJsonLd(breadcrumbs);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[2].name).toBe('Python Developer');
  });

  describe('safeJsonLd()', () => {
    it('escapes < to prevent </script> injection', () => {
      const obj = { title: '</script><script>alert(1)</script>' };
      const output = safeJsonLd(obj);
      expect(output).not.toContain('</script>');
      expect(output).toContain('\\u003c/script>');
    });

    it('escapes U+2028 and U+2029 line/paragraph separators', () => {
      const obj = { body: 'line\u2028break\u2029here' };
      const output = safeJsonLd(obj);
      expect(output).not.toContain('\u2028');
      expect(output).not.toContain('\u2029');
      expect(output).toContain('\\u2028');
      expect(output).toContain('\\u2029');
    });

    it('produces valid JSON after escaping', () => {
      const obj = { title: 'Hello <World>', a: 1 };
      expect(() => JSON.parse(safeJsonLd(obj))).not.toThrow();
    });
  });
});
