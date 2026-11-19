# 05 — Security Guide

## 1. Security Architecture

Security is built into every layer of JivikaHunt. We follow the principle of least privilege, zero trust for user inputs, and defence-in-depth.

## 2. Implemented Safeguards (Phases 1 & 2)

### Image Upload Security (Phase 2)

- **Magic Byte Signature Verification**: The system checks genuine binary signatures (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF...WEBP`) rather than trusting file extensions or MIME headers provided by the client.
- **XSS & Polyglot Vector Defense**: SVG files (which can contain embedded JavaScript `<script>` tags) and executable polyglots are strictly rejected.
- **Metadata Stripping**: Every uploaded image is processed through Sharp to strip all EXIF, GPS, camera serial numbers, and device information before database storage.
- **Strict Size Limits**: Files exceeding 1 MB (1,048,576 bytes) are rejected at the edge.
- **Controlled Dimensions**:
  - Logos: Resized to maximum 160x160 with aspect ratio preserved.
  - Profiles: Resized to maximum 256x256.

### In-Database Media Storage Architecture (Phase 2)

- Host dynos on Heroku feature ephemeral filesystems that discard locally written files on restart or deployment.
- Processed WebP images are stored directly in MongoDB within the `Image` collection as binary `Buffer` objects.
- Binary assets are streamed from `/img/[id]` with `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`, and MD5-based ETags, allowing browsers and CDNs to cache images indefinitely and return HTTP 304 Not Modified.

### Input Validation & NoSQL Injection Defense (Phase 1)

- Every request payload is validated against a strict Zod schema with `.strict()` enabled.
- All query parameters and JSON keys are recursively sanitized using `sanitizeNoSql()` in `lib/security.js`: any key starting with `$` or containing `.` is stripped immediately.
- Raw request objects are never passed directly to Mongoose queries.

### Session Security (Jose & JWT) (Phase 1)

- JWTs are generated using `jose` with `HS256` signatures and stored exclusively in `httpOnly`, `Secure` (production), `SameSite=Lax` cookies named `jh_session` with a 12-hour lifespan.
- Every user document contains a `tokenVersion` integer. When a user updates their password or is deactivated, their `tokenVersion` is incremented in MongoDB, instantly invalidating all existing tokens across all devices.
- `isActive` is re-checked against MongoDB on every single administrative API call via `getSessionUser()`.

### Two-Factor Authentication (2FA) (Phase 1)

- All accounts with the `admin` role are required to enroll in Time-Based One-Time Password (TOTP) 2FA using `otplib` (RFC 6238).
- QR codes for authenticator app enrollment are generated safely using `qrcode` with `generateTotpQrCode()`.

### Rate Limiting & Account Lockout (Phase 1)

- Failed login attempts are recorded in a MongoDB TTL collection (`LoginAttempt`).
- Tracked simultaneously by client IP address and email using dual-key rate limiting (`ip:<ip>` and `email:<email>`).
- Accounts are temporarily locked for 15 minutes after 5 consecutive failed attempts (HTTP 429).

## 3. Production Security Headers & CSP (Phase 7)

Configured globally in `next.config.mjs` applied to all outgoing HTTP responses:

- **Strict-Transport-Security (HSTS)**: `max-age=63072000; includeSubDomains; preload` enforces HTTPS exclusively.
- **X-Content-Type-Options**: `nosniff` prevents MIME type sniffing attacks.
- **X-Frame-Options**: `SAMEORIGIN` mitigates clickjacking.
- **Referrer-Policy**: `strict-origin-when-cross-origin` protects user referral paths.
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=(), browsing-topics=()` disables high-risk browser capabilities.

### Content Security Policy (CSP)

Restricts external script execution, connections, and frame embeds:

- `default-src 'self'`
- `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://pagead2.googlesyndication.com https://cdn.onesignal.com https://www.googletagmanager.com`
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data: blob: https:`
- `font-src 'self' data:`
- `connect-src 'self' https://onesignal.com https://www.google-analytics.com`
- `frame-src 'self' https://googleads.g.doubleclick.net`
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self'`

## 4. Privacy & Cookie Consent Gating (Phase 7)

- **Cookie Consent Banner (`CookieConsent.jsx`)**: Implemented using React 19 `useSyncExternalStore` for flicker-free external storage reactivity (`jh_cookie_consent`).
- **Strict Third-Party Script Gating**: Google Analytics, Google AdSense, and OneSignal web push scripts remain completely unloaded until the user explicitly accepts cookies.
- **Ad Slot Suppression (`AdSlot.jsx`)**: Advertising placeholders do not mount or call ad network scripts until consent state is verified as `accepted`.
