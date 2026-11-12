/**
 * @file scripts/seed-admin.js
 * @description Seeds the initial administrator account and generates their TOTP 2FA configuration.
 * Usage: node scripts/seed-admin.js [adminEmail] [adminPassword]
 */

import { connectToDatabase } from '../lib/db.js';
import User from '../models/User.js';
import { hashPassword } from '../lib/auth.js';
import { createTotpSecret, generateTotpQrCode } from '../lib/totp.js';

const email = process.argv[2] || 'admin@jivikahunt.com';
const password = process.argv[3] || 'AdminPass123!';

async function seedAdmin() {
  console.info('Connecting to database...');
  await connectToDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    console.info(`Admin user with email ${email} already exists.`);
    process.exit(0);
  }

  const totpSecret = createTotpSecret();
  const passwordHash = await hashPassword(password);
  const { uri } = await generateTotpQrCode(email, totpSecret);

  const admin = await User.create({
    name: 'Founder Admin',
    displayName: 'JivikaHunt Admin',
    email,
    passwordHash,
    role: 'admin',
    isActive: true,
    mustChangePassword: false,
    tokenVersion: 1,
    totpSecret,
    bio: 'Founder and administrator at JivikaHunt.',
  });

  console.info('\n' + '='.repeat(60));
  console.info('🎉 [ADMIN ACCOUNT SEEDED SUCCESSFULLY]');
  console.info(`ID:           ${admin._id}`);
  console.info(`Email:        ${email}`);
  console.info(`Password:     ${password}`);
  console.info(`TOTP Secret:  ${totpSecret}`);
  console.info(`Authenticator URI: ${uri}`);
  console.info('='.repeat(60));
  console.info(
    'Scan the TOTP URI with your authenticator app (Google Authenticator, Microsoft Authenticator, 1Password).\n'
  );

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
