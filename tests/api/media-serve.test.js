import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';
import crypto from 'crypto';
import { GET as imageServeHandler } from '@/app/img/[id]/route';

vi.mock('@/lib/db', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

let mockImageStore = [];

vi.mock('@/models/Image', () => {
  return {
    default: {
      findById: vi.fn().mockImplementation((id) => {
        return Promise.resolve(
          mockImageStore.find((img) => img._id.toString() === id.toString()) || null
        );
      }),
    },
  };
});

describe('GET /img/[id] (Media Delivery Route)', () => {
  let sampleWebpBuffer;
  let sampleImageId;
  let sampleImage;
  let sampleEtag;

  beforeEach(async () => {
    sampleWebpBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 234, g: 88, b: 12, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();

    sampleImageId = '65b89a333333333333333333';
    sampleImage = {
      _id: sampleImageId,
      contentType: 'image/webp',
      data: sampleWebpBuffer,
      width: 100,
      height: 100,
    };

    const hashSlice = crypto.createHash('md5').update(sampleWebpBuffer).digest('hex').slice(0, 16);
    sampleEtag = `"${sampleImageId}-${sampleWebpBuffer.length}-${hashSlice}"`;

    mockImageStore = [sampleImage];
  });

  it('should return 404 for malformed/invalid ObjectId', async () => {
    const req = new Request('http://localhost:3000/img/invalid-id');
    const res = await imageServeHandler(req, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });

    expect(res.status).toBe(404);
  });

  it('should return 404 when image is not found in MongoDB', async () => {
    const req = new Request('http://localhost:3000/img/65b89a999999999999999999');
    const res = await imageServeHandler(req, {
      params: Promise.resolve({ id: '65b89a999999999999999999' }),
    });

    expect(res.status).toBe(404);
  });

  it('should serve image with 200, WebP mime type, and immutable cache headers', async () => {
    const req = new Request(`http://localhost:3000/img/${sampleImageId}`);
    const res = await imageServeHandler(req, {
      params: Promise.resolve({ id: sampleImageId }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/webp');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('ETag')).toBe(sampleEtag);

    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.length).toBe(sampleWebpBuffer.length);
  });

  it('should return 304 Not Modified when matching If-None-Match header is sent', async () => {
    const req = new Request(`http://localhost:3000/img/${sampleImageId}`, {
      headers: {
        'If-None-Match': sampleEtag,
      },
    });

    const res = await imageServeHandler(req, {
      params: Promise.resolve({ id: sampleImageId }),
    });

    expect(res.status).toBe(304);
    expect(res.headers.get('ETag')).toBe(sampleEtag);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });
});
