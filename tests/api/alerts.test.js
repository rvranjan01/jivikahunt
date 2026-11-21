import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as subscribeHandler } from '@/app/api/alerts/subscribe/route';
import { GET as confirmHandler } from '@/app/api/alerts/confirm/route';
import { GET as unsubscribeHandler } from '@/app/api/alerts/unsubscribe/route';

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/audit', () => ({
  recordAuditLog: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/email', () => ({
  sendSubscriptionConfirmationEmail: vi.fn().mockResolvedValue({ success: true, simulated: true }),
}));

let mockSubscribers = [];
let mockLoginAttempts = [];

vi.mock('@/models/LoginAttempt', () => ({
  default: {
    findOne: vi.fn().mockImplementation(({ key }) => {
      return Promise.resolve(mockLoginAttempts.find((r) => r.key === key) || null);
    }),
    create: vi.fn().mockImplementation((doc) => {
      const entry = { attempts: 1, ...doc };
      mockLoginAttempts.push(entry);
      return Promise.resolve(entry);
    }),
    updateOne: vi.fn().mockImplementation(({ key }, updates) => {
      const rec = mockLoginAttempts.find((r) => r.key === key);
      if (rec) {
        if (updates.$inc?.attempts) rec.attempts = (rec.attempts || 0) + updates.$inc.attempts;
        if (updates.$set) Object.assign(rec, updates.$set);
      }
      return Promise.resolve({ modifiedCount: 1 });
    }),
  },
}));

vi.mock('@/models/Subscriber', () => ({
  default: {
    findOne: vi.fn().mockImplementation((query) => {
      const match = mockSubscribers.find((s) => {
        if (query.email && s.email !== query.email) return false;
        if (query.confirmToken && s.confirmToken !== query.confirmToken) return false;
        if (query.unsubscribeToken && s.unsubscribeToken !== query.unsubscribeToken) return false;
        return true;
      });

      if (!match) return Promise.resolve(null);
      return Promise.resolve({
        ...match,
        save: vi.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      });
    }),
    create: vi.fn().mockImplementation((data) => {
      const doc = { _id: `sub_${Date.now()}`, ...data };
      mockSubscribers.push(doc);
      return Promise.resolve(doc);
    }),
    findOneAndDelete: vi.fn().mockImplementation(({ unsubscribeToken }) => {
      const idx = mockSubscribers.findIndex((s) => s.unsubscribeToken === unsubscribeToken);
      if (idx === -1) return Promise.resolve(null);
      const [deleted] = mockSubscribers.splice(idx, 1);
      return Promise.resolve(deleted);
    }),
  },
}));

