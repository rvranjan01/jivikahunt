# 03 — Data Model Guide

## 1. Overview

JivikaHunt stores its application data in MongoDB Atlas using Mongoose ODM. Every document schema is designed for speed, referential integrity, and safe querying.

## 2. Model Catalog

| Model Name     | Collection      | Description                                                              | Status                    |
| -------------- | --------------- | ------------------------------------------------------------------------ | ------------------------- |
| `User`         | `users`         | Accounts for administrators and job contributors.                        | **Implemented (Phase 1)** |
| `LoginAttempt` | `loginattempts` | Temporary TTL records tracking failed logins to prevent brute force.     | **Implemented (Phase 1)** |
| `AuditLog`     | `auditlogs`     | Immutable audit trail for all admin actions and auth events.             | **Implemented (Phase 1)** |
| `Image`        | `images`        | WebP binary images stored directly in database to survive dyno restarts. | **Implemented (Phase 2)** |
| `Job`          | `jobs`          | Full job listings, company profiles, and application links.              | **Implemented (Phase 3)** |
| `Report`       | `reports`       | Public reports for broken links, expired posts, or scams.                | **Implemented (Phase 5)** |
| `Guide`        | `guides`        | Career guidance and interview preparation articles.                      | **Implemented (Phase 6)** |
| `Subscriber`   | `subscribers`   | Double opt-in email alert subscribers.                                   | **Implemented (Phase 6)** |

## 3. Implemented Schemas

### Guide Schema (`models/Guide.js` — Phase 6)

- `title` (String, required, max 160 chars): Article headline.
- `slug` (String, required, unique, indexed): URL-friendly unique identifier.
- `summary` (String, required, min 40, max 300 chars): Meta description and card abstract.
- `body` (String, required, min 100 chars): Markdown text content. Rendered safely with `marked` and sanitized with `sanitize-html`.
- `status` (String, enum: `['draft', 'published']`, default: `'draft'`, indexed): Publication state.
- `readingTime` (Number, default: 1): Computed estimated reading duration in minutes based on word count.
- `createdBy` (ObjectId, ref: User, required, indexed): Author user reference.
- `postedByName` (String, required): Preserved contributor displayName.
- `createdAt` & `updatedAt` (Date, indexed): Timestamps.
- **Indexes**:
  - `{ slug: 1 }` (unique)
  - `{ status: 1, createdAt: -1 }`

### Subscriber Schema (`models/Subscriber.js` — Phase 6)

- `email` (String, required, unique, lowercase, indexed): Subscriber's email address.
- `preferences` (Subdocument):
  - `types` (Array of Strings): Filter preferences (`['fresher', 'intern', 'experienced']`).
  - `batches` (Array of Numbers): Graduation year preferences.
- `confirmToken` (String, default: null, indexed): Cryptographic hex token for double opt-in verification.
- `confirmedAt` (Date, default: null, indexed): Timestamp when subscription was confirmed.
- `unsubscribeToken` (String, required, unique, indexed): Cryptographic token for one-click unsubscribe links.
- `lastDigestSentAt` (Date, default: null): Timestamp of latest daily digest dispatch.
- `createdAt` (Date, default: Date.now): Sign-up timestamp.
- **Indexes**:
  - `{ email: 1 }` (unique)
  - `{ unsubscribeToken: 1 }` (unique)
  - `{ confirmedAt: 1 }`

### Job Schema (`models/Job.js` — Phase 3)

- `title` (String, required, max 120 chars): Job title (e.g., "Software Developer Trainee").
- `slug` (String, required, unique, indexed): URL-safe unique slug in format `${title}-at-${company}`.
- `company` (Subdocument, required):
  - `name` (String, required, max 100 chars): Company brand name.
  - `slug` (String, required, indexed): Kebab-case company slug.
  - `logoId` (ObjectId, ref: Image, optional): Reference to processed WebP logo.
  - `description` (String, optional, max 1000 chars): Short company background.
