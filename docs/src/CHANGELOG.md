# Changelog

All notable changes to the JivikaHunt project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-11-12

### Added

- **Phase 4 Core Public Portal & Browsing Experience**:
  - Global brand layout with wordmark `JivikaHunt` (`components/Header.jsx`), desktop navigation, search bar, and mobile responsive drawer.
  - Comprehensive four-column footer (`components/Footer.jsx`) with category links, policy pages, official community channels, and recruitment disclaimer notices sourced solely from `lib/siteConfig.js`.
  - Reusable `components/JobCard.jsx` displaying company logo/initials avatar, job title, company name, location, chips (type, work mode, batch, salary), and IST application deadlines.
  - Interactive URL-synchronized filter toolbar (`components/JobFilters.jsx`) supporting `type`, `workMode`, `batch`, `location`, `skills`, and `q` keywords with shareable and crawlable URLs.
  - Accessible server-rendered pagination component (`components/Pagination.jsx`) preserving active filter queries.
  - Google AdSense wrapper component (`components/AdSlot.jsx`) with fixed minimum height (`min-h-[280px]`) preventing layout shift (CLS), placed after every 5th card (max 3/page).
  - Pure HTML/JS share widget (`components/ShareButtons.jsx`) for WhatsApp, Telegram, X, Facebook, Copy Link, and native mobile Web Share without third-party tracking scripts.
  - Contributor author box (`components/AuthorBox.jsx`) with dashed border, avatar, display name, bio, and shared team contact email (strictly concealing contributor personal email).
  - Server-rendered Home Page (`/`) and Browse Page (`/jobs`) displaying 20 positions per page and dynamically excluding expired listings.
  - Job Detail Page (`/jobs/[slug]`) adhering strictly to the AGENTS.md ordering requirement; expired jobs render a notice banner and `noindex` robots meta tag while retaining related job recommendations.
  - Related opportunities engine (`getRelatedJobs`) recommending up to 4 active positions by matching skills, job type, or locations.
  - Safe Markdown engine (`lib/markdown.js`) powered by `marked` and `sanitize-html` serving static informational pages from `/content` (`/about`, `/contact`, `/disclaimer`, `/privacy`).
  - Unit and API test suite expanded to 120 tests across 18 files.

## [0.4.0] - 2026-11-12

### Added

- **Phase 3 Admin Job Ingestion & Management Engine**:
  - `Job` Mongoose model with compound indexes (`status`, `createdAt`, `type`, `workMode`, `batches`, `skills`, `company.slug`) and text index on title and company name.
  - Strict URL validation rejecting insecure HTTP, embedded credentials, and URL shorteners (`bit.ly`, `tinyurl.com`, `t.co`, etc.).
  - Automatic collision-resistant slug generator (`lib/slug.js`) supporting `${title}-at-${company}` format with numeric collision suffixes.
  - Asia/Kolkata (IST) deadline and expiry engine (`lib/time.js`) computing end-of-day (23:59:59.999 IST = 18:29:59.999 UTC).
  - Contributor daily quota manager (`lib/quota.js`) capping contributors at 30 posts per 24 hours while exempting admins.
  - Non-blocking Telegram Bot client (`lib/telegram.js`) auto-posting published jobs to the Telegram channel without stalling job publication.
  - WhatsApp broadcast formatter (`formatWhatsAppJobMessage`) and one-click copy button on job rows.
  - Duplicate posting detector warning contributors if matching company + title + applyUrl already exists, with override capability.
  - Interactive job creation form (`/admin/jobs/new`) with integrated ChatGPT extraction prompt helper panel and instant copy button.
  - Interactive job edit form (`/admin/jobs/[id]/edit`) and filtered management table (`/admin/jobs`).
  - Strict contributor permission isolation: contributors can only view, edit, and delete their own posts, while admins can manage all jobs.
  - Complete test suite: 105 tests passing across 15 test files covering slug generation, IST deadlines, URL validators, duplicate detection, daily quotas, and contributor isolation.

## [0.3.0] - 2026-11-12

### Added

- **Phase 2 Image Processing & Media Serving**:
  - `Image` Mongoose model for binary WebP buffer storage in MongoDB (survives ephemeral Heroku dyno restarts).
  - Magic byte binary file signature detector in `lib/image.js` (validating real PNG, JPEG, and WebP bytes; rejecting polyglots, SVGs, and executables).
  - Sharp image processing pipeline stripping EXIF/GPS metadata, auto-orienting, and enforcing maximum dimensions (logos: 160x160; profile photos: 256x256).
  - High-performance binary delivery route `/img/[id]` with MD5-based ETag calculation, HTTP `304 Not Modified` conditional response, and `Cache-Control: public, max-age=31536000, immutable`.
  - Secure authenticated upload route `/api/admin/upload` with 1 MB ceiling and audit logging.
  - Reusable `components/CompanyLogo.jsx` component featuring automatic high-contrast company initials avatar fallback with deterministic palette hashing.

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

## [0.1.0] - 2026-11-12

### Added

- **Phase 0 Foundation**: Initialized Next.js App Router application with Node.js and JavaScript with JSDoc types.
- Configured Tailwind CSS v4, PostCSS, ESLint flat config, Prettier, and Vitest test runner.
- Configured Playwright end-to-end testing harness with desktop and mobile viewports.
- Configured GitHub Actions CI workflow covering linting, security audit, unit/API tests, and documentation builds.
- Created `lib/siteConfig.js`, `.env.example`, `lib/db.js`, `/api/health`, documentation skeleton, and Word builder.
