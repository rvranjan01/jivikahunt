import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as listJobsHandler, POST as createJobHandler } from '@/app/api/admin/jobs/route';
import {
  GET as getJobHandler,
  PUT as updateJobHandler,
  DELETE as deleteJobHandler,
} from '@/app/api/admin/jobs/[id]/route';
import { hashPassword, createSessionToken } from '@/lib/auth';

// Mock DB, Audit, and Telegram
vi.mock('@/lib/db', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/audit', () => ({
  recordAuditLog: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/telegram', () => ({
  postJobToTelegram: vi.fn().mockResolvedValue({ success: true, simulated: true }),
}));

let mockJobs = [];

vi.mock('@/models/Job', () => {
  return {
    default: {
      find: vi.fn().mockImplementation((query) => {
        let filtered = [...mockJobs];
        if (query?.createdBy) {
          filtered = filtered.filter((j) => j.createdBy.toString() === query.createdBy.toString());
        }
        if (query?.status) {
          filtered = filtered.filter((j) => j.status === query.status);
        }
        return {
          sort: () => ({
            skip: () => ({
              limit: () => ({
                lean: () => Promise.resolve(filtered),
              }),
            }),
          }),
        };
      }),
      findOne: vi.fn().mockImplementation((query) => {
        if (query?.slug) {
          const match = mockJobs.find((j) => j.slug === query.slug);
          return {
            select: () => ({
              lean: () => Promise.resolve(match || null),
            }),
          };
        }
        if (query?.applyUrl) {
          const match = mockJobs.find((j) => {
            const urlMatches = j.applyUrl === query.applyUrl;
            let titleMatches = true;
            if (query.title?.$regex) {
              const reg = new RegExp(query.title.$regex, query.title.$options || 'i');
              titleMatches = reg.test(j.title);
            }
            return urlMatches && titleMatches;
          });
          return Promise.resolve(match || null);
        }
        return Promise.resolve(null);
      }),
      findById: vi.fn().mockImplementation((id) => {
        const found = mockJobs.find((j) => j._id.toString() === id.toString());
        const doc = found
          ? {
              ...found,
              save: vi.fn().mockResolvedValue(found),
            }
          : null;

        return {
          ...doc,
          lean: () => Promise.resolve(found || null),
          then: (resolve) => resolve(doc),
        };
      }),
      create: vi.fn().mockImplementation((doc) => {
        const created = {
          _id: '65b89a' + Math.random().toString(16).slice(2, 20),
          ...doc,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockJobs.push(created);
        return Promise.resolve(created);
      }),
      findByIdAndDelete: vi.fn().mockImplementation((id) => {
        const idx = mockJobs.findIndex((j) => j._id.toString() === id.toString());
        if (idx !== -1) {
          const removed = mockJobs.splice(idx, 1)[0];
          return Promise.resolve(removed);
        }
        return Promise.resolve(null);
      }),
      countDocuments: vi.fn().mockImplementation((query) => {
        let filtered = [...mockJobs];
        if (query?.createdBy) {
          filtered = filtered.filter((j) => j.createdBy.toString() === query.createdBy.toString());
        }
        return Promise.resolve(filtered.length);
      }),
    },
  };
});

let mockUserMap = {};

vi.mock('@/models/User', () => {
  return {
    default: {
      findById: vi.fn().mockImplementation((id) => {
        return Promise.resolve(mockUserMap[id.toString()] || null);
      }),
    },
  };
});

describe('Admin & Contributor Jobs API Handlers', () => {
  let contributorA;
  let contributorB;
  let adminUser;
  let tokenA;
  let tokenB;
  let adminToken;

  const samplePayload = {
    title: 'Software Developer Trainee',
    company: {
      name: 'Wipro Limited',
      description: 'Global IT consulting leader',
    },
    type: 'fresher',
    workMode: 'onsite',
    locations: ['Bengaluru'],
    batches: [2024],
    salary: '4.5 LPA',
    skills: ['java', 'sql'],
    summary:
      'Wipro is hiring entry-level software trainees for full-time enterprise engineering roles.',
    responsibilities: ['Write code', 'Test features'],
    eligibility: ['BE/BTech graduates with 60%+'],
    applyUrl: 'https://careers.wipro.com/jobs/123456',
    status: 'published',
  };

  beforeEach(async () => {
    mockJobs = [];
    mockUserMap = {};

    contributorA = {
      _id: '65b89a000000000000000001',
      name: 'Contributor Alpha',
      displayName: 'Alpha C.',
      email: 'alpha@jivikahunt.com',
      passwordHash: await hashPassword('Pass123!'),
      role: 'contributor',
      isActive: true,
      tokenVersion: 1,
    };

    contributorB = {
      _id: '65b89a000000000000000002',
      name: 'Contributor Beta',
      displayName: 'Beta C.',
      email: 'beta@jivikahunt.com',
      passwordHash: await hashPassword('Pass123!'),
      role: 'contributor',
      isActive: true,
      tokenVersion: 1,
    };

    adminUser = {
      _id: '65b89a000000000000000003',
      name: 'Founder Admin',
      displayName: 'Admin Boss',
      email: 'admin@jivikahunt.com',
      passwordHash: await hashPassword('AdminPass123!'),
      role: 'admin',
      isActive: true,
      tokenVersion: 1,
    };

    mockUserMap[contributorA._id] = contributorA;
    mockUserMap[contributorB._id] = contributorB;
    mockUserMap[adminUser._id] = adminUser;

    tokenA = await createSessionToken({
      userId: contributorA._id,
      email: contributorA.email,
      role: contributorA.role,
      tokenVersion: contributorA.tokenVersion,
    });

    tokenB = await createSessionToken({
      userId: contributorB._id,
      email: contributorB.email,
      role: contributorB.role,
      tokenVersion: contributorB.tokenVersion,
    });

    adminToken = await createSessionToken({
      userId: adminUser._id,
      email: adminUser.email,
      role: adminUser.role,
      tokenVersion: adminUser.tokenVersion,
    });
  });

  describe('POST /api/admin/jobs', () => {
    it('should allow contributor to create a job and copy displayName to postedByName', async () => {
      const req = new Request('http://localhost:3000/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${tokenA}`,
        },
        body: JSON.stringify(samplePayload),
      });

      const res = await createJobHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.job.slug).toBe('software-developer-trainee-at-wipro-limited');

      expect(mockJobs).toHaveLength(1);
      expect(mockJobs[0].postedByName).toBe('Alpha C.');
      expect(mockJobs[0].createdBy.toString()).toBe(contributorA._id);
    });

    it('should warn with 409 if a duplicate posting exists unless force is true', async () => {
      // Create first post
      mockJobs.push({
        _id: '65b89a000000000000000055',
        title: samplePayload.title,
        company: { name: samplePayload.company.name },
        applyUrl: samplePayload.applyUrl,
        createdBy: contributorA._id,
      });

      const req = new Request('http://localhost:3000/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${tokenA}`,
        },
        body: JSON.stringify(samplePayload),
      });

      const res = await createJobHandler(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.isDuplicate).toBe(true);
      expect(data.warning).toContain('already exists');
    });

    it('should enforce contributor daily quota limit of 30 jobs per 24 hours', async () => {
      // Simulate 30 existing posts by Contributor A in the past 24 hours
      for (let i = 0; i < 30; i++) {
        mockJobs.push({
          _id: `job_${i}`,
          title: `Job ${i}`,
          createdBy: contributorA._id,
          createdAt: new Date(),
          status: 'published',
        });
      }

      const req = new Request('http://localhost:3000/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${tokenA}`,
        },
        body: JSON.stringify(samplePayload),
      });

      const res = await createJobHandler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain('Daily posting quota reached');
    });

    it('should exempt administrators from daily posting limits', async () => {
      // Even with 30 posts, admin can post freely
      for (let i = 0; i < 30; i++) {
        mockJobs.push({
          _id: `admin_job_${i}`,
          title: `Admin Job ${i}`,
          createdBy: adminUser._id,
          createdAt: new Date(),
          status: 'published',
        });
      }

      const req = new Request('http://localhost:3000/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${adminToken}`,
        },
        body: JSON.stringify(samplePayload),
      });

      const res = await createJobHandler(req);
      expect(res.status).toBe(201);
    });
  });

  describe('Contributor Isolation Rules', () => {
    let jobOfA;

    beforeEach(() => {
      jobOfA = {
        _id: '65b89a000000000000000099',
        title: 'Alpha Original Job',
        slug: 'alpha-original-job-at-corp',
        company: { name: 'Corp A', slug: 'corp-a' },
        type: 'fresher',
        workMode: 'remote',
        locations: ['Delhi'],
        summary: 'A very detailed summary of at least forty characters for Alpha job.',
        applyUrl: 'https://corp-a.com/apply',
        status: 'published',
        createdBy: contributorA._id,
        postedByName: contributorA.displayName,
      };
      mockJobs = [jobOfA];
    });

    it('should reject Contributor B trying to view Contributor A job with 403', async () => {
      const req = new Request(`http://localhost:3000/api/admin/jobs/${jobOfA._id}`, {
        headers: { Cookie: `jh_session=${tokenB}` },
      });

      const res = await getJobHandler(req, {
        params: Promise.resolve({ id: jobOfA._id }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden');
    });

    it('should reject Contributor B trying to update Contributor A job with 403', async () => {
      const req = new Request(`http://localhost:3000/api/admin/jobs/${jobOfA._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `jh_session=${tokenB}`,
        },
        body: JSON.stringify({
          ...samplePayload,
          title: 'Hacked Title',
        }),
      });

      const res = await updateJobHandler(req, {
        params: Promise.resolve({ id: jobOfA._id }),
      });

      expect(res.status).toBe(403);
    });

    it('should reject Contributor B trying to delete Contributor A job with 403', async () => {
      const req = new Request(`http://localhost:3000/api/admin/jobs/${jobOfA._id}`, {
        method: 'DELETE',
        headers: { Cookie: `jh_session=${tokenB}` },
      });

      const res = await deleteJobHandler(req, {
        params: Promise.resolve({ id: jobOfA._id }),
      });

      expect(res.status).toBe(403);
    });

    it('should allow Admin to update or delete any contributor post', async () => {
      const req = new Request(`http://localhost:3000/api/admin/jobs/${jobOfA._id}`, {
        method: 'DELETE',
        headers: { Cookie: `jh_session=${adminToken}` },
      });

      const res = await deleteJobHandler(req, {
        params: Promise.resolve({ id: jobOfA._id }),
      });

      expect(res.status).toBe(200);
      expect(mockJobs).toHaveLength(0);
    });
  });

  describe('GET /api/admin/jobs (Listing isolation)', () => {
    beforeEach(() => {
      mockJobs = [
        {
          _id: 'j1',
          title: 'Alpha Post',
          createdBy: contributorA._id,
        },
        {
          _id: 'j2',
          title: 'Beta Post',
          createdBy: contributorB._id,
        },
      ];
    });

    it('should return only self-authored jobs for contributor', async () => {
      const req = new Request('http://localhost:3000/api/admin/jobs', {
        headers: { Cookie: `jh_session=${tokenA}` },
      });

      const res = await listJobsHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].title).toBe('Alpha Post');
    });

    it('should return all platform jobs for admin', async () => {
      const req = new Request('http://localhost:3000/api/admin/jobs', {
        headers: { Cookie: `jh_session=${adminToken}` },
      });

      const res = await listJobsHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.jobs).toHaveLength(2);
    });
  });
});
