/**
 * @file app/api/alerts/unsubscribe/route.js
 * @description RFC-compliant one-click unsubscribe handler for job alert emails.
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
        `<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Invalid or missing unsubscribe token.</h2><p><a href="${siteConfig.url}">Return to Home</a></p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    await connectDB();

    const subscriber = await Subscriber.findOneAndDelete({ unsubscribeToken: token });
    if (!subscriber) {
      return new NextResponse(
        `<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>You are already unsubscribed.</h2><p><a href="${siteConfig.url}">Return to Home</a></p></body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed — ${siteConfig.name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="font-size: 36px; margin-bottom: 16px;">👋</div>
            <h1 style="font-size: 22px; font-weight: bold; margin-bottom: 8px;">You Have Been Unsubscribed</h1>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px;">
              You will no longer receive daily job alert emails for <strong>${subscriber.email}</strong>.
            </p>
            <a href="${siteConfig.url}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              Return to ${siteConfig.name}
            </a>
          </div>
        </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
