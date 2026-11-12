# 05 — Security Guide

## 1. Security Architecture

Security is built into every layer of JivikaHunt. We follow the principle of least privilege, zero trust for user inputs, and defence-in-depth.

## 2. Implemented Safeguards (Phase 1)

### Input Validation & NoSQL Injection Defense

- Every request payload is validated against a strict Zod schema with `.strict()` enabled to drop unexpected attributes.
- All query parameters and JSON keys are recursively sanitized using `sanitizeNoSql()` in `lib/security.js`: any key starting with `$` (MongoDB operator) or containing `.` (sub-document path traversal) is immediately stripped.
- Raw request objects are never passed directly to Mongoose queries.

### Session Security (Jose & JWT)

- JWTs are generated using `jose` with `HS256` signatures and stored exclusively in `httpOnly`, `Secure` (production), `SameSite=Lax` cookies named `jh_session` with a 12-hour lifespan.
- Every user document contains a `tokenVersion` integer. When a user updates their password or is deactivated, their `tokenVersion` is incremented in MongoDB, instantly invalidating all existing tokens across all devices.
- `isActive` is re-checked against MongoDB on every single administrative API call via `getSessionUser()`.

### Two-Factor Authentication (2FA)

- All accounts with the `admin` role are required to enroll in Time-Based One-Time Password (TOTP) 2FA using `otplib` (RFC 6238).
- QR codes for authenticator app enrollment are generated safely using `qrcode` with `generateTotpQrCode()`.
- Contributor accounts do not require 2FA, allowing rapid onboarding.

### Rate Limiting & Account Lockout

- Failed login attempts are recorded in a MongoDB TTL collection (`LoginAttempt`).
- Tracked simultaneously by client IP address and email using dual-key rate limiting (`ip:<ip>` and `email:<email>`).
- Accounts are temporarily locked for 15 minutes after 5 consecutive failed attempts (HTTP 429).
- Successful login clears the failed attempt counter immediately.

### Email Security & Local Development Fallback

- Contributor invitations generate cryptographically secure 14-character temporary passwords using `crypto.randomBytes`.
- First login enforces `mustChangePassword === true`.
- In local development without an active Resend API key, email payloads are cleanly logged to stdout without leaking secrets to third parties or failing the invitation flow.
