# 09 — Administrator Guide

## 1. Accessing the Admin Area

The management portal is located at `/admin/login`.

- **Credentials**: Email and password.
- **Two-Factor Authentication**: Administrators must provide a 6-digit TOTP code from their mobile authenticator app (Google Authenticator, Microsoft Authenticator, or 1Password).

## 2. Managing Users & Contributors

Admins have full authority to manage contributor accounts at `/admin/users`:

1. **Inviting a Contributor**:
   - Click "Invite Contributor".
   - Enter full name, display name, and email.
   - The system generates a temporary password and sends a welcome invite via Resend.
   - On their first login, the contributor is required to create a new password.
2. **Deactivating an Account**:
   - In `/admin/users`, toggle the "Active" status switch off.
   - The user's active session is revoked immediately via `tokenVersion` increment.

## 3. Reviewing Reports

Users can report broken links or issues using the "Report broken link" button on any job page.

- Reports appear in the queue at `/admin/reports`.
- Admins can investigate the destination careers link, update the job posting, or mark the report resolved.

## 4. Global Job Operations

- Admins can edit, unpublish, or delete any job posting on the platform.
- Admins can pin high-value listings as "Sponsored" / "Featured" which display a distinct badge.