- `type` (String, enum: `['fresher', 'intern', 'experienced']`, required, indexed).
- `workMode` (String, enum: `['onsite', 'hybrid', 'remote']`, required, indexed).
- `locations` (Array of Strings, required, min 1 location).
- `batches` (Array of Numbers, indexed): Eligible graduation years (e.g. `[2024, 2025]`).
- `salary` (String, optional, max 100 chars): Compensation/stipend text.
- `skills` (Array of Strings, indexed): Normalized lowercase keywords.
- `summary` (String, required, min 40, max 2000 chars): Core opportunity overview.
- `responsibilities` (Array of Strings): Role duties.
- `eligibility` (Array of Strings): Degree and criteria requirements.
- `applyUrl` (String, required): Strict HTTPS careers URL without credentials or shorteners.
- `lastDate` (Date, optional): Application deadline. Expiry is evaluated at 23:59:59.999 IST on this date.
- `status` (String, enum: `['draft', 'scheduled', 'published', 'unpublished']`, default: `'draft'`, indexed).
- `publishAt` (Date, optional): Scheduled release timestamp.
- `featured` (Boolean, default: false): Flag for sponsored listings.
- `views` (Number, default: 0): Total impressions.
- `createdBy` (ObjectId, ref: User, required, indexed): Author user reference.
- `postedByName` (String, required): Preserved contributor displayName at creation.
- **Indexes**:
  - `{ slug: 1 }` (unique)
  - `{ status: 1, createdAt: -1 }`
  - `{ status: 1, type: 1 }`
  - `{ status: 1, workMode: 1 }`
  - `{ status: 1, batches: 1 }`
  - `{ status: 1, skills: 1 }`
  - `{ 'company.slug': 1, status: 1 }`
  - Text Index: `{ title: 'text', 'company.name': 'text' }`

### Image Schema (`models/Image.js` — Phase 2)

- `contentType` (String, default: `'image/webp'`): Media MIME type.
- `data` (Buffer, required): Sharp-processed binary WebP image payload.
- `width` (Number, required): Scaled width in pixels.
- `height` (Number, required): Scaled height in pixels.
- `ownerId` (ObjectId, ref: User, required): User who uploaded the image.
- `createdAt` (Date, default: Date.now): Upload timestamp.

### Report Schema (`models/Report.js` — Phase 5)

- `jobId` (ObjectId, ref: Job, required, indexed): Reference to reported job post.
- `reason` (String, enum: `['broken_link', 'expired', 'scam', 'other']`, required, indexed): Classified reason.
- `note` (String, max 300 chars, default: ''): Optional context provided by public reporter.
- `ipHash` (String, required, indexed): Salted SHA-256 hash of client IP for privacy-preserving rate limiting.
- `status` (String, enum: `['open', 'resolved']`, default: `'open'`, indexed): Moderation status.
- `createdAt` (Date, default: Date.now, indexed): Report timestamp.
- **Indexes**:
  - `{ status: 1, createdAt: -1 }`
  - `{ jobId: 1, status: 1 }`

- `data` (Buffer, required): Binary WebP payload (max 1 MB).
- `width` & `height` (Number, required): Dimensions in pixels.
- `ownerId` (ObjectId, ref: User, default: null, indexed).
- `createdAt` (Date, indexed: `{ createdAt: -1 }`).

### User Schema (`models/User.js` — Phase 1)

- `name` & `displayName` (String, required).
- `email` (String, required, unique, lowercase, indexed).
- `passwordHash` (String, required): bcryptjs hash.
- `role` (String, enum: `admin`, `contributor`, default: `contributor`, indexed).
- `isActive` (Boolean, default: true, indexed).
- `mustChangePassword` (Boolean, default: true).
- `tokenVersion` (Number, default: 1).
- `totpSecret` (String, default: null).
- `bio` (String, max 250 characters).

### LoginAttempt Schema (`models/LoginAttempt.js` — Phase 1)

- `key` (String, required, unique, indexed): IP or email identifier.
- `attempts` (Number, default: 1).
- `lockedUntil` (Date, default: null).
- `expiresAt` (Date, required, TTL index: `{ expires: 0 }`).

### AuditLog Schema (`models/AuditLog.js` — Phase 1)

- `action`, `actorId`, `actorEmail`, `targetType`, `targetId`, `metadata`, `ipHash`.
- Indexed: `{ createdAt: -1 }`.
