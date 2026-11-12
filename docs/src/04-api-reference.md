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

### POST /api/reports (Phase 5)

- **Description**: Allows public visitors to report broken career links, expired roles, scams, or errors. Zero authentication required.
- **Authentication**: None. Rate-limited by salted IP hash (max 5 reports per hour).
- **Request Body**: `{ jobId, reason: 'broken_link' | 'expired' | 'scam' | 'other', note?: string }`.
- **Responses**:
  - `201 Created`: Report logged and queued for admin moderation.
  - `400 Bad Request`: Validation failure.
  - `404 Not Found`: Job does not exist.
  - `429 Too Many Requests`: Rate limit exceeded.

### POST /api/jobs/saved (Phase 6)

- **Description**: Bulk resolves job IDs stored in the visitor's browser `localStorage` into active job objects for `/saved`. Excludes expired and non-published posts.
- **Authentication**: None.
- **Request Body**: `{ ids: string[] }` (max 50 IDs).
- **Responses**: `200 OK` with `{ jobs: Job[] }`.

### POST /api/alerts/subscribe (Phase 6)

- **Description**: Registers a visitor email address with optional preferences for job types and graduation batches. Dispatches double opt-in verification email.
- **Authentication**: None.
- **Request Body**: `{ email, preferences?: { types?: string[], batches?: number[] } }`.
- **Responses**: `200 OK` with confirmation message.

### GET /api/alerts/confirm (Phase 6)

- **Description**: Validates cryptographic verification token and confirms subscriber status.
- **Authentication**: None.
- **Query Parameters**: `token` (hex string).
- **Responses**: Redirects to home page with query param `confirmed=1`.

### GET /api/alerts/unsubscribe (Phase 6)

- **Description**: RFC-compliant one-click unsubscription link included in all email alerts. Removes subscriber record.
- **Authentication**: None.
- **Query Parameters**: `token` (hex string).
- **Responses**: Redirects to home page with query param `unsubscribed=1`.

### GET /feed.xml (Phase 6)

- **Description**: Returns live RSS 2.0 XML syndication feed of top 25 non-expired published jobs.
- **Authentication**: None.
- **Headers Returned**: `Content-Type: application/rss+xml; charset=utf-8`, `Cache-Control: public, max-age=1800, stale-while-revalidate=3600`.

## 3. Guide Administration Endpoints (Phase 6)

### GET /api/admin/guides

- **Description**: Lists career guides with pagination and search. Contributors see only their guides; Admins see all guides.
- **Authentication**: Authenticated (`contributor` or `admin`).

### POST /api/admin/guides

- **Description**: Authors a new guide. Computes estimated reading time and generates unique slug.
- **Authentication**: Authenticated (`contributor` or `admin`).
- **Request Body**: `{ title, summary, body, status }`.

### GET /api/admin/guides/[id]

- **Description**: Retrieves single guide for editing. Enforces contributor author isolation (HTTP 403).
- **Authentication**: Authenticated.

### PUT /api/admin/guides/[id]

- **Description**: Updates guide title, body, status, or summary. Recalculates reading time.
- **Authentication**: Authenticated.

### DELETE /api/admin/guides/[id]

- **Description**: Deletes a guide. Contributors can only delete their own guides.
- **Authentication**: Authenticated.

## 4. Report Administration Endpoints (Phase 5)

### GET /api/admin/reports

- **Description**: Lists user-submitted reports with status filtering (`open`, `resolved`, `all`).
- **Authentication**: Authenticated (`admin` only).

### PATCH /api/admin/reports/[id]

- **Description**: Resolves or reopens a report. Records audit log.
- **Authentication**: Authenticated (`admin` only).
- **Request Body**: `{ status: 'open' | 'resolved' }`.

## 4. Job Administration Endpoints (Phase 3)

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
