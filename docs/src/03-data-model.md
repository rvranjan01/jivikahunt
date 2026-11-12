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
| `Job`          | `jobs`          | Full job listings, company profiles, and application links.              | Scheduled (Phase 3)       |
| `Report`       | `reports`       | Public reports for broken links, expired posts, or scams.                | Scheduled (Phase 5)       |
| `Guide`        | `guides`        | Career guidance and interview preparation articles.                      | Scheduled (Phase 6)       |
| `Subscriber`   | `subscribers`   | Double opt-in email alert subscribers.                                   | Scheduled (Phase 6)       |

## 3. Implemented Schemas

### Image Schema (`models/Image.js` — Phase 2)

- `contentType` (String, default: `'image/webp'`): Media MIME type, strictly standardized to WebP.
- `data` (Buffer, required): Binary WebP payload (max 1 MB).
- `width` (Number, required): Image width in pixels.
- `height` (Number, required): Image height in pixels.
- `ownerId` (ObjectId, ref: User, default: null, indexed): Contributor or admin who uploaded the asset.
- `createdAt` (Date): Creation timestamp, indexed chronologically descending (`{ createdAt: -1 }`).

### User Schema (`models/User.js` — Phase 1)

- `name` (String, required): Full legal name of the contributor or admin.
- `displayName` (String, required): Name shown publicly on job postings and author box.
- `email` (String, required, unique, lowercase, indexed): Login email address.
- `passwordHash` (String, required): bcryptjs hash with 10 salt rounds.
- `role` (String, enum: `admin`, `contributor`, default: `contributor`, indexed): Permissions level.
- `isActive` (Boolean, default: true, indexed): Re-checked against MongoDB on every admin API call.
- `mustChangePassword` (Boolean, default: true for invited users): Forces password change on initial login.
- `tokenVersion` (Number, default: 1): Incremented on password change or deactivation to immediately revoke all issued JWTs.
- `totpSecret` (String, default: null): 32-character Base32 secret for TOTP two-factor authentication (admin only).
- `bio` (String, max 250 characters, default: ''): Contributor biography shown in the public author box.
- `photoId` (ObjectId, ref: Image, default: null): Profile avatar image.
- `createdAt` & `updatedAt` (Date): Timestamps managed by Mongoose.

### LoginAttempt Schema (`models/LoginAttempt.js` — Phase 1)

- `key` (String, required, unique, indexed): Identifier tracked (e.g. `ip:203.0.113.1` or `email:contributor@example.com`).
- `attempts` (Number, default: 1): Consecutive failed login count.
- `lockedUntil` (Date, default: null): If set, login requests for this key receive HTTP 429 until this timestamp passes.
- `expiresAt` (Date, required, indexed with `expires: 0`): MongoDB TTL index automatically deleting records 1 hour after creation.

### AuditLog Schema (`models/AuditLog.js` — Phase 1)

- `action` (String, required, indexed): Action code (e.g. `login.success`, `user.create`, `image.upload`).
- `actorId` (ObjectId, ref: User, default: null, indexed): ID of the user performing the action.
- `actorEmail` (String, default: null): Email address of actor.
- `targetType` (String, default: null, indexed): Target entity class (`User`, `Image`, etc.).
- `targetId` (String, default: null): Identifier of target entity.
- `metadata` (Mixed, default: {}): Sanitized action details.
- `ipHash` (String, default: null): Salted SHA-256 IP hash for auditing without privacy violation.
- `createdAt` (Date): Timestamp of action, indexed chronologically descending (`{ createdAt: -1 }`).
