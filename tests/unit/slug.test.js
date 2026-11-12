import { describe, it, expect, vi, beforeEach } from 'vitest';
import { slugify, generateCompanySlug, generateUniqueJobSlug } from '@/lib/slug';

let mockExistingSlugs = [];

vi.mock('@/lib/db', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/models/Job', () => {
  return {
    default: {
      findOne: vi.fn().mockImplementation((query) => {
        const slug = query.slug;
        const exists = mockExistingSlugs.find(
          (item) => item.slug === slug && (!query._id?.$ne || item._id !== query._id.$ne)
        );
        return {
          select: () => ({
            lean: () => Promise.resolve(exists || null),
          }),
        };
      }),
    },
  };
});

describe('Slug Generator Utilities (lib/slug.js)', () => {
  describe('slugify', () => {
    it('should convert strings to lowercase hyphenated slugs', () => {
      expect(slugify('Software Engineer Trainee')).toBe('software-engineer-trainee');
      expect(slugify('React.js / Node.js Developer!')).toBe('reactjs-nodejs-developer');
    });

    it('should strip unicode diacritics and special punctuation', () => {
      expect(slugify('Café & Crème Hiring')).toBe('cafe-creme-hiring');
    });

    it('should collapse multiple spaces and hyphens', () => {
      expect(slugify('  Lead --- Frontend   Architect  ')).toBe('lead-frontend-architect');
    });

    it('should handle empty or null values', () => {
      expect(slugify('')).toBe('');
      expect(slugify(null)).toBe('');
    });
  });

  describe('generateCompanySlug', () => {
    it('should generate clean company slug', () => {
      expect(generateCompanySlug('Tata Consultancy Services')).toBe('tata-consultancy-services');
      expect(generateCompanySlug('Accenture India Pvt Ltd')).toBe('accenture-india-pvt-ltd');
      expect(generateCompanySlug('')).toBe('company');
    });
  });

  describe('generateUniqueJobSlug', () => {
    beforeEach(() => {
      mockExistingSlugs = [];
    });

    it('should generate base slug when no collisions exist', async () => {
      const slug = await generateUniqueJobSlug('Graduate Engineer', 'Infosys');
      expect(slug).toBe('graduate-engineer-at-infosys');
    });

    it('should append -2 when a duplicate slug already exists in database', async () => {
      mockExistingSlugs.push({
        _id: '65b89a000000000000000001',
        slug: 'graduate-engineer-at-infosys',
      });

      const slug = await generateUniqueJobSlug('Graduate Engineer', 'Infosys');
      expect(slug).toBe('graduate-engineer-at-infosys-2');
    });

    it('should append -3 when -1 and -2 already exist', async () => {
      mockExistingSlugs.push(
        { _id: '1', slug: 'graduate-engineer-at-infosys' },
        { _id: '2', slug: 'graduate-engineer-at-infosys-2' }
      );

      const slug = await generateUniqueJobSlug('Graduate Engineer', 'Infosys');
      expect(slug).toBe('graduate-engineer-at-infosys-3');
    });

    it('should retain current slug when editing the same job (excluded ID)', async () => {
      const jobId = '65b89a000000000000000001';
      mockExistingSlugs.push({
        _id: jobId,
        slug: 'graduate-engineer-at-infosys',
      });

      const slug = await generateUniqueJobSlug('Graduate Engineer', 'Infosys', jobId);
      expect(slug).toBe('graduate-engineer-at-infosys');
    });
  });
});
