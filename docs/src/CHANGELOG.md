# Changelog

All notable changes to the JivikaHunt project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-11-12

### Added

- **Phase 2 Image Processing & Media Serving**:
  - `Image` Mongoose model for binary WebP buffer storage in MongoDB (survives ephemeral Heroku dyno restarts).
  - Magic byte binary file signature detector in `lib/image.js` (validating real PNG, JPEG, and WebP bytes; rejecting polyglots, SVGs, and executables).
  - Sharp image processing pipeline stripping EXIF/GPS metadata, auto-orienting, and enforcing maximum dimensions (logos: 160x160; profile photos: 256x256).
  - High-performance binary delivery route `/img/[id]` with MD5-based ETag calculation, HTTP `304 Not Modified` conditional response, and `Cache-Control: public, max-age=31536000, immutable`.
  - Secure authenticated upload route `/api/admin/upload` with 1 MB ceiling and audit logging.
  - Reusable `components/CompanyLogo.jsx` component featuring automatic high-contrast company initials avatar fallback with deterministic palette hashing.
  - Complete test coverage: 70 passing tests across 11 test suites covering image upload rejection, magic byte detection, Sharp processing, initials derivation, and ETag caching.

## [0.2.0] - 2026-11-12

### Added

- **Phase 1 Authentication & User Management**:
  - `User`, `LoginAttempt`, and `AuditLog` Mongoose models with TTL indexing and compound indexes.
  - Session management using Jose JWTs with `httpOnly`, `Secure`, `SameSite=Lax` cookies (`jh_session`).
  - Active session validation middleware with database re-check (`isActive`) and `tokenVersion` matching.
  - Brute-force protection: dual-key rate limiting (per IP and per email) with 15-minute lockout after 5 consecutive failures.
  - Two-Factor Authentication (TOTP 2FA) for administrators via `otplib` and QR code onboarding via `qrcode`.
  - Contributor management portal (`/admin/users`) with random temporary password generator and invitation flow.
  - Mandatory first-login password change (`mustChangePassword`) at `/admin/change-password`.
  - Instant session revocation on password update or account deactivation.
  - Local development email outbox fallback for Resend when API key is unconfigured.
  - Admin seeding script (`scripts/seed-admin.js`) outputting TOTP secret and authenticator URI.
  - Full test suite: 49 passing tests across unit and API suites covering all security, auth, and role isolation rules.

## [0.1.0] - 2026-11-12

### Added

- **Phase 0 Foundation**: Initialized Next.js App Router application with Node.js and JavaScript with JSDoc types.
- Configured Tailwind CSS v4, PostCSS, ESLint flat config, Prettier, and Vitest test runner.
- Configured Playwright end-to-end testing harness with desktop and mobile viewports.
- Configured GitHub Actions CI workflow covering linting, security audit, unit/API tests, and documentation builds.
- Created `lib/siteConfig.js` containing centralized site metadata, social community links, and navigation items.
- Created `.env.example` documenting all configuration keys and secret requirements.
- Implemented `lib/db.js` providing cached singleton Mongoose connection management.
- Implemented `/api/health` route handler reporting system uptime, DB connectivity, and response latency.
- Established documentation skeleton in `docs/src` with 13 comprehensive guides and `CHANGELOG.md`.
- Implemented `scripts/build-docs.js` converting Markdown documentation into structured `.docx` files.
- Added comprehensive `README.md` with step-by-step local setup instructions.
