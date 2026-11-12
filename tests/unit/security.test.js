import { describe, it, expect } from 'vitest';
import { sanitizeNoSql, hashIp, getClientIp } from '@/lib/security';

describe('Security Utilities (lib/security.js)', () => {
  describe('sanitizeNoSql', () => {
    it('should strip keys starting with $ (operator injection)', () => {
      const malicious = {
        username: 'admin',
        password: { $gt: '' },
        $where: 'sleep(1000)',
      };

      const clean = sanitizeNoSql(malicious);
      expect(clean).toEqual({
        username: 'admin',
        password: {},
      });
      expect(clean.$where).toBeUndefined();
    });

    it('should strip keys containing period . (path traversal)', () => {
      const payload = {
        'company.name': 'FakeCorp',
        validKey: 'SafeValue',
      };

      const clean = sanitizeNoSql(payload);
      expect(clean).toEqual({
        validKey: 'SafeValue',
      });
      expect(clean['company.name']).toBeUndefined();
    });

    it('should sanitize nested arrays of objects', () => {
      const data = [
        { name: 'Job 1', $gt: 10 },
        { name: 'Job 2', details: { $ne: null, title: 'Safe' } },
      ];

      const clean = sanitizeNoSql(data);
      expect(clean).toEqual([{ name: 'Job 1' }, { name: 'Job 2', details: { title: 'Safe' } }]);
    });
  });

  describe('hashIp', () => {
    it('should create deterministic salted hash for identical IPs', () => {
      const ip = '203.0.113.195';
      const hash1 = hashIp(ip);
      const hash2 = hashIp(ip);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should handle undefined or invalid IP gracefully', () => {
      expect(hashIp(null)).toBe('unknown_ip');
      expect(hashIp(undefined)).toBe('unknown_ip');
    });
  });

  describe('getClientIp', () => {
    it('should prefer cf-connecting-ip if present', () => {
      const req = {
        headers: new Headers({
          'cf-connecting-ip': '1.1.1.1',
          'x-forwarded-for': '2.2.2.2, 3.3.3.3',
        }),
      };
      expect(getClientIp(req)).toBe('1.1.1.1');
    });

    it('should use first x-forwarded-for entry if cf-connecting-ip is absent', () => {
      const req = {
        headers: new Headers({
          'x-forwarded-for': '198.51.100.5, 10.0.0.1',
        }),
      };
      expect(getClientIp(req)).toBe('198.51.100.5');
    });
  });
});
