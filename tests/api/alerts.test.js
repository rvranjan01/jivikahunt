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
});
