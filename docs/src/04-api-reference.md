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
- **Authentication**: None.
- **Headers Returned**: `Content-Type: image/webp`, `Cache-Control: public, max-age=31536000, immutable`, `ETag`. Returns `304 Not Modified` on matching `If-None-Match`.

## 3. Job Administration Endpoints (Phase 3)

### GET /api/admin/jobs

- **Description**: Lists jobs with status filtering, keyword search, and pagination. Contributors see only their own jobs; Admins see all jobs.
- **Authentication**: Authenticated (`contributor` or `admin`).
- **Query Parameters**:
  - `page`: Page number (default: 1).
  - `limit`: Items per page (default: 20, max: 50).
  - `status`: Optional status filter (`published`, `draft`, `scheduled`, `unpublished`).
  - `q`: Search query matching job title or company name.

### POST /api/admin/jobs

- **Description**: Creates a job posting. Enforces 30-job daily limit for contributors, detects duplicates, generates unique slugs, copies `postedByName`, and triggers asynchronous Telegram broadcasts on publish.
- **Authentication**: Authenticated (`contributor` or `admin`).
- **Responses**:
  - `201 Created`: Returns created job summary `{ id, slug, title, status }`.
  - `400 Bad Request`: Validation failure on Zod schema.
  - `409 Conflict`: Returned if identical company, title, and apply URL already exist (`isDuplicate: true`), unless `force: true` is supplied.
  - `429 Too Many Requests`: Contributor has exceeded 30 jobs in the past 24 hours.

### GET /api/admin/jobs/[id]

- **Description**: Retrieves single job for editing. Contributors can view only their own jobs (HTTP 403 otherwise).
- **Authentication**: Authenticated.

### PUT /api/admin/jobs/[id]

- **Description**: Updates an existing job posting. Re-validates against Zod schema and recalculates slug if title/company changed. Contributors can edit only their own jobs.
- **Authentication**: Authenticated.

### DELETE /api/admin/jobs/[id]

- **Description**: Deletes a job posting. Contributors can delete only their own jobs; Admins can delete anything.
- **Authentication**: Authenticated.

## 4. Media & Admin Upload Endpoints

### POST /api/admin/upload

- **Description**: Validates image magic bytes (PNG, JPEG, WebP only, max 1MB), re-encodes to stripped WebP using Sharp, resizes to max dimensions, and saves binary buffer to MongoDB.
- **Authentication**: Authenticated user (`contributor` or `admin`).

## 5. Authentication Endpoints

### POST /api/auth/login

- **Description**: Authenticates user credentials with rate-limiting and mandatory admin TOTP 2FA. Sets httpOnly `jh_session` cookie.

### POST /api/auth/logout

- **Description**: Clears session cookie and records audit log event.

### GET /api/auth/me

- **Description**: Returns authenticated user profile and checks session validity.

### POST /api/auth/change-password

- **Description**: Changes password for active user, clears `mustChangePassword`, and increments `tokenVersion`.

## 6. Admin User Management Endpoints

### GET /api/admin/users

- **Description**: Lists all registered staff and contributors (Admin only).

### POST /api/admin/users

- **Description**: Creates contributor account and sends invitation email (Admin only).

### PATCH /api/admin/users/[id]

- **Description**: Toggles contributor active status or updates profile (Admin only).

### DELETE /api/admin/users/[id]

- **Description**: Deletes a user account (Admin only).
