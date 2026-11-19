/**
 * @file scripts/seed-admin.js
 * @description Seeds the initial administrator account and generates their TOTP 2FA configuration.
 * Usage: node scripts/seed-admin.js [adminEmail] [adminPassword]
 */

import { connectToDatabase } from '../lib/db.js';
import User from '../models/User.js';
import { hashPassword } from '../lib/password.js';
import { createTotpSecret, generateTotpQrCode } from '../lib/totp.js';

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

async function seedAdmin() {
  console.info('Connecting to database...');
  await connectToDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    console.info(`Admin user with email ${email} already exists.`);
    process.exit(0);
  }

  const is2FaRequired = process.env.ADMIN_2FA_REQUIRED !== 'false';
  let totpSecret = null;
  let uri = null;

  if (is2FaRequired) {
    totpSecret = createTotpSecret();
    const qrResult = await generateTotpQrCode(email, totpSecret);
    uri = qrResult.uri;
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
    totpSecret,
    bio: 'Founder and administrator at JivikaHunt.',
  });

  console.info('\n' + '='.repeat(60));
  console.info('🎉 [ADMIN ACCOUNT SEEDED SUCCESSFULLY]');
  console.info(`ID:           ${admin._id}`);
  console.info(`Email:        ${email}`);
  if (is2FaRequired) {
    console.info(`TOTP Secret:  ${totpSecret}`);
    console.info(`Authenticator URI: ${uri}`);
    console.info('='.repeat(60));
    console.info(
      'Scan the TOTP URI with your authenticator app (Google Authenticator, Microsoft Authenticator, 1Password).\n'
    );
  } else {
    console.info('2FA:          Disabled (ADMIN_2FA_REQUIRED=false)');
    console.info('='.repeat(60));
  }

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
