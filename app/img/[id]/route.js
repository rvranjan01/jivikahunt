/**
 * @file app/img/[id]/route.js
 * @description High-performance binary image delivery route.
 * Streams WebP images directly from MongoDB with immutable caching headers and ETag validation.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import Image from '@/models/Image';

export const dynamic = 'force-dynamic';

/**
 * Serves an image from MongoDB by ObjectId with ETag conditional validation.
 * @param {Request} request
 * @param {Object} context
 * @param {Promise<{ id: string }>} context.params
 */
export async function GET(request, context) {
  const { id } = await context.params;

  // Validate ObjectId structure before hitting MongoDB
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return new NextResponse('Image not found', { status: 404 });
  }

  try {
    await connectToDatabase();
    const image = await Image.findById(id);

    if (!image || !image.data) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Generate strong ETag based on image id, length, and hash slice
    const hashSlice = crypto.createHash('md5').update(image.data).digest('hex').slice(0, 16);
    const etag = `"${image._id}-${image.data.length}-${hashSlice}"`;

    // Check If-None-Match header for 304 Not Modified optimization
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Return binary WebP payload with long-lived immutable cache headers
    return new NextResponse(image.data, {
      status: 200,
      headers: {
        'Content-Type': image.contentType || 'image/webp',
        'Content-Length': image.data.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: etag,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error(`Error serving image [${id}]:`, err);
    return new NextResponse('Error serving image', { status: 500 });
  }
}
