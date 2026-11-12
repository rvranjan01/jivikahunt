import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';
import { POST as uploadHandler } from '@/app/api/admin/upload/route';
import { hashPassword, createSessionToken } from '@/lib/auth';
import { MAX_IMAGE_SIZE_BYTES } from '@/lib/image';

// Mock DB and Audit
vi.mock('@/lib/db', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/audit', () => ({
  recordAuditLog: vi.fn().mockResolvedValue(true),
}));

let mockImages = [];

vi.mock('@/models/Image', () => {
  return {
    default: {
      create: vi.fn().mockImplementation((doc) => {
        const created = {
          _id: '65b89a' + Math.random().toString(16).slice(2, 20),
          ...doc,
          createdAt: new Date(),
        };
        mockImages.push(created);
        return Promise.resolve(created);
      }),
    },
  };
});

let mockUser;

vi.mock('@/models/User', () => {
  return {
    default: {
      findById: vi.fn().mockImplementation(() => Promise.resolve(mockUser)),
    },
  };
});

describe('POST /api/admin/upload (Image Upload Endpoint)', () => {
  let userToken;
  let validPngBuffer;

  beforeEach(async () => {
    mockImages = [];

    mockUser = {
      _id: '65b89a111111111111111111',
      name: 'Contributor Aditi',
      displayName: 'Aditi S.',
      email: 'aditi@jivikahunt.com',
      passwordHash: await hashPassword('Pass123!'),
      role: 'contributor',
      isActive: true,
      tokenVersion: 1,
    };

    userToken = await createSessionToken({
      userId: mockUser._id.toString(),
      email: mockUser.email,
      role: mockUser.role,
      tokenVersion: mockUser.tokenVersion,
    });

    validPngBuffer = await sharp({
      create: {
        width: 120,
        height: 120,
        channels: 4,
        background: { r: 99, g: 102, b: 241, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  it('should reject unauthenticated upload requests with 401', async () => {
    const formData = new FormData();
    const req = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(401);
  });

  it('should reject requests without a file with 400', async () => {
    const formData = new FormData();
    const req = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers: { Cookie: `jh_session=${userToken}` },
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('No image file provided');
  });

  it('should reject disguised non-image files with 400', async () => {
    const fakeFile = new Blob(['malicious-script-content'], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', fakeFile, 'fake.png');

    const req = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers: { Cookie: `jh_session=${userToken}` },
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Only genuine PNG, JPEG, and WebP');
  });

  it('should reject oversized image files (> 1MB) with 400', async () => {
    const hugeBuffer = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 500);
    const hugeFile = new Blob([hugeBuffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', hugeFile, 'huge.png');

    const req = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers: { Cookie: `jh_session=${userToken}` },
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('exceeds maximum allowed limit');
  });

  it('should accept valid image, convert to WebP, and save to MongoDB with 201', async () => {
    const validFile = new Blob([validPngBuffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', validFile, 'company-logo.png');
    formData.append('type', 'logo');

    const req = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers: { Cookie: `jh_session=${userToken}` },
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.image).toBeDefined();
    expect(data.image.url).toMatch(/^\/img\/65b89a/);
    expect(data.image.width).toBeLessThanOrEqual(160);
    expect(data.image.height).toBeLessThanOrEqual(160);
    expect(mockImages).toHaveLength(1);
    expect(mockImages[0].contentType).toBe('image/webp');
  });
});
