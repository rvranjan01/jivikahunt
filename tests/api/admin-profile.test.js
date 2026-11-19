import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getProfileHandler, PATCH as updateProfileHandler } from '@/app/api/admin/profile/route';
import { createSessionToken } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/audit', () => ({
  recordAuditLog: vi.fn().mockResolvedValue(true),
}));

let mockUsers = [];

vi.mock('@/models/User', () => {
  return {
    default: {
      findById: vi.fn().mockImplementation((id) => {
        const found = mockUsers.find((u) => u._id.toString() === id.toString());
        if (!found) return Promise.resolve(null);
        return Promise.resolve({
          ...found,
          save: vi.fn().mockImplementation(function () {
            Object.assign(found, this);
            return Promise.resolve(this);
          }),
        });
      }),
    },
  };
});

describe('Staff Profile API (/api/admin/profile)', () => {
  let contributorUser;
  let adminUser;
  let contributorToken;

  beforeEach(async () => {
    contributorUser = {
      _id: '65b89a111111111111111111',
      name: 'Priya Sharma',
      displayName: 'Priya Sharma',
      email: 'priya@jivikahunt.com',
      role: 'contributor',
      isActive: true,
      tokenVersion: 1,
      bio: 'Junior curator',
      photoId: null,
      createdAt: new Date(),
    };

    adminUser = {
      _id: '65b89a222222222222222222',
      name: 'Admin Boss',
      displayName: 'Founder Admin',
      email: 'admin@jivikahunt.com',
      role: 'admin',
      isActive: true,
      tokenVersion: 1,
      bio: 'Platform admin',
      photoId: null,
      createdAt: new Date(),
    };

    mockUsers = [contributorUser, adminUser];

    contributorToken = await createSessionToken({
      userId: contributorUser._id,
      email: contributorUser.email,
      role: contributorUser.role,
      tokenVersion: 1,
    });
  });

  it('should allow contributor to view their own profile', async () => {
    const req = new Request('http://localhost:3000/api/admin/profile', {
      headers: {
        cookie: `jh_session=${contributorToken}`,
      },
    });

    const res = await getProfileHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.displayName).toBe('Priya Sharma');
    expect(data.user.email).toBe('priya@jivikahunt.com');
  });

  it('should allow contributor to update their own displayName and bio', async () => {
    const req = new Request('http://localhost:3000/api/admin/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `jh_session=${contributorToken}`,
      },
      body: JSON.stringify({
        displayName: 'Priya S.',
        bio: 'Updated bio covering tech jobs.',
      }),
    });

    const res = await updateProfileHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.displayName).toBe('Priya S.');
    expect(data.user.bio).toBe('Updated bio covering tech jobs.');
    expect(contributorUser.displayName).toBe('Priya S.');
  });

  it('should prevent contributor from altering their role or email via profile PATCH', async () => {
    const req = new Request('http://localhost:3000/api/admin/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `jh_session=${contributorToken}`,
      },
      body: JSON.stringify({
        displayName: 'Hacker Name',
        role: 'admin',
        email: 'hacked@jivikahunt.com',
        isActive: false,
      }),
    });

    const res = await updateProfileHandler(req);
    // Schema is .strict() so passing unauthorized keys like role/email returns 400
    expect(res.status).toBe(400);
    expect(contributorUser.role).toBe('contributor');
    expect(contributorUser.email).toBe('priya@jivikahunt.com');
  });

  it('should operate strictly on the session user and cannot edit another user', async () => {
    // Attempting to pass targetId in body does not affect adminUser
    const req = new Request('http://localhost:3000/api/admin/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `jh_session=${contributorToken}`,
      },
      body: JSON.stringify({
        displayName: 'New Name',
        userId: adminUser._id,
      }),
    });

    const res = await updateProfileHandler(req);
    // Extra fields rejected by schema
    expect(res.status).toBe(400);
    expect(adminUser.displayName).toBe('Founder Admin');
  });

  it('should reject cross-origin requests when Origin does not match Host', async () => {
    const req = new Request('http://localhost:3000/api/admin/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `jh_session=${contributorToken}`,
        origin: 'https://malicious-site.com',
        host: 'localhost:3000',
      },
      body: JSON.stringify({
        displayName: 'Cross Origin Attack',
      }),
    });

    const res = await updateProfileHandler(req);
    expect(res.status).toBe(403);
  });
});
