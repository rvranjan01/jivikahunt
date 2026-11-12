/**
 * @file app/api/admin/upload/route.js
 * @description Secure authenticated endpoint for uploading company logos and user avatars.
 * Validates file signature (magic bytes), re-encodes to WebP using Sharp, strips metadata,
 * and persists binary buffers directly in MongoDB.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { processImageUpload, MAX_IMAGE_SIZE_BYTES } from '@/lib/image';
import { connectToDatabase } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';
import Image from '@/models/Image';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const user = auth.user;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const rawType = formData.get('type') || 'logo';
    const type = rawType === 'profile' ? 'profile' : 'logo';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed limit of 1 MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    let processed;
    try {
      processed = await processImageUpload(rawBuffer, type);
    } catch (procErr) {
      return NextResponse.json({ error: procErr.message }, { status: 400 });
    }

    await connectToDatabase();
    const newImage = await Image.create({
      contentType: processed.contentType,
      data: processed.buffer,
      width: processed.width,
      height: processed.height,
      ownerId: user._id,
    });

    await recordAuditLog({
      action: 'image.upload',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'Image',
      targetId: newImage._id.toString(),
      metadata: {
        type,
        width: processed.width,
        height: processed.height,
        bytes: processed.buffer.length,
      },
    });

    return NextResponse.json(
      {
        success: true,
        image: {
          id: newImage._id.toString(),
          url: `/img/${newImage._id}`,
          width: newImage.width,
          height: newImage.height,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Image upload failed:', err);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}
