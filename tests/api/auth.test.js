import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { POST as changePasswordHandler } from '@/app/api/auth/change-password/route';
import { hashPassword, createSessionToken } from '@/lib/auth';
import { createTotpSecret } from '@/lib/totp';
import { generateSync } from 'otplib';

// Mock DB and Models
vi.mock('@/lib/db', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/audit', () => ({
  recordAuditLog: vi.fn().mockResolvedValue(true),
}));

// In-memory mocks for User and LoginAttempt
let mockUsers = [];
let mockLoginAttempts = [];

vi.mock('@/models/User', () => {
  return {
    default: {
      findOne: vi.fn().mockImplementation(({ email }) => {
        return Promise.resolve(
          mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
        );
      }),
      findById: vi.fn().mockImplementation((id) => {
        return Promise.resolve(mockUsers.find((u) => u._id.toString() === id.toString()) || null);
      }),
      findByIdAndUpdate: vi.fn().mockImplementation((id, updates) => {
        const user = mockUsers.find((u) => u._id.toString() === id.toString());
        if (!user) return Promise.resolve(null);
        if (updates.$set) Object.assign(user, updates.$set);
        if (updates.$inc?.tokenVersion)
          user.tokenVersion = (user.tokenVersion || 1) + updates.$inc.tokenVersion;
        return Promise.resolve(user);
      }),
    },
  };
});

vi.mock('@/models/LoginAttempt', () => {
  return {
    default: {
      find: vi.fn().mockImplementation(({ key: { $in: keys } }) => {
        return Promise.resolve(mockLoginAttempts.filter((rec) => keys.includes(rec.key)));
      }),
      findOne: vi.fn().mockImplementation(({ key }) => {
        return Promise.resolve(mockLoginAttempts.find((rec) => rec.key === key) || null);
      }),
      create: vi.fn().mockImplementation((doc) => {
        mockLoginAttempts.push(doc);
        return Promise.resolve(doc);
      }),
      updateOne: vi.fn().mockImplementation(({ key }, { $set }) => {
        const rec = mockLoginAttempts.find((r) => r.key === key);
        if (rec) Object.assign(rec, $set);
        return Promise.resolve({ modifiedCount: 1 });
      }),
      deleteMany: vi.fn().mockImplementation(({ key: { $in: keys } }) => {
        mockLoginAttempts = mockLoginAttempts.filter((r) => !keys.includes(r.key));
        return Promise.resolve({ deletedCount: keys.length });
      }),
    },
  };
});

describe('Authentication API Handlers', () => {
  let contributorUser;
  let adminUser;
  let adminTotpSecret;

  beforeEach(async () => {
    mockLoginAttempts = [];
    adminTotpSecret = createTotpSecret();

    contributorUser = {
      _id: '65b89a111111111111111111',
      name: 'Test Contributor',
      displayName: 'Contributor Test',
      email: 'contributor@jivikahunt.com',
      passwordHash: await hashPassword('ContributorPass1!'),
      role: 'contributor',
      isActive: true,
      mustChangePassword: true,
      tokenVersion: 1,
      bio: 'Bio text',
    };

    adminUser = {
      _id: '65b89a222222222222222222',
      name: 'Test Admin',
      displayName: 'Admin Test',
      email: 'admin@jivikahunt.com',
      passwordHash: await hashPassword('AdminPass123!'),
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
      tokenVersion: 1,
      totpSecret: adminTotpSecret,
    };

    mockUsers = [contributorUser, adminUser];
  });

  describe('POST /api/auth/login', () => {
    it('should reject invalid credentials with generic error', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'contributor@jivikahunt.com',
          password: 'WrongPassword!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid email or password.');
    });

    it('should reject deactivated user with 403', async () => {
      contributorUser.isActive = false;

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'contributor@jivikahunt.com',
          password: 'ContributorPass1!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Account is deactivated');
    });

    it('should lock out user with 429 when max login attempts reached', async () => {
      // Simulate 5 prior failed attempts and active lockout
      mockLoginAttempts.push({
        key: 'email:contributor@jivikahunt.com',
        attempts: 5,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more minutes
      });

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'contributor@jivikahunt.com',
          password: 'ContributorPass1!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain('Account temporarily locked');
    });

    it('should require TOTP 2FA for admin accounts without 2FA code', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@jivikahunt.com',
          password: 'AdminPass123!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.requires2FA).toBe(true);
    });

    it('should reject admin login with invalid 2FA code', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@jivikahunt.com',
          password: 'AdminPass123!',
          totpCode: '000000',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Invalid 2FA code');
    });

    it('should authenticate admin when valid password and valid TOTP code provided', async () => {
      const validTotp = generateSync({ secret: adminTotpSecret });

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@jivikahunt.com',
          password: 'AdminPass123!',
          totpCode: validTotp,
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('admin@jivikahunt.com');
      expect(data.user.role).toBe('admin');

      // Verify session cookie was set
      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toContain('jh_session=');
      expect(cookieHeader).toContain('HttpOnly');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear session cookie on logout', async () => {
      const req = new Request('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const res = await logoutHandler(req);
      expect(res.status).toBe(200);
      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toContain('jh_session=');
      expect(cookieHeader).toContain('Max-Age=0');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should successfully update password and increment tokenVersion', async () => {
      const token = await createSessionToken({
        userId: contributorUser._id.toString(),
        email: contributorUser.email,
        role: contributorUser.role,
        tokenVersion: contributorUser.tokenVersion,
      });

      const req = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${token}`,
        },
        body: JSON.stringify({
          currentPassword: 'ContributorPass1!',
          newPassword: 'BrandNewSecurePass99!',
        }),
      });

      const res = await changePasswordHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(contributorUser.tokenVersion).toBe(2);
      expect(contributorUser.mustChangePassword).toBe(false);
    });
  });
});
