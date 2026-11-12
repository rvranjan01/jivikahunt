import { describe, it, expect } from 'vitest';
import { guideSchema } from '@/lib/validation';

describe('Guide Validation & Utilities (lib/validation.js)', () => {
  it('should validate a valid guide payload', () => {
    const valid = {
      title: 'How to Build an ATS-Friendly Resume for College Freshers',
      summary:
        'A comprehensive step-by-step roadmap for engineering students to format their first resume.',
      body: '## 1. Introduction\n\nMost resumes get filtered by automated parsing systems...',
      status: 'published',
    };

    const result = guideSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject a guide with too short a summary or body', () => {
    const invalid = {
      title: 'Short',
      summary: 'Too short',
      body: 'Tiny',
    };

    const result = guideSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
