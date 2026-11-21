import { describe, it, expect } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  loginSchema,
  changePasswordSchema,
  createContributorSchema,
  updateContributorSchema,
  jobSchema,
} from '@/lib/validation';

describe('Validation Schemas (lib/validation.js)', () => {
  describe('MIN_PASSWORD_LENGTH', () => {
    it('is configured to at least 8 characters', () => {
      expect(MIN_PASSWORD_LENGTH).toBe(8);
    });
  });

  describe('loginSchema', () => {
    it('should validate standard credentials', () => {
      const valid = loginSchema.safeParse({
        email: 'admin@jivikahunt.com',
        password: 'Password123!',
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.email).toBe('admin@jivikahunt.com');
      }
    });

    it('should reject empty passwords', () => {
      const invalid = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject unknown extra properties to prevent injection', () => {
      const invalid = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123!',
        extraMaliciousKey: '$where',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid current and new password containing letters and numbers', () => {
      const valid = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword987!',
      });
      expect(valid.success).toBe(true);
    });

    it('should reject new password under 8 characters', () => {
      const invalid = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword123!',
        newPassword: 'Pass1',
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject new password without numbers', () => {
      const invalid = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword123!',
        newPassword: 'OnlyLettersHere',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('createContributorSchema', () => {
    it('should accept valid contributor input', () => {
      const valid = createContributorSchema.safeParse({
        name: 'Rahul Sharma',
        displayName: 'Rahul S.',
        email: 'rahul@example.com',
        bio: 'Tech enthusiast',
      });
      expect(valid.success).toBe(true);
    });

    it('should reject bio exceeding 250 characters', () => {
      const invalid = createContributorSchema.safeParse({
        name: 'Rahul Sharma',
        displayName: 'Rahul S.',
        email: 'rahul@example.com',
        bio: 'a'.repeat(251),
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('jobSchema', () => {
    const validDraftBase = {
      title: 'Junior Web Developer',
      company: { name: 'Acme Corp' },
      type: 'fresher',
      workMode: 'onsite',
      locations: ['Pune'],
      summary: 'A short draft summary that is at least forty characters long for test.',
      applyUrl: 'https://careers.acmecorp.com/jobs/1',
      status: 'draft',
    };

    const validPublishBase = {
      title: 'Junior Web Developer',
      company: { name: 'Acme Corp' },
      type: 'fresher',
      workMode: 'onsite',
      locations: ['Pune, Maharashtra'],
      summary:
        'A comprehensive job summary that easily exceeds one hundred and fifty characters to meet all Google and JivikaHunt high-quality editorial criteria for freshers.',
      responsibilities: [
        'Develop clean user interfaces',
        'Collaborate with senior software engineers',
      ],
      eligibility: [
        'BE/BTech in Computer Science or IT',
        'Batch 2025/2026 with no active backlogs',
      ],
      applyUrl: 'https://careers.acmecorp.com/jobs/1',
      status: 'published',
      confirmLiveJob: true,
      confirmNoPayment: true,
      confirmRealJob: true,
    };

    describe('Title validation rules (all saves)', () => {
      it('rejects title longer than 100 characters', () => {
        const res = jobSchema.safeParse({
          ...validDraftBase,
          title: 'A'.repeat(101),
        });
        expect(res.success).toBe(false);
      });

      it('rejects all-caps titles with more than 3 letters', () => {
        const res = jobSchema.safeParse({
          ...validDraftBase,
          title: 'SOFTWARE ENGINEER TRAINEE',
        });
        expect(res.success).toBe(false);
      });

      it('allows uppercase acronyms with 3 or fewer letters', () => {
        const res = jobSchema.safeParse({
          ...validDraftBase,
          title: 'SDE Intern',
        });
        expect(res.success).toBe(true);
      });

      it('rejects title with more than one exclamation mark', () => {
        const res = jobSchema.safeParse({
          ...validDraftBase,
          title: 'Great Opportunity!!',
        });
        expect(res.success).toBe(false);
      });

      it('allows single exclamation mark', () => {
        const res = jobSchema.safeParse({
          ...validDraftBase,
          title: 'Great Opportunity!',
        });
        expect(res.success).toBe(true);
      });

      it('rejects company name inside the job title', () => {
        const res = jobSchema.safeParse({
          ...validDraftBase,
          title: 'Software Developer at Acme Corp',
          company: { name: 'Acme Corp' },
        });
        expect(res.success).toBe(false);
      });

      it('rejects banned promotional and urgency phrases in title', () => {
        const phrases = ['Hiring Now', 'apply now', 'Walk-in Drive', 'Urgent requirement'];
        for (const phrase of phrases) {
          const res = jobSchema.safeParse({
            ...validDraftBase,
            title: `Junior Developer - ${phrase}`,
          });
          expect(res.success).toBe(false);
        }
      });
    });

    describe('Publish-time validation (drafts exempt)', () => {
      it('allows drafts to omit checklist and have short summary / few bullets', () => {
        const res = jobSchema.safeParse(validDraftBase);
        expect(res.success).toBe(true);
      });

      it('accepts fully valid published payload', () => {
        const res = jobSchema.safeParse(validPublishBase);
        expect(res.success).toBe(true);
      });

      it('rejects publish when summary is under 150 characters', () => {
        const res = jobSchema.safeParse({
          ...validPublishBase,
          summary: 'Too short for publishing summary requirement.',
        });
        expect(res.success).toBe(false);
      });

      it('rejects publish with fewer than 2 responsibilities', () => {
        const res = jobSchema.safeParse({
          ...validPublishBase,
          responsibilities: ['Only one responsibility'],
        });
        expect(res.success).toBe(false);
      });

      it('rejects publish with fewer than 2 eligibility points', () => {
        const res = jobSchema.safeParse({
          ...validPublishBase,
          eligibility: ['Only one eligibility point'],
        });
        expect(res.success).toBe(false);
      });

      it('rejects publish if any checklist item is missing or false', () => {
        const missing1 = jobSchema.safeParse({
          ...validPublishBase,
          confirmLiveJob: false,
        });
        expect(missing1.success).toBe(false);

        const missing2 = jobSchema.safeParse({
          ...validPublishBase,
          confirmNoPayment: false,
        });
        expect(missing2.success).toBe(false);

        const missing3 = jobSchema.safeParse({
          ...validPublishBase,
          confirmRealJob: false,
        });
        expect(missing3.success).toBe(false);
      });
    });
  });
});
