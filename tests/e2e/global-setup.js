/**
 * @file tests/e2e/global-setup.js
 * @description Playwright Global Setup script executed once before all test workers start.
 */

import { seedTestData } from './fixtures/seed.js';
import mongoose from 'mongoose';

export default async function globalSetup() {
  const uri = process.env.MONGODB_URI || '';
  const dbName = uri.split('/').pop()?.split('?')[0] ?? '';
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `E2E tests MUST run against a database whose name ends with "_test". Got: "${dbName}". Check MONGODB_URI.`
    );
  }
  console.info('🌱 Seeding database for E2E tests...');
  await seedTestData();
  await mongoose.disconnect();
  console.info('✓ E2E database seeding complete.');
}
