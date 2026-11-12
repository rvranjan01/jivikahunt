import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateTemporaryPassword,
  createSessionToken,
  verifySessionToken,
} from '@/lib/auth';

describe('Auth Utilities (lib/auth.js)', () => {
  describe('Password Hashing', () => {
    it('should hash and correctly verify passwords', async () => {
      const password = 'SuperSecret123!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$/);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should generate high-entropy random temporary passwords', () => {
      const p1 = generateTemporaryPassword(14);
      const p2 = generateTemporaryPassword(14);

      expect(p1).toHaveLength(14);
      expect(p2).toHaveLength(14);
      expect(p1).not.toBe(p2);
    });
  });

  describe('JWT Session Tokens (Jose)', () => {
    it('should sign and verify valid session token', async () => {
      const payload = {
        userId: '65b89a1234567890abcdef12',
        email: 'contributor@jivikahunt.com',
        role: 'contributor',
        tokenVersion: 1,
      };

      const token = await createSessionToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const verified = await verifySessionToken(token);
      expect(verified).toBeDefined();
      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
      expect(verified.tokenVersion).toBe(payload.tokenVersion);
    });

    it('should return null for invalid or tampered tokens', async () => {
      const verified = await verifySessionToken('invalid.token.signature');
      expect(verified).toBeNull();
    });

    it('should return null for empty token', async () => {
      expect(await verifySessionToken('')).toBeNull();
      expect(await verifySessionToken(null)).toBeNull();
    });
  });
});
