# 03 — Data Model Guide

## 1. Overview

JivikaHunt stores its application data in MongoDB Atlas using Mongoose ODM. Every document schema is designed for speed, referential integrity, and safe querying.

## 2. Model Catalog

| Model Name     | Collection      | Description                                                              |
| -------------- | --------------- | ------------------------------------------------------------------------ |
| `User`         | `users`         | Accounts for administrators and job contributors.                        |
| `Job`          | `jobs`          | Full job listings, company profiles, and application links.              |
| `Image`        | `images`        | WebP binary images stored directly in database to survive dyno restarts. |
| `Report`       | `reports`       | Public reports for broken links, expired posts, or scams.                |
| `Guide`        | `guides`        | Career guidance and interview preparation articles.                      |
| `Subscriber`   | `subscribers`   | Double opt-in email alert subscribers.                                   |
| `AuditLog`     | `auditlogs`     | Immutable audit trail for all admin actions and auth events.             |
| `LoginAttempt` | `loginattempts` | Temporary TTL records tracking failed logins to prevent brute force.     |

## 3. Detailed Schema Definitions

### User Schema

- `name` (String, required): Full real name of the contributor or admin.
- `displayName` (String, required): Name shown to public visitors on job postings and author box.
- `email` (String, required, unique, lowercase): Login email address.
- `passwordHash` (String, required): bcryptjs password hash.
- `role` (String, enum: `admin`, `contributor`): Account permissions level.
- `isActive` (Boolean, default: true): Whether account can log in.
- `mustChangePassword` (Boolean, default: true): Forces password update on initial login.
- `tokenVersion` (Number, default: 1): Incremented to immediately revoke active sessions.
- `totpSecret` (String, optional): Base32 secret for TOTP two-factor authentication (admin only).
- `bio` (String, max 250 characters): Contributor biography shown in the author box.
- `photoId` (ObjectId, ref: Image): Profile avatar image.

### Job Schema

- `title` (String, required): Job title (e.g., "Junior React Developer").
- `slug` (String, required, unique): URL-friendly unique identifier.
- `company` (Object):
  - `name` (String, required): Company name.
  - `slug` (String, required): URL identifier for company profile.
  - `logoId` (ObjectId, ref: Image): Reference to processed WebP logo.
  - `description` (String, optional): Short company summary.
- `type` (String, enum: `fresher`, `intern`, `experienced`, required): Job category.
- `workMode` (String, enum: `onsite`, `hybrid`, `remote`, required): Location policy.
- `locations` (Array of Strings, required): Cities (e.g., `['Bengaluru', 'Pune']`).
- `batches` (Array of Numbers, optional): Target college graduation years (e.g., `[2024, 2025]`).
- `salary` (String, optional): Compensation details.
- `skills` (Array of Strings): Required skills.
- `summary` (String, required, min 40 characters): High-level overview of the opening.
- `responsibilities` (Array of Strings): Bullet points of daily tasks.
- `eligibility` (Array of Strings): Educational or qualification criteria.
- `applyUrl` (String, required): Strict HTTPS link to the official company career portal.
- `lastDate` (Date, optional): Application deadline (expiry evaluated at end-of-day IST).
- `status` (String, enum: `draft`, `scheduled`, `published`, `unpublished`).
- `publishAt` (Date, optional): Timestamp for scheduled publishing.
- `featured` (Boolean, default: false): Flag for sponsored listings.
- `views` (Number, default: 0): Total view counter.
- `createdBy` (ObjectId, ref: User): User ID of the posting contributor.
- `postedByName` (String, required): Preserved contributor name surviving user deletion.

### Image Schema

- `contentType` (String, strictly `'image/webp'`): Media MIME type.
- `data` (Buffer, max 1MB): Binary image payload.
- `width` (Number): Image width in pixels.
- `height` (Number): Image height in pixels.
- `ownerId` (ObjectId, ref: User): Uploading user reference.

### Report Schema

- `jobId` (ObjectId, ref: Job): Affected job posting.
- `reason` (String, enum: `broken_link`, `expired`, `scam`, `other`): Issue type.
- `note` (String, max 300 characters): Optional user feedback.
- `ipHash` (String): Salted SHA-256 hash of submitter IP for rate limiting.
- `status` (String, enum: `open`, `resolved`): Moderation status.
