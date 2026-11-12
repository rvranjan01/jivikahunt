/**
 * @file app/api/health/route.js
 * @description Health check endpoint for uptime monitors and deployment verification.
 * Tests system responsiveness and verifies MongoDB connectivity.
 */

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Handles GET requests to /api/health.
 * @returns {Promise<NextResponse>} JSON health report
 */
export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'disconnected';

  if (process.env.MONGODB_URI) {
    try {
      await connectToDatabase();
      const readyState = mongoose.connection.readyState;
      if (readyState === 1) {
        dbStatus = 'connected';
      } else if (readyState === 2) {
        dbStatus = 'connecting';
      } else {
        dbStatus = 'disconnected';
      }
    } catch (err) {
      dbStatus = 'error';
    }
  } else {
    dbStatus = 'unconfigured';
  }

  const isHealthy = dbStatus === 'connected' || dbStatus === 'unconfigured';
  const responsePayload = {
    status: isHealthy ? 'ok' : 'degraded',
    service: 'jivikahunt',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
    responseTimeMs: Date.now() - startTime,
    environment: process.env.NODE_ENV || 'development',
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
    },
  });
}
