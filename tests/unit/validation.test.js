import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  changePasswordSchema,
  createContributorSchema,
  updateContributorSchema,
} from '@/lib/validation';

describe('Validation Schemas (lib/validation.js)', () => {
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

    it('should validate with optional totpCode', () => {
      const valid = loginSchema.safeParse({
        email: 'admin@jivikahunt.com',
        password: 'Password123!',
        totpCode: '123456',
      });
      expect(valid.success).toBe(true);
    });

    it('should reject invalid email formatting', () => {
      const invalid = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'Password123!',
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject short passwords', () => {
      const invalid = loginSchema.safeParse({
        email: 'user@example.com',
        password: '123',
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
});
