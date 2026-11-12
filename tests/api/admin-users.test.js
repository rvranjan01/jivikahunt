import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GET as listUsersHandler,
  POST as createContributorHandler,
} from '@/app/api/admin/users/route';
import { PATCH as updateUserHandler } from '@/app/api/admin/users/[id]/route';
import { hashPassword, createSessionToken } from '@/lib/auth';

// Mock DB, Audit, and Email
vi.mock('@/lib/db', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/audit', () => ({
  recordAuditLog: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/email', () => ({
  sendContributorInviteEmail: vi.fn().mockResolvedValue({ success: true, simulated: true }),
}));

let mockUsers = [];

vi.mock('@/models/User', () => {
  return {
    default: {
      find: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockImplementation(() => Promise.resolve([...mockUsers])),
          }),
        }),
      }),
      findOne: vi.fn().mockImplementation(({ email }) => {
        return Promise.resolve(
          mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
        );
      }),
      findById: vi.fn().mockImplementation((id) => {
        return Promise.resolve(mockUsers.find((u) => u._id.toString() === id.toString()) || null);
      }),
      create: vi.fn().mockImplementation((doc) => {
        const created = {
          _id: '65b89a' + Math.random().toString(16).slice(2, 20),
          ...doc,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.push(created);
        return Promise.resolve(created);
      }),
      findByIdAndUpdate: vi.fn().mockImplementation((id, updates) => {
        const user = mockUsers.find((u) => u._id.toString() === id.toString());
        if (!user) return { select: () => ({ lean: () => Promise.resolve(null) }) };
        if (updates.$set) Object.assign(user, updates.$set);
        if (updates.$inc?.tokenVersion)
          user.tokenVersion = (user.tokenVersion || 1) + updates.$inc.tokenVersion;
        return {
          select: () => ({
            lean: () => Promise.resolve(user),
          }),
        };
      }),
    },
  };
});

describe('Admin Users API Handlers', () => {
  let adminUser;
  let contributorUser;
  let adminToken;
  let contributorToken;

  beforeEach(async () => {
    adminUser = {
      _id: '65b89a000000000000000001',
      name: 'Admin Founder',
      displayName: 'Founder A.',
      email: 'admin@jivikahunt.com',
      passwordHash: await hashPassword('AdminPass123!'),
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
      tokenVersion: 1,
    };

    contributorUser = {
      _id: '65b89a000000000000000002',
      name: 'Priya Verma',
      displayName: 'Priya V.',
      email: 'priya@jivikahunt.com',
      passwordHash: await hashPassword('PriyaPass123!'),
      role: 'contributor',
      isActive: true,
      mustChangePassword: false,
      tokenVersion: 1,
    };

    mockUsers = [adminUser, contributorUser];

    adminToken = await createSessionToken({
      userId: adminUser._id.toString(),
      email: adminUser.email,
      role: adminUser.role,
      tokenVersion: adminUser.tokenVersion,
    });

    contributorToken = await createSessionToken({
      userId: contributorUser._id.toString(),
      email: contributorUser.email,
      role: contributorUser.role,
      tokenVersion: contributorUser.tokenVersion,
    });
  });

  describe('GET /api/admin/users', () => {
    it('should reject unauthenticated request with 401', async () => {
      const req = new Request('http://localhost:3000/api/admin/users');
      const res = await listUsersHandler(req);
      expect(res.status).toBe(401);
    });

    it('should reject contributor access with 403 Forbidden', async () => {
      const req = new Request('http://localhost:3000/api/admin/users', {
        headers: { Cookie: `jh_session=${contributorToken}` },
      });
      const res = await listUsersHandler(req);
      expect(res.status).toBe(403);
    });

    it('should allow admin to list all users', async () => {
      const req = new Request('http://localhost:3000/api/admin/users', {
        headers: { Cookie: `jh_session=${adminToken}` },
      });
      const res = await listUsersHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.users).toHaveLength(2);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should allow admin to invite a new contributor', async () => {
      const req = new Request('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Karan Mehra',
          displayName: 'Karan M.',
          email: 'karan@example.com',
          bio: 'Campus placement coordinator',
        }),
      });

      const res = await createContributorHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('karan@example.com');
      expect(data.user.role).toBe('contributor');
      expect(data.temporaryPassword).toBeDefined();
      expect(data.temporaryPassword.length).toBeGreaterThanOrEqual(12);
    });

    it('should reject invitation if email is already registered', async () => {
      const req = new Request('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Priya Verma Duplicate',
          displayName: 'Priya V.',
          email: 'priya@jivikahunt.com',
        }),
      });

      const res = await createContributorHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('already exists');
    });
  });

  describe('PATCH /api/admin/users/[id]', () => {
    it('should deactivate contributor and increment tokenVersion', async () => {
      const req = new Request(`http://localhost:3000/api/admin/users/${contributorUser._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${adminToken}`,
        },
        body: JSON.stringify({
          isActive: false,
        }),
      });

      const res = await updateUserHandler(req, {
        params: Promise.resolve({ id: contributorUser._id }),
      });

      expect(res.status).toBe(200);
      expect(contributorUser.isActive).toBe(false);
      expect(contributorUser.tokenVersion).toBe(2); // tokenVersion incremented!
    });

    it('should prevent admin from deactivating their own account', async () => {
      const req = new Request(`http://localhost:3000/api/admin/users/${adminUser._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${adminToken}`,
        },
        body: JSON.stringify({
          isActive: false,
        }),
      });

      const res = await updateUserHandler(req, {
        params: Promise.resolve({ id: adminUser._id }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('cannot deactivate your own');
    });
  });
});
