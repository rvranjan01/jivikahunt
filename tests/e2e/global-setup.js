/**
 * @file tests/e2e/global-setup.js
 * @description Playwright Global Setup script executed once before all test workers start.
 */

import { seedTestData } from './fixtures/seed.js';
import mongoose from 'mongoose';

export default async function globalSetup() {
  console.info('🌱 Seeding database for E2E tests...');
  await seedTestData();
  await mongoose.disconnect();
  console.info('✓ E2E database seeding complete.');
}
