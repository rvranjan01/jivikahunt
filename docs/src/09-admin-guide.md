# 09 — Administrator Guide

## 1. Initial Admin Account Setup

To initialize the first administrative user, execute the local seed script:

```bash
node scripts/seed-admin.js <adminEmail> <adminPassword>
```

Example:

```bash
node scripts/seed-admin.js admin@jivikahunt.com AdminPass123!
```

The script will output:

- **Email & Password**: Administrative credentials.
- **TOTP Secret**: A 32-character Base32 secret string.
- **Authenticator URI**: Can be imported directly into Google Authenticator, Microsoft Authenticator, or 1Password.

## 2. Accessing the Staff Portal

1. Navigate to `/admin/login`.
2. Enter your administrator email and password.
3. Click "Sign In". The portal will prompt for your 6-digit TOTP code.
4. Enter the code from your authenticator app to complete login.

## 3. Managing Users & Contributors

Admins have full authority to manage contributor accounts at `/admin/users`:

### Inviting a New Contributor

1. Click **+ Invite Contributor** on `/admin/users`.
2. Fill in:
   - **Full Name**: e.g., "Rahul Sharma".
   - **Public Display Name**: e.g., "Rahul S." (shown on job cards and author box).
   - **Email Address**: Contributor's login email.
   - **Short Bio**: Optional 250-character bio.
3. Click **Send Invitation**.
4. The system generates a 14-character secure temporary password, dispatches the welcome invite via Resend (or prints to console in local development), and displays the temporary password in the modal for easy copying.
5. On their first login, the contributor will be forced to set their own secure password.

### Deactivating a Contributor

1. On `/admin/users`, locate the contributor in the table.
2. Click **Deactivate**.
3. The account's `isActive` flag is set to `false` and its `tokenVersion` is incremented. All active JWT sessions for that contributor are revoked immediately.
4. Admins cannot deactivate their own account.
