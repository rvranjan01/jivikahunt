import { describe, it, expect, vi } from 'vitest';
import { sanitizeNoSql, hashIp, getClientIp, assertSameOrigin } from '@/lib/security';

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
    it('should use the last x-forwarded-for entry by default (TRUSTED_PROXY_HOPS=1)', () => {
      vi.stubEnv('TRUSTED_PROXY_HOPS', '1');
      const req = {
        headers: new Headers({
          'cf-connecting-ip': '1.1.1.1',
          'x-forwarded-for': 'spoofed.ip.1, 203.0.113.50',
        }),
      };
      expect(getClientIp(req)).toBe('203.0.113.50');
    });

    it('should select second-to-last entry when TRUSTED_PROXY_HOPS=2 (Cloudflare + Heroku)', () => {
      vi.stubEnv('TRUSTED_PROXY_HOPS', '2');
      // Format: client_ip, cloudflare_egress_ip
      const req = {
        headers: new Headers({
          'x-forwarded-for': '203.0.113.195, 198.51.100.2',
        }),
      };
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('should handle single x-forwarded-for entry', () => {
      vi.stubEnv('TRUSTED_PROXY_HOPS', '1');
      const req = {
        headers: new Headers({
          'x-forwarded-for': '198.51.100.5',
        }),
      };
      expect(getClientIp(req)).toBe('198.51.100.5');
    });

    it('should fall back to x-real-ip if x-forwarded-for is absent', () => {
      const req = {
        headers: new Headers({
          'x-real-ip': '192.0.2.1',
        }),
      };
      expect(getClientIp(req)).toBe('192.0.2.1');
    });

    it('should default to 127.0.0.1 when no IP headers exist', () => {
      const req = {
        headers: new Headers(),
      };
      expect(getClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('assertSameOrigin', () => {
    const siteUrl = 'https://jivikahunt.com';

    it('should allow GET and HEAD requests without Origin header', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl);
      const getReq = new Request('https://jivikahunt.com/api/jobs', { method: 'GET' });
      const headReq = new Request('https://jivikahunt.com/api/jobs', { method: 'HEAD' });

      expect(assertSameOrigin(getReq)).toBeNull();
      expect(assertSameOrigin(headReq)).toBeNull();
    });

    it('should reject POST/PATCH/DELETE without Origin header', async () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl);
      const postReq = new Request('https://jivikahunt.com/api/jobs', { method: 'POST' });
      const res = assertSameOrigin(postReq);

      expect(res).not.toBeNull();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Missing Origin/i);
    });

    it('should allow matching Origin on mutating requests', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl);
      const postReq = new Request('https://jivikahunt.com/api/jobs', {
        method: 'POST',
        headers: { Origin: 'https://jivikahunt.com' },
      });

      expect(assertSameOrigin(postReq)).toBeNull();
    });

    it('should reject mismatched Origin host', async () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl);
      const postReq = new Request('https://jivikahunt.com/api/jobs', {
        method: 'POST',
        headers: { Origin: 'https://evil-attacker.com' },
      });

      const res = assertSameOrigin(postReq);
      expect(res).not.toBeNull();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Cross-origin/i);
    });
  });
});
