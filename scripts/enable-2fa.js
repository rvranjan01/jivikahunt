/**
 * @file scripts/enable-2fa.js
 * @description Generates and activates a TOTP 2FA configuration for an admin account.
 * Usage: node scripts/enable-2fa.js <adminEmail>
 */

import { connectToDatabase } from '../lib/db.js';
import User from '../models/User.js';
import { createTotpSecret, generateTotpQrCode } from '../lib/totp.js';

if (process.argv.includes('--dry-run')) {
  console.info('Dry run: scripts/enable-2fa.js loaded successfully. Skipping DB operations.');
  process.exit(0);
}

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const email = args[0];

if (!email) {
  console.error('Error: Admin email argument is required.');
  console.error('Usage: node scripts/enable-2fa.js <adminEmail>');
  process.exit(1);
}

async function enable2Fa() {
  console.info('Connecting to database...');
  await connectToDatabase();

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`Error: User with email ${email} not found.`);
    process.exit(1);
  }

  if (user.role !== 'admin') {
    console.error(`Error: User ${email} does not have the admin role.`);
    process.exit(1);
  }

  const totpSecret = createTotpSecret();
  const { uri } = await generateTotpQrCode(email, totpSecret);

  user.totpSecret = totpSecret;
  await user.save();

  console.info('\n' + '='.repeat(60));
  console.info('🔐 [ADMIN 2FA ENABLED SUCCESSFULLY]');
  console.info(`Email:        ${email}`);
  console.info(`TOTP Secret:  ${totpSecret}`);
  console.info(`Authenticator URI: ${uri}`);
  console.info('='.repeat(60));
  console.info(
    'Scan the TOTP URI with your authenticator app (Google Authenticator, Microsoft Authenticator, 1Password).\n'
  );

  process.exit(0);
}

enable2Fa().catch((err) => {
  console.error('Failed to enable 2FA:', err);
  process.exit(1);
});