describe('Job Alerts Double Opt-In & Unsubscribe API (app/api/alerts)', () => {
  beforeEach(() => {
    mockSubscribers = [];
    mockLoginAttempts = [];
    vi.clearAllMocks();
  });

  it('should allow a visitor to subscribe and issue verification tokens', async () => {
    const req = new Request('http://localhost:3000/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@college.edu',
        types: ['fresher', 'intern'],
        batches: [2025],
      }),
    });

    const res = await subscribeHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(mockSubscribers).toHaveLength(1);
    expect(mockSubscribers[0].email).toBe('student@college.edu');
    expect(mockSubscribers[0].confirmToken).toBeDefined();
    expect(mockSubscribers[0].unsubscribeToken).toBeDefined();
    expect(mockSubscribers[0].confirmedAt).toBeNull();
  });

  it('should reject invalid email addresses with HTTP 400', async () => {
    const req = new Request('http://localhost:3000/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
      }),
    });

    const res = await subscribeHandler(req);
    expect(res.status).toBe(400);
  });

  it('should confirm subscription when valid confirm token is supplied', async () => {
    mockSubscribers.push({
      _id: 'sub_123',
      email: 'student@example.com',
      confirmToken: 'valid_confirm_token_123',
      unsubscribeToken: 'unsub_token_123',
      confirmedAt: null,
    });

    const req = new Request(
      'http://localhost:3000/api/alerts/confirm?token=valid_confirm_token_123'
    );
    const res = await confirmHandler(req);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Job Alerts Confirmed!');
  });

  it('should reject invalid confirmation tokens with HTTP 404', async () => {
    const req = new Request('http://localhost:3000/api/alerts/confirm?token=invalid_token_999');
    const res = await confirmHandler(req);

    expect(res.status).toBe(404);
  });

  it('should unsubscribe and delete record when valid unsubscribe token is supplied', async () => {
    mockSubscribers.push({
      _id: 'sub_456',
      email: 'student@example.com',
      unsubscribeToken: 'valid_unsub_token_456',
      confirmedAt: new Date(),
    });

    const req = new Request(
      'http://localhost:3000/api/alerts/unsubscribe?token=valid_unsub_token_456'
    );
    const res = await unsubscribeHandler(req);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('You Have Been Unsubscribed');
    expect(mockSubscribers).toHaveLength(0);
  });

  it('should return identical success message whether or not email already exists', async () => {
    mockSubscribers.push({
      _id: 'sub_existing',
      email: 'existing@college.edu',
      preferences: { types: ['fresher'], batches: [2024] },
      confirmToken: 'old_token',
      unsubscribeToken: 'unsub_existing',
      confirmedAt: null,
      confirmTokenSentAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago (outside cooldown)
      save: vi.fn().mockResolvedValue(true),
    });

    const req = new Request('http://localhost:3000/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@college.edu',
        types: ['fresher'],
        batches: [2025],
      }),
    });

    const res = await subscribeHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe(
      'A confirmation link has been sent to your email. Please check your inbox.'
    );
  });

  it('should not resend confirmation email if one was sent in the last 10 minutes', async () => {
    const { sendSubscriptionConfirmationEmail } = await import('@/lib/email');

    mockSubscribers.push({
      _id: 'sub_recent',
      email: 'recent@college.edu',
      preferences: { types: ['fresher'], batches: [2024] },
      confirmToken: 'recent_token',
      unsubscribeToken: 'unsub_recent',
      confirmedAt: null,
      confirmTokenSentAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago (within cooldown)
      save: vi.fn().mockResolvedValue(true),
    });

    const req = new Request('http://localhost:3000/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'recent@college.edu',
        types: ['fresher'],
        batches: [2025],
      }),
    });

    const res = await subscribeHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    // Should NOT call sendSubscriptionConfirmationEmail
    expect(sendSubscriptionConfirmationEmail).not.toHaveBeenCalled();
  });

  it('should reject when IP exceeds 5 requests per hour', async () => {
    // Seed IP rate limit with 5 attempts
    mockLoginAttempts.push({
      key: 'sub_ip:127.0.0.1', // Or whatever ipHash matches
      attempts: 5,
    });
    // To match whatever ipHash is computed, mock checkSubscribeIpRateLimit or mock the key pattern
    // Let's seed by checking any key starting with 'sub_ip:'
    mockLoginAttempts[0] = {
      key: mockLoginAttempts[0].key,
      attempts: 5,
    };

    // Use a custom finder for IP key in test or match startswith
    const req = new Request('http://localhost:3000/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rate_limited@college.edu',
        types: ['fresher'],
      }),
    });

    // Make mockLoginAttempts find match any sub_ip:
    const origFindOne = (await import('@/models/LoginAttempt')).default.findOne;
    origFindOne.mockImplementationOnce(({ key }) => {
      if (key.startsWith('sub_ip:')) {
        return Promise.resolve({ key, attempts: 5 });
      }
      return Promise.resolve(null);
    });

    const res = await subscribeHandler(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('Too many requests');
  });

  it('should reject when email exceeds 3 requests per day', async () => {
    const origFindOne = (await import('@/models/LoginAttempt')).default.findOne;
    origFindOne
      .mockImplementationOnce(({ key }) => {
        // IP check passes
        if (key.startsWith('sub_ip:')) return Promise.resolve(null);
        return Promise.resolve(null);
      })
      .mockImplementationOnce(({ key }) => {
        // Email check fails
        if (key.startsWith('sub_email:')) return Promise.resolve({ key, attempts: 3 });
        return Promise.resolve(null);
      });

    const req = new Request('http://localhost:3000/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'daily_limit@college.edu',
        types: ['fresher'],
      }),
    });

    const res = await subscribeHandler(req);
    expect(res.status).toBe(429);
  });
});
