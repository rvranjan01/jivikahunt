import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  detectImageSignature,
  getInitials,
  processImageUpload,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/image';

describe('Image Processing Utilities (lib/image.js)', () => {
  describe('detectImageSignature (Magic Bytes)', () => {
    it('should correctly identify a valid PNG signature', () => {
      // 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const result = detectImageSignature(pngBuffer);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('png');
    });

    it('should correctly identify a valid JPEG signature', () => {
      // FF D8 FF
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const result = detectImageSignature(jpegBuffer);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('jpeg');
    });

    it('should correctly identify a valid WebP signature', () => {
      // RIFF....WEBP
      const webpBuffer = Buffer.from([
        0x52,
        0x49,
        0x46,
        0x46, // 'RIFF'
        0x20,
        0x00,
        0x00,
        0x00,
        0x57,
        0x45,
        0x42,
        0x50, // 'WEBP'
      ]);
      const result = detectImageSignature(webpBuffer);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('webp');
    });

    it('should reject text files disguised as images', () => {
      const fakeBuffer = Buffer.from('<?php echo "evil"; ?>');
      const result = detectImageSignature(fakeBuffer);
      expect(result.valid).toBe(false);
    });

    it('should reject SVG XML files to prevent XSS execution', () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      const result = detectImageSignature(svgBuffer);
      expect(result.valid).toBe(false);
    });

    it('should reject truncated or empty buffers', () => {
      expect(detectImageSignature(Buffer.from([0x89, 0x50])).valid).toBe(false);
      expect(detectImageSignature(null).valid).toBe(false);
      expect(detectImageSignature(Buffer.alloc(0)).valid).toBe(false);
    });
  });

  describe('getInitials', () => {
    it('should derive initials for multi-word company names', () => {
      expect(getInitials('Tata Consultancy Services')).toBe('TCS');
      expect(getInitials('Microsoft Corporation')).toBe('MC');
      expect(getInitials('Amazon Web Services')).toBe('AWS');
    });

    it('should derive 2-letter initials for single-word companies', () => {
      expect(getInitials('Google')).toBe('GO');
      expect(getInitials('Flipkart')).toBe('FL');
    });

    it('should fallback to JH for empty or invalid input', () => {
      expect(getInitials('')).toBe('JH');
      expect(getInitials(null)).toBe('JH');
      expect(getInitials('   ')).toBe('JH');
    });
  });

  describe('processImageUpload (Sharp WebP Pipeline)', () => {
    it('should convert valid raw image to stripped WebP and resize logo to max 160x160', async () => {
      // Create a 300x200 test PNG
      const testPng = await sharp({
        create: {
          width: 300,
          height: 200,
          channels: 4,
          background: { r: 59, g: 130, b: 246, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const processed = await processImageUpload(testPng, 'logo');
      expect(processed.contentType).toBe('image/webp');
      expect(processed.buffer).toBeInstanceOf(Buffer);
      expect(processed.width).toBeLessThanOrEqual(160);
      expect(processed.height).toBeLessThanOrEqual(160);

      // Verify the generated output has a valid WebP signature
      const sig = detectImageSignature(processed.buffer);
      expect(sig.valid).toBe(true);
      expect(sig.format).toBe('webp');
    });

    it('should resize profile photos to max 256x256', async () => {
      const testJpeg = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 16, g: 185, b: 129 },
        },
      })
        .jpeg()
        .toBuffer();

      const processed = await processImageUpload(testJpeg, 'profile');
      expect(processed.contentType).toBe('image/webp');
      expect(processed.width).toBe(256);
      expect(processed.height).toBe(256);
    });

    it('should reject buffers larger than 1 MB', async () => {
      const oversizedBuffer = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 10);
      await expect(processImageUpload(oversizedBuffer, 'logo')).rejects.toThrow(
        /exceeds the maximum allowed file size/
      );
    });
  });
});
