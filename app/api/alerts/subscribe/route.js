/**
 * @file app/api/alerts/subscribe/route.js
 * @description Public endpoint to initiate email job alerts with double opt-in verification.
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Subscriber from '@/models/Subscriber';
import { subscribeSchema } from '@/lib/validation';
import { sanitizeNoSql, getClientIp, hashIp } from '@/lib/security';
import { sendSubscriptionConfirmationEmail } from '@/lib/email';
import { recordAuditLog } from '@/lib/audit';

export async function POST(request) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const sanitized = sanitizeNoSql(rawBody);
    const parsed = subscribeSchema.safeParse(sanitized);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { email, types, batches } = parsed.data;

    await connectDB();

    const confirmToken = crypto.randomBytes(24).toString('hex');
    const unsubscribeToken = crypto.randomBytes(24).toString('hex');

    // Find existing or create new subscriber
    let subscriber = await Subscriber.findOne({ email });

    if (!subscriber) {
      subscriber = await Subscriber.create({
        email,
        preferences: { types, batches },
        confirmToken,
        unsubscribeToken,
        confirmedAt: null,
      });
    } else {
      // Update preferences and issue new confirm token
      subscriber.preferences = { types, batches };
      subscriber.confirmToken = confirmToken;
      await subscriber.save();
    }

    // Send verification email
    await sendSubscriptionConfirmationEmail({
      email,
      confirmToken,
      unsubscribeToken: subscriber.unsubscribeToken,
    });

    const clientIp = getClientIp(request);
    const ipHash = hashIp(clientIp);

    await recordAuditLog({
      action: 'alerts.subscribe_request',
      actorType: 'public',
      targetType: 'Subscriber',
      targetId: subscriber._id.toString(),
      ipHash,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'A confirmation link has been sent to your email. Please check your inbox.',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Subscription error:', err);
    return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
  }
}
