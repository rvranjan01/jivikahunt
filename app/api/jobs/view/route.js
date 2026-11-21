/**
 * @file app/api/jobs/view/route.js
 * @description Public endpoint to record job views with origin verification, bot filtering,
 * and 1-per-hour-per-IP rate limiting. Only published jobs are counted.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { assertSameOrigin, getClientIp, hashIp } from '@/lib/security';
import { checkViewRateLimit, recordView } from '@/lib/rateLimit';

const BOT_UA_REGEX =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|twitterbot|slackbot|curl|wget|lighthouse/i;

export async function POST(request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const userAgent = request.headers.get('user-agent') || '';
  if (BOT_UA_REGEX.test(userAgent)) {
    return NextResponse.json({ success: true, ignored: true }, { status: 200 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const slug = body?.slug;
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Valid slug is required' }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  const ipHash = hashIp(clientIp);
  const viewKey = `${ipHash}:${slug.toLowerCase()}`;

  const rateCheck = await checkViewRateLimit(viewKey);
  if (!rateCheck.allowed) {
    return NextResponse.json({ success: true, counted: false }, { status: 200 });
  }

  await connectDB();

  // Only published jobs have view counters incremented (no drafts, scheduled, or unpublished)
  const job = await Job.findOneAndUpdate(
    { slug: slug.toLowerCase(), status: 'published' },
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!job) {
    return NextResponse.json({ success: true, counted: false }, { status: 200 });
  }

  await recordView(viewKey);

  return NextResponse.json({ success: true, counted: true }, { status: 200 });
}
