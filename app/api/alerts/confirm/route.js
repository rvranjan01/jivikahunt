/**
 * @file app/api/alerts/confirm/route.js
 * @description Completes the double opt-in verification for email job alert subscribers.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Subscriber from '@/models/Subscriber';
import siteConfig from '@/lib/siteConfig';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token || typeof token !== 'string') {
      return new NextResponse(
        `<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Invalid or missing confirmation link.</h2><p><a href="${siteConfig.url}">Return to Home</a></p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    await connectDB();

    const subscriber = await Subscriber.findOne({ confirmToken: token });
    if (!subscriber) {
      return new NextResponse(
        `<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Confirmation link is expired or already used.</h2><p><a href="${siteConfig.url}">Return to Home</a></p></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    subscriber.confirmedAt = new Date();
    subscriber.confirmToken = null;
    await subscriber.save();

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Job Alerts Confirmed — ${siteConfig.name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="font-size: 40px; margin-bottom: 16px;">🎉</div>
            <h1 style="font-size: 22px; font-weight: bold; margin-bottom: 8px;">Job Alerts Confirmed!</h1>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px;">
              You will now receive daily email digests of curated freshers drives and internships directly to <strong>${subscriber.email}</strong>.
            </p>
            <a href="${siteConfig.url}/jobs" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              Browse Current Jobs &rarr;
            </a>
          </div>
        </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err) {
    console.error('Confirmation error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
