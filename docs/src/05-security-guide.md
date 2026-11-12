# 05 — Security Guide

## 1. Security Architecture

Security is built into every layer of JivikaHunt. We follow the principle of least privilege, zero trust for user inputs, and defence-in-depth.

## 2. Key Safeguards

### Input Validation & NoSQL Injection Defense

- Every request payload is validated against a strict Zod schema.
- All query parameters and JSON keys are recursively sanitized: any key starting with `$` or containing `.` is stripped immediately to prevent NoSQL operator injection.
- Raw request objects are never passed directly to Mongoose queries.

### Session Security (Jose & JWT)

- JWTs are stored exclusively in `httpOnly`, `Secure`, `SameSite=Lax` cookies with short lifespans (12 hours).
- Every user document contains a `tokenVersion` integer. When a user updates their password or is deactivated, their `tokenVersion` is incremented, instantly invalidating all existing tokens across all devices.
- `isActive` is re-checked against MongoDB on every single administrative API call.

### Two-Factor Authentication (2FA)

- All accounts with the `admin` role are required to enroll in Time-Based One-Time Password (TOTP) 2FA using `otplib`.
- QR codes for authenticator app enrollment are generated safely using `qrcode`.

### Rate Limiting & Account Lockout

- Failed login attempts are recorded in a MongoDB TTL collection (`LoginAttempt`).
- Tracked simultaneously by client IP address and email.
- Accounts are temporarily locked after repeated failures to neutralize dictionary attacks.

### Cross-Site Scripting (XSS) Prevention

- User content is never rendered with `dangerouslySetInnerHTML`.
- Guides and static Markdown pages are sanitized using `sanitize-html` to remove all `<script>`, `<iframe>`, and malicious event handlers.
- Content Security Policy (CSP) headers with nonces restrict script execution strictly to verified origins (domain, AdSense, OneSignal, analytics).

### Image Upload Security

- Magic bytes / file signatures are checked to confirm the true file format (rejecting renamed executables).
- Sharp re-encodes every upload into WebP, stripping all EXIF and location metadata.
