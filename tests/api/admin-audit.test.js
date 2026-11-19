import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getAuditHandler } from '@/app/api/admin/audit/route';
import { createSessionToken } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

let mockUsers = [];
let mockAuditLogs = [];

vi.mock('@/models/User', () => {
  return {
    default: {
      findById: vi.fn().mockImplementation((id) => {
        return Promise.resolve(mockUsers.find((u) => u._id.toString() === id.toString()) || null);
      }),
    },
  };
});

vi.mock('@/models/AuditLog', () => {
  return {
    default: {
      find: vi.fn().mockImplementation((query = {}) => {
        let results = [...mockAuditLogs];
        if (query.action?.$regex) {
          const regex = new RegExp(query.action.$regex, query.action.$options);
          results = results.filter((item) => regex.test(item.action));
        }
        return {
          sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockImplementation((skip) => ({
              limit: vi.fn().mockImplementation((limit) => ({
                lean: vi.fn().mockResolvedValue(results.slice(skip, skip + limit)),
              })),
            })),
          }),
        };
      }),
      countDocuments: vi.fn().mockImplementation((query = {}) => {
        let results = [...mockAuditLogs];
        if (query.action?.$regex) {
          const regex = new RegExp(query.action.$regex, query.action.$options);
          results = results.filter((item) => regex.test(item.action));
        }
        return Promise.resolve(results.length);
      }),
    },
  };
});

describe('Admin Audit Log API (/api/admin/audit)', () => {
  let adminUser;
  let contributorUser;
  let adminToken;
  let contributorToken;

  beforeEach(async () => {
    adminUser = {
      _id: '65b89a222222222222222222',
      email: 'admin@jivikahunt.com',
      role: 'admin',
      isActive: true,
      tokenVersion: 1,
    };

    contributorUser = {
      _id: '65b89a111111111111111111',
      email: 'contributor@jivikahunt.com',
      role: 'contributor',
      isActive: true,
      tokenVersion: 1,
    };

    mockUsers = [adminUser, contributorUser];

    mockAuditLogs = [
      {
        _id: '65b89a999999999999999901',
        action: 'login.success',
        actorEmail: 'admin@jivikahunt.com',
        targetType: 'User',
        targetId: adminUser._id,
        createdAt: new Date(),
      },
      {
        _id: '65b89a999999999999999902',
        action: 'job.create',
        actorEmail: 'contributor@jivikahunt.com',
        targetType: 'Job',
        targetId: '65b89a888888888888888888',
        createdAt: new Date(),
      },
    ];

    adminToken = await createSessionToken({
      userId: adminUser._id,
      email: adminUser.email,
      role: adminUser.role,
      tokenVersion: 1,
    });

    contributorToken = await createSessionToken({
      userId: contributorUser._id,
      email: contributorUser.email,
      role: contributorUser.role,
      tokenVersion: 1,
    });
  });

  it('should reject unauthenticated requests with 401', async () => {
    const req = new Request('http://localhost:3000/api/admin/audit');
    const res = await getAuditHandler(req);
    expect(res.status).toBe(401);
  });

  it('should reject contributor access with 403 Forbidden', async () => {
    const req = new Request('http://localhost:3000/api/admin/audit', {
      headers: {
        cookie: `jh_session=${contributorToken}`,
      },
    });

    const res = await getAuditHandler(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Administrator privileges required');
  });

  it('should allow admin to view audit logs with HTTP 200 and pagination', async () => {
    const req = new Request('http://localhost:3000/api/admin/audit?page=1&limit=50', {
      headers: {
        cookie: `jh_session=${adminToken}`,
      },
    });

    const res = await getAuditHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.entries)).toBe(true);
    expect(data.entries).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
    expect(data.entries[0].timeIST).toBeDefined();
  });

  it('should allow admin to filter logs by action prefix', async () => {
    const req = new Request('http://localhost:3000/api/admin/audit?action=job.', {
      headers: {
        cookie: `jh_session=${adminToken}`,
      },
    });

    const res = await getAuditHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].action).toBe('job.create');
  });
});
