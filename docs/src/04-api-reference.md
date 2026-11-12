# 04 — API Reference Guide

## 1. Overview

All JivikaHunt backend services are exposed via Next.js App Router Route Handlers (`app/api/**/route.js`). Responses use standard JSON formatting with explicit HTTP status codes.

## 2. Public Endpoints

### GET /api/health

- **Description**: Verifies service uptime and database connectivity.
- **Authentication**: None.
- **Response Example**:

```json
{
  "status": "ok",
  "service": "jivikahunt",
  "timestamp": "2026-11-12T12:00:00.000Z",
  "uptimeSeconds": 1420,
  "database": "connected",
  "responseTimeMs": 12,
  "environment": "production"
}
```

### POST /api/reports

- **Description**: Submits a report for a broken, expired, or fraudulent job link.
- **Authentication**: None (Rate limited by salted IP hash).
- **Body Payload**:

```json
{
  "jobId": "65b89a...",
  "reason": "broken_link",
  "note": "Company portal returns 404 page."
}
```

### POST /api/alerts/subscribe

- **Description**: Registers an email address for job alerts and sends a double opt-in confirmation email.
- **Authentication**: None.

## 3. Authentication Endpoints

### POST /api/auth/login

- **Description**: Authenticates contributor or admin credentials. Sets an `httpOnly`, `Secure`, `SameSite=Lax` cookie.
- **Rate Limit**: Max 5 attempts per IP and per email before temporary lock.
- **Body**: `{ "email": "admin@jivikahunt.com", "password": "...", "totpCode": "123456" }`

### POST /api/auth/change-password

- **Description**: Updates password for logged-in user. Required on first login.
- **Body**: `{ "currentPassword": "...", "newPassword": "..." }`

## 4. Admin & Contributor Endpoints

### GET /api/admin/jobs

- **Description**: Lists jobs. Contributors see their own postings; Admins see all.

### POST /api/admin/jobs

- **Description**: Creates and publishes a job. Capped at 30 new jobs per 24 hours for contributors.

### POST /api/admin/upload

- **Description**: Uploads a company logo (max 160x160) or avatar (max 256x256). Converts file to WebP and stores in database.
