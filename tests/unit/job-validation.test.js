import { describe, it, expect } from 'vitest';
import { isValidApplyUrl, jobSchema } from '@/lib/validation';

describe('Job Validation Schema (lib/validation.js)', () => {
  describe('isValidApplyUrl', () => {
    it('should accept valid HTTPS careers URLs', () => {
      expect(isValidApplyUrl('https://careers.google.com/jobs/results/12345')).toBe(true);
      expect(isValidApplyUrl('https://jobs.lever.co/company/job-id')).toBe(true);
      expect(isValidApplyUrl('https://boards.greenhouse.io/company/jobs/123')).toBe(true);
    });

    it('should reject insecure HTTP URLs', () => {
      expect(isValidApplyUrl('http://careers.google.com/jobs/123')).toBe(false);
    });

    it('should reject URLs containing embedded user credentials', () => {
      expect(isValidApplyUrl('https://user:password@example.com/careers')).toBe(false);
    });

    it('should reject known URL shorteners', () => {
      expect(isValidApplyUrl('https://bit.ly/3abcdef')).toBe(false);
      expect(isValidApplyUrl('https://tinyurl.com/job123')).toBe(false);
      expect(isValidApplyUrl('https://t.co/shortlink')).toBe(false);
      expect(isValidApplyUrl('https://is.gd/xyz')).toBe(false);
      expect(isValidApplyUrl('https://rb.gy/12345')).toBe(false);
    });

    it('should reject empty or malformed strings', () => {
      expect(isValidApplyUrl('')).toBe(false);
      expect(isValidApplyUrl('not-a-url')).toBe(false);
      expect(isValidApplyUrl(null)).toBe(false);
    });
  });

  describe('jobSchema', () => {
    const validJobPayload = {
      title: 'Junior React Developer',
      company: {
        name: 'Razorpay',
        description: 'Fintech payment gateway leader',
      },
      type: 'fresher',
      workMode: 'hybrid',
      locations: ['Bengaluru'],
      batches: [2024, 2025],
      salary: '8 - 12 LPA',
      skills: ['react', 'javascript', 'typescript'],
      summary:
        'Razorpay is seeking ambitious engineering graduates to build next-generation payment experiences.',
      responsibilities: ['Build UI components', 'Write unit tests'],
      eligibility: ['B.Tech / B.E in Computer Science', '60% or 6.5 CGPA minimum'],
      applyUrl: 'https://careers.razorpay.com/jobs/junior-react-developer',
      status: 'published',
    };

    it('should validate complete job payload', () => {
      const result = jobSchema.safeParse(validJobPayload);
      expect(result.success).toBe(true);
    });

    it('should reject summary shorter than 40 characters', () => {
      const invalid = {
        ...validJobPayload,
        summary: 'Short summary here.', // 20 chars
      };
      const result = jobSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing location array', () => {
      const invalid = {
        ...validJobPayload,
        locations: [],
      };
      const result = jobSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid job type', () => {
      const invalid = {
        ...validJobPayload,
        type: 'freelance',
      };
      const result = jobSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
