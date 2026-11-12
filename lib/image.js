/**
 * @file lib/image.js
 * @description Image verification, Sharp transformation pipeline, and initials avatar generator.
 * Enforces magic-byte signature checks, strictly blocks non-image formats, and converts all
 * uploads to stripped WebP buffers for permanent database storage.
 */

import sharp from 'sharp';
export { getInitials } from './formatters';

export const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 Megabyte
export const MAX_LOGO_DIMENSION = 160; // 160x160 max for logos
export const MAX_PROFILE_DIMENSION = 256; // 256x256 max for profile photos

/**
 * Validates the genuine binary signature (magic bytes) of an uploaded buffer.
 * Rejects disguised files, executables, SVGs (which can execute JS), PDFs, etc.
 * Accepts ONLY PNG, JPEG, and WebP.
 *
 * @param {Buffer} buffer - Binary file buffer
 * @returns {{ valid: boolean, format?: 'png' | 'jpeg' | 'webp' }}
 */
export function detectImageSignature(buffer) {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // 1. PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, format: 'png' };
  }

  // 2. JPEG Signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, format: 'jpeg' };
  }

  // 3. WebP Signature: RIFF at 0..3 and WEBP at 8..11
  const isRiff =
    buffer[0] === 0x52 && // 'R'
    buffer[1] === 0x49 && // 'I'
    buffer[2] === 0x46 && // 'F'
    buffer[3] === 0x46; // 'F'

  const isWebp =
    buffer[8] === 0x57 && // 'W'
    buffer[9] === 0x45 && // 'E'
    buffer[10] === 0x42 && // 'B'
    buffer[11] === 0x50; // 'P'

  if (isRiff && isWebp) {
    return { valid: true, format: 'webp' };
  }

  return { valid: false };
}

/**
 * Processes, resizes, strips metadata, and converts an image buffer into WebP.
 *
 * @param {Buffer} rawBuffer - Input binary buffer
 * @param {'logo' | 'profile'} [type='logo'] - Transformation preset
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, contentType: 'image/webp' }>}
 * @throws {Error} If image is invalid, corrupt, or exceeds limits
 */
export async function processImageUpload(rawBuffer, type = 'logo') {
  if (!rawBuffer || rawBuffer.length === 0) {
    throw new Error('Image buffer is empty.');
  }

  if (rawBuffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image exceeds the maximum allowed file size of 1 MB.');
  }

  const signature = detectImageSignature(rawBuffer);
  if (!signature.valid) {
    throw new Error('Invalid file format. Only genuine PNG, JPEG, and WebP images are accepted.');
  }

  const maxDimension = type === 'profile' ? MAX_PROFILE_DIMENSION : MAX_LOGO_DIMENSION;
  const resizeOptions =
    type === 'profile'
      ? { width: maxDimension, height: maxDimension, fit: sharp.fit.cover }
      : {
          width: maxDimension,
          height: maxDimension,
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        };

  // Strip metadata (EXIF, GPS, camera details) for privacy and bandwidth savings
  const pipeline = sharp(rawBuffer)
    .rotate() // Auto-orient based on EXIF before stripping
    .resize(resizeOptions)
    .webp({ quality: 85, effort: 4 });

  const { data: buffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer,
    width: info.width,
    height: info.height,
    contentType: 'image/webp',
  };
}
