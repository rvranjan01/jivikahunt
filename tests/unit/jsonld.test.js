import { describe, it, expect } from 'vitest';
import {
  generateJobPostingJsonLd,
  generateBreadcrumbJsonLd,
  safeJsonLd,
  buildSchemaDescription,
  escapeHtmlXml,
} from '@/lib/jsonLd';

describe('JobPosting & Breadcrumbs Structured Data (lib/jsonLd.js)', () => {
  it('should generate valid Google JobPosting schema for an onsite job with identifier and publishedAt', () => {
    const job = {
      _id: '65b89a000000000000000001',
      title: 'Junior Software Engineer',
      slug: 'junior-software-engineer-at-techcorp',
      company: {
        name: 'TechCorp',
        slug: 'techcorp',
        logoId: 'img_logo_1',
      },
      type: 'fresher',
      workMode: 'onsite',
      locations: ['Pune, Maharashtra'],
      summary: 'Exciting fresher engineering position.',
      responsibilities: ['Write clean code', 'Collaborate with team'],
      eligibility: ['BE/BTech in CS', '2025 passout'],
      skills: ['JavaScript', 'Node.js'],
      salary: '6 LPA',
      batches: [2025],
      lastDate: new Date('2026-12-31'),
      publishedAt: new Date('2026-11-05T10:00:00Z'),
      createdAt: new Date('2026-11-01T10:00:00Z'),
    };

    const schema = generateJobPostingJsonLd(job);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('JobPosting');
    expect(schema.title).toBe('Junior Software Engineer');
    expect(schema.employmentType).toBe('FULL_TIME');
    expect(schema.directApply).toBe(false); // Mandated by Google for aggregators
    expect(schema.hiringOrganization.name).toBe('TechCorp');
    expect(schema.hiringOrganization.logo).toContain('img_logo_1');
    expect(schema.hiringOrganization.sameAs).toBeUndefined(); // sameAs removed per spec
    expect(schema.identifier).toEqual({
      '@type': 'PropertyValue',
      name: 'TechCorp',
      value: '65b89a000000000000000001',
    });
    expect(schema.datePosted).toBe(job.publishedAt.toISOString());
    expect(schema.jobLocation).toBeDefined();
    expect(schema.jobLocation[0].address.addressLocality).toBe('Pune');
    expect(schema.jobLocation[0].address.addressRegion).toBe('Maharashtra');
    expect(schema.jobLocation[0].address.addressCountry).toBe('IN');
    expect(schema.validThrough).toBeDefined();

    // Verify description structure
    expect(schema.description).toContain('Key Responsibilities:');
    expect(schema.description).toContain('Eligibility Criteria:');
    // Only <p>, <ul>, <li> tags allowed
    const tagMatches = schema.description.match(/<([a-z0-9]+)[\s>]/gi) || [];
    const tags = tagMatches.map((t) => t.replace(/[<\s>]/g, '').toLowerCase());
    for (const tag of tags) {
      expect(['p', 'ul', 'li']).toContain(tag);
    }
  });

  it('should fall back to createdAt for datePosted when publishedAt is missing', () => {
    const job = {
      title: 'DevOps Intern',
      slug: 'devops-intern',
      company: { name: 'Acme' },
      type: 'intern',
      workMode: 'onsite',
      locations: ['Bengaluru'],
      summary: 'DevOps role for college students.',
      createdAt: new Date('2026-10-15T08:00:00Z'),
    };

    const schema = generateJobPostingJsonLd(job);
    expect(schema.datePosted).toBe(job.createdAt.toISOString());
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

  describe('Location parsing rules', () => {
    it('parses "City, State" into addressLocality and addressRegion', () => {
      const job = {
        title: 'Tester',
        company: { name: 'QualityCorp' },
        type: 'fresher',
        workMode: 'onsite',
        locations: ['Pune, Maharashtra', 'Hyderabad, Telangana'],
        summary: 'Testing position.',
      };
      const schema = generateJobPostingJsonLd(job);
      expect(schema.jobLocation).toHaveLength(2);
      expect(schema.jobLocation[0].address).toEqual({
        '@type': 'PostalAddress',
        addressLocality: 'Pune',
        addressRegion: 'Maharashtra',
        addressCountry: 'IN',
      });
      expect(schema.jobLocation[1].address).toEqual({
        '@type': 'PostalAddress',
        addressLocality: 'Hyderabad',
        addressRegion: 'Telangana',
        addressCountry: 'IN',
      });
    });

    it('parses India, Pan India, Anywhere in India with addressCountry only (case-insensitive)', () => {
      for (const loc of [
        'India',
        'Pan India',
        'Anywhere in India',
        'pan india',
        'ANYWHERE IN INDIA',
      ]) {
        const job = {
          title: 'Field Engineer',
          company: { name: 'Telecom' },
          type: 'fresher',
          workMode: 'onsite',
          locations: [loc],
          summary: 'Field operations nationwide.',
        };
        const schema = generateJobPostingJsonLd(job);
        expect(schema.jobLocation[0].address).toEqual({
          '@type': 'PostalAddress',
          addressCountry: 'IN',
        });
        expect(schema.jobLocation[0].address.addressLocality).toBeUndefined();
        expect(schema.jobLocation[0].address.addressRegion).toBeUndefined();
      }
    });

    it('parses plain city name with addressLocality', () => {
      const job = {
        title: 'Analyst',
        company: { name: 'Finance' },
        type: 'fresher',
        workMode: 'onsite',
        locations: ['Bengaluru'],
        summary: 'Analytics.',
      };
      const schema = generateJobPostingJsonLd(job);
      expect(schema.jobLocation[0].address).toEqual({
        '@type': 'PostalAddress',
        addressLocality: 'Bengaluru',
        addressCountry: 'IN',
      });
    });
  });

  describe('HTML escaping in buildSchemaDescription', () => {
    it('escapes &, <, > in every dynamic inserted value', () => {
      const job = {
        title: 'R&D Engineer',
        company: { name: 'AT&T <Labs>' },
        locations: ['Delhi & NCR'],
        workMode: 'onsite',
        type: 'fresher',
        salary: '₹10 <LPA> & Bonus',
        batches: [2025],
        summary: 'Summary with <script>alert("xss")</script> & symbols.',
        responsibilities: ['Build & test <components>', 'Debug > 5 issues'],
        eligibility: ['BE & BTech in CS <only>', 'Scores > 70%'],
        skills: ['C++', 'HTML & CSS'],
      };

      const desc = buildSchemaDescription(job);
      expect(desc).not.toContain('<script>');
      expect(desc).not.toContain('<Labs>');
      expect(desc).not.toContain('<components>');
      expect(desc).not.toContain('<only>');
      expect(desc).toContain('&amp;');
      expect(desc).toContain('&lt;script&gt;');
      expect(desc).toContain('&lt;Labs&gt;');
      expect(desc).toContain('&gt; 5 issues');
      expect(desc).toContain('&gt; 70%');
    });

    it('escapeHtmlXml helper replaces &, <, > correctly', () => {
      expect(escapeHtmlXml('A & B < C > D')).toBe('A &amp; B &lt; C &gt; D');
      expect(escapeHtmlXml(null)).toBe('');
      expect(escapeHtmlXml(undefined)).toBe('');
    });
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
