/**
 * @file scripts/seed-admin.js
 * @description Seeds the initial administrator account.
 * Usage: node scripts/seed-admin.js [adminEmail] [adminPassword]
 */

import { connectToDatabase } from '../lib/db.js';
import User from '../models/User.js';
import { hashPassword } from '../lib/password.js';
import { MIN_PASSWORD_LENGTH } from '../lib/validation.js';

if (process.argv.includes('--dry-run')) {
  console.info('Dry run: scripts/seed-admin.js loaded successfully. Skipping DB operations.');
  process.exit(0);
}

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const email = args[0];
const password = args[1];

if (!email || !password) {
  console.error('Error: Both email and password arguments are required.');
  console.error('Usage: node scripts/seed-admin.js <email> <password>');
  process.exit(1);
}

if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Error: Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  process.exit(1);
}

async function seedAdmin() {
  console.info('Connecting to database...');
  await connectToDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    console.info(`Admin user with email ${email} already exists.`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);

  const admin = await User.create({
    name: 'Founder Admin',
    displayName: 'JivikaHunt Admin',
    email,
    passwordHash,
    role: 'admin',
    isActive: true,
    mustChangePassword: true,
    tokenVersion: 1,
    bio: 'Founder and administrator at JivikaHunt.',
  });

  console.info('\n' + '='.repeat(60));
  console.info('🎉 [ADMIN ACCOUNT SEEDED SUCCESSFULLY]');
  console.info(`ID:           ${admin._id}`);
  console.info(`Email:        ${email}`);
  console.info('='.repeat(60));

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
