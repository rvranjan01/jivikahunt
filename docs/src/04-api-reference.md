# 04 — API Reference Guide

## 1. Overview

All JivikaHunt backend endpoints are implemented as Next.js App Router Route Handlers (`app/api/**/route.js`). Responses use standard JSON formatting with explicit HTTP status codes.

## 2. Public Endpoints

### GET /api/health

- **Description**: Verifies service uptime and database connectivity.
- **Authentication**: None.
- **Response**: Status `ok` (HTTP 200) or `degraded` (HTTP 503). Includes uptime, database state, and timestamp.

### GET /img/[id]

- **Description**: Streams processed WebP images directly from MongoDB with immutable caching headers and ETag conditional validation.
- **Authentication**: None (Public asset delivery).
- **Parameters**: `id` — MongoDB ObjectId of the image record.
- **Headers Returned**:
  - `Content-Type: image/webp`
  - `Cache-Control: public, max-age=31536000, immutable`
  - `ETag: "<etag-hash>"`
  - `X-Content-Type-Options: nosniff`
- **Conditional Validation**: If request includes matching `If-None-Match`, returns `304 Not Modified` with zero body.

## 3. Media & Admin Endpoints

### POST /api/admin/upload

- **Description**: Validates image magic bytes (PNG, JPEG, WebP only, max 1MB), re-encodes to stripped WebP using Sharp, resizes to max dimensions, and saves binary buffer to MongoDB.
- **Authentication**: Authenticated user (`contributor` or `admin`).
- **Form Data**:
  - `file`: Image file binary payload.
  - `type`: Target usage preset (`logo` max 160x160; `profile` max 256x256).
- **Response Example (`201 Created`)**:

```json
{
  "success": true,
  "image": {
    "id": "65b89a1234567890abcdef12",
    "url": "/img/65b89a1234567890abcdef12",
    "width": 160,
    "height": 160
  }
}
```

## 4. Authentication Endpoints

### POST /api/auth/login

- **Description**: Authenticates user credentials with brute-force rate-limiting and mandatory admin TOTP 2FA. Sets httpOnly `jh_session` cookie on success.
- **Rate Limit**: Max 5 failed attempts per IP and per email before temporary 15-minute lock.
- **Request Body**:

```json
{
  "email": "admin@jivikahunt.com",
  "password": "••••••••••••",
  "totpCode": "123456"
}
```

### POST /api/auth/logout

- **Description**: Clears session cookie and records audit log event.
- **Authentication**: Authenticated user.

### GET /api/auth/me

- **Description**: Inspects current session cookie and returns user profile. Re-verifies user is active and tokenVersion matches database.
- **Authentication**: Authenticated user.

### POST /api/auth/change-password

- **Description**: Changes password for the active user. Mandatory on first contributor login. Increments `tokenVersion` to revoke all other active sessions across devices.
- **Authentication**: Authenticated user.

## 5. Admin User Management Endpoints

### GET /api/admin/users

- **Description**: Lists all registered staff and contributors with their status and roles.
- **Authentication**: Admin only.

### POST /api/admin/users

- **Description**: Creates a new contributor account, generates a 14-character secure random temporary password, and sends an email invitation via Resend.
- **Authentication**: Admin only.

### PATCH /api/admin/users/[id]

- **Description**: Toggles contributor active status or updates profile. Deactivation increments `tokenVersion` to immediately revoke active sessions.
- **Authentication**: Admin only.

### DELETE /api/admin/users/[id]

- **Description**: Deletes a user account.
- **Authentication**: Admin only.
