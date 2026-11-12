import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as listGuidesHandler, POST as createGuideHandler } from '@/app/api/admin/guides/route';
import {
  GET as getGuideHandler,
  PUT as updateGuideHandler,
  DELETE as deleteGuideHandler,
} from '@/app/api/admin/guides/[id]/route';
import { createSessionToken } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/audit', () => ({
  recordAuditLog: vi.fn().mockResolvedValue(true),
}));

let mockGuides = [];
let mockUsers = [];

vi.mock('@/models/User', () => ({
  default: {
    findById: vi.fn().mockImplementation((id) => {
      const found = mockUsers.find((u) => u._id.toString() === id.toString());
      return Promise.resolve(found || null);
    }),
  },
}));

vi.mock('@/models/Guide', () => ({
  default: {
    find: vi.fn().mockImplementation((query) => {
      let filtered = [...mockGuides];
      if (query?.createdBy) {
        filtered = filtered.filter((g) => g.createdBy.toString() === query.createdBy.toString());
      }
      return {
        sort: () => ({
          lean: () => Promise.resolve(filtered),
        }),
      };
    }),
    findById: vi.fn().mockImplementation((id) => {
      const found = mockGuides.find((g) => g._id.toString() === id.toString());
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        save: vi.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      });
    }),
    create: vi.fn().mockImplementation((data) => {
      const created = {
        _id: `guide_${Date.now()}_${Math.random()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGuides.push(created);
      return Promise.resolve(created);
    }),
    deleteOne: vi.fn().mockImplementation(({ _id }) => {
      const idx = mockGuides.findIndex((g) => g._id.toString() === _id.toString());
      if (idx !== -1) mockGuides.splice(idx, 1);
      return Promise.resolve({ acknowledged: true });
    }),
    findOne: vi.fn().mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve(null),
      }),
    })),
  },
}));

describe('Admin & Contributor Guides API (app/api/admin/guides)', () => {
  beforeEach(() => {
    mockGuides = [];
    mockUsers = [
      {
        _id: 'user_contrib_a',
        email: 'contrib.a@example.com',
        displayName: 'Alice Curator',
        role: 'contributor',
        isActive: true,
        tokenVersion: 1,
      },
      {
        _id: 'user_contrib_b',
        email: 'contrib.b@example.com',
        displayName: 'Bob Curator',
        role: 'contributor',
        isActive: true,
        tokenVersion: 1,
      },
      {
        _id: 'user_admin_1',
        email: 'admin@example.com',
        displayName: 'Admin Leader',
        role: 'admin',
        isActive: true,
        tokenVersion: 1,
      },
    ];
  });

  it('should allow contributor to create a guide with calculated reading time', async () => {
    const token = await createSessionToken({
      userId: 'user_contrib_a',
      email: 'contrib.a@example.com',
      role: 'contributor',
      tokenVersion: 1,
    });

    const bodyText = 'This is a great career advice article. '.repeat(50); // ~350 words -> 2 min read

    const req = new Request('http://localhost:3000/api/admin/guides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `jh_session=${token}`,
      },
      body: JSON.stringify({
        title: 'Mastering Coding Rounds in 2026',
        summary: 'Essential roadmap to crack technical coding assessments in top tier companies.',
        body: bodyText,
        status: 'published',
      }),
    });

    const res = await createGuideHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.guide.slug).toContain('mastering-coding-rounds');
    expect(data.guide.readingTime).toBe(2);
    expect(data.guide.postedByName).toBe('Alice Curator');
  });

  it('should isolate guides by contributor in GET /api/admin/guides', async () => {
    mockGuides.push(
      {
        _id: 'guide_a',
        title: 'Alice Guide',
        createdBy: 'user_contrib_a',
        postedByName: 'Alice Curator',
      },
      {
        _id: 'guide_b',
        title: 'Bob Guide',
        createdBy: 'user_contrib_b',
        postedByName: 'Bob Curator',
      }
    );

    // Contributor A lists
    const tokenA = await createSessionToken({
      userId: 'user_contrib_a',
      email: 'contrib.a@example.com',
      role: 'contributor',
      tokenVersion: 1,
    });

    const reqA = new Request('http://localhost:3000/api/admin/guides', {
      headers: { cookie: `jh_session=${tokenA}` },
    });
    const resA = await listGuidesHandler(reqA);
    const dataA = await resA.json();
    expect(dataA.guides).toHaveLength(1);
    expect(dataA.guides[0].title).toBe('Alice Guide');

    // Admin lists -> sees all
    const tokenAdmin = await createSessionToken({
      userId: 'user_admin_1',
      email: 'admin@example.com',
      role: 'admin',
      tokenVersion: 1,
    });
    const reqAdmin = new Request('http://localhost:3000/api/admin/guides', {
      headers: { cookie: `jh_session=${tokenAdmin}` },
    });
    const resAdmin = await listGuidesHandler(reqAdmin);
    const dataAdmin = await resAdmin.json();
    expect(dataAdmin.guides).toHaveLength(2);
  });

  it('should prevent Contributor B from updating Contributor A guide with HTTP 403', async () => {
    mockGuides.push({
      _id: 'guide_a_only',
      title: 'Original Title',
      summary: 'Valid summary meeting minimum length of 30 characters.',
      body: 'Valid markdown body that contains enough words to pass validation.',
      status: 'draft',
      createdBy: 'user_contrib_a',
    });

    const tokenB = await createSessionToken({
      userId: 'user_contrib_b',
      email: 'contrib.b@example.com',
      role: 'contributor',
      tokenVersion: 1,
    });

    const req = new Request('http://localhost:3000/api/admin/guides/guide_a_only', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: `jh_session=${tokenB}`,
      },
      body: JSON.stringify({
        title: 'Hacked Title',
        summary: 'Updated summary meeting minimum length of 30 characters.',
        body: 'Updated markdown body that contains enough words to pass validation.',
      }),
    });

    const res = await updateGuideHandler(req, {
      params: Promise.resolve({ id: 'guide_a_only' }),
    });

    expect(res.status).toBe(403);
  });
});
