import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as submitReportHandler } from '@/app/api/reports/route';
import { GET as listReportsHandler } from '@/app/api/admin/reports/route';
import { PATCH as updateReportHandler } from '@/app/api/admin/reports/[id]/route';
import { createSessionToken } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/audit', () => ({
  recordAuditLog: vi.fn().mockResolvedValue(true),
}));

let mockReports = [];
let mockJobs = [];
let mockUsers = [];
let mockRateLimitStore = {};

vi.mock('@/models/User', () => ({
  default: {
    findById: vi.fn().mockImplementation((id) => {
      const found = mockUsers.find((u) => u._id.toString() === id.toString());
      return Promise.resolve(found || null);
    }),
  },
}));

vi.mock('@/models/Job', () => ({
  default: {
    findById: vi.fn().mockImplementation((id) => {
      const found = mockJobs.find((j) => j._id.toString() === id.toString());
      return {
        select: () => ({
          lean: () => Promise.resolve(found || null),
        }),
      };
    }),
  },
}));

vi.mock('@/models/Report', () => ({
  default: {
    create: vi.fn().mockImplementation((data) => {
      const newReport = {
        _id: `report_${Date.now()}_${Math.random()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockReports.push(newReport);
      return Promise.resolve(newReport);
    }),
    find: vi.fn().mockImplementation((query) => {
      let filtered = [...mockReports];
      if (query?.status) {
        filtered = filtered.filter((r) => r.status === query.status);
      }
      return {
        populate: () => ({
          sort: () => ({
            limit: () => ({
              lean: () => Promise.resolve(filtered),
            }),
          }),
        }),
      };
    }),
    findById: vi.fn().mockImplementation((id) => {
      const rep = mockReports.find((r) => r._id === id);
      if (!rep) return Promise.resolve(null);
      return Promise.resolve({
        ...rep,
        save: vi.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      });
    }),
  },
}));

vi.mock('@/models/LoginAttempt', () => ({
  default: {
    findOne: vi.fn().mockImplementation(({ key }) => {
      return Promise.resolve(mockRateLimitStore[key] || null);
    }),
    create: vi.fn().mockImplementation((data) => {
      mockRateLimitStore[data.key] = { ...data };
      return Promise.resolve(mockRateLimitStore[data.key]);
    }),
    updateOne: vi.fn().mockImplementation(({ key }, update) => {
      if (mockRateLimitStore[key]) {
        if (update.$inc?.attempts) {
          mockRateLimitStore[key].attempts += update.$inc.attempts;
        }
      }
      return Promise.resolve({ acknowledged: true });
    }),
  },
}));

describe('Broken Link & Scam Reporting Engine (app/api/reports & admin)', () => {
  beforeEach(() => {
    mockReports = [];
    mockRateLimitStore = {};
    mockUsers = [
      {
        _id: 'user_admin_1',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
        tokenVersion: 1,
      },
      {
        _id: 'user_contrib_1',
        email: 'contrib@example.com',
        role: 'contributor',
        isActive: true,
        tokenVersion: 1,
      },
    ];
    mockJobs = [
      {
        _id: 'job_test_1',
        title: 'Junior QA Engineer',
        slug: 'junior-qa-engineer',
        company: { name: 'Acme Corp' },
        status: 'published',
      },
    ];
  });

  it('should allow public visitors to report a broken link without login', async () => {
    const req = new Request('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.195',
      },
      body: JSON.stringify({
        jobId: 'job_test_1',
        reason: 'broken_link',
        note: 'Careers link returned 404',
      }),
    });

    const res = await submitReportHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockReports).toHaveLength(1);
    expect(mockReports[0].reason).toBe('broken_link');
  });

  it('should enforce rate limiting and reject the 6th report within an hour with HTTP 429', async () => {
    const ip = '198.51.100.44';

    for (let i = 0; i < 5; i++) {
      const req = new Request('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify({
          jobId: 'job_test_1',
          reason: 'expired',
        }),
      });
      const res = await submitReportHandler(req);
      expect(res.status).toBe(201);
    }

    // 6th attempt should be blocked
    const req6 = new Request('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify({
        jobId: 'job_test_1',
        reason: 'expired',
      }),
    });
    const res6 = await submitReportHandler(req6);
    expect(res6.status).toBe(429);
    const data6 = await res6.json();
    expect(data6.error).toContain('Too many reports submitted');
  });

  it('should reject reports for non-existent jobs with HTTP 404', async () => {
    const req = new Request('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.0.2.1',
      },
      body: JSON.stringify({
        jobId: 'job_non_existent',
        reason: 'scam',
      }),
    });

    const res = await submitReportHandler(req);
    expect(res.status).toBe(404);
  });

  it('should reject reports with invalid reasons with HTTP 400', async () => {
    const req = new Request('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.0.2.2',
      },
      body: JSON.stringify({
        jobId: 'job_test_1',
        reason: 'invalid_reason_string',
      }),
    });

    const res = await submitReportHandler(req);
    expect(res.status).toBe(400);
  });

  it('should restrict admin reports queue to admin role only (rejecting contributors with HTTP 403)', async () => {
    // Contributor token
    const contributorToken = await createSessionToken({
      userId: 'user_contrib_1',
      email: 'contrib@example.com',
      role: 'contributor',
      tokenVersion: 1,
    });

    const req = new Request('http://localhost:3000/api/admin/reports', {
      headers: {
        cookie: `jh_session=${contributorToken}`,
      },
    });

    const res = await listReportsHandler(req);
    expect(res.status).toBe(403);
  });

  it('should allow admin to resolve a report with PATCH /api/admin/reports/[id]', async () => {
    const adminToken = await createSessionToken({
      userId: 'user_admin_1',
      email: 'admin@example.com',
      role: 'admin',
      tokenVersion: 1,
    });

    // Create an open report
    mockReports.push({
      _id: 'report_to_resolve',
      jobId: 'job_test_1',
      reason: 'broken_link',
      status: 'open',
    });

    const req = new Request('http://localhost:3000/api/admin/reports/report_to_resolve', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `jh_session=${adminToken}`,
      },
      body: JSON.stringify({
        status: 'resolved',
      }),
    });

    const res = await updateReportHandler(req, {
      params: Promise.resolve({ id: 'report_to_resolve' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.report.status).toBe('resolved');
  });
});
