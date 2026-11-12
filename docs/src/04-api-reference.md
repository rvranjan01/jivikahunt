# 04 — API Reference Guide

## 1. Overview

All JivikaHunt backend endpoints are implemented as Next.js App Router Route Handlers (`app/api/**/route.js`). Responses use standard JSON formatting with explicit HTTP status codes.

## 2. Public Endpoints

### GET /api/health

- **Description**: Verifies service uptime and database connectivity.
- **Authentication**: None.
- **Response**: Status `ok` (HTTP 200) or `degraded` (HTTP 503). Includes uptime, database state, and timestamp.

## 3. Authentication Endpoints

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

- **Responses**:
  - `200 OK`: `{ "success": true, "user": { "id": "...", "email": "...", "role": "admin", "mustChangePassword": false } }` (Sets cookie).
  - `200 OK (2FA Challenge)`: `{ "requires2FA": true, "message": "Please provide the 6-digit 2FA code..." }`
  - `401 Unauthorized`: `{ "error": "Invalid email or password." }` or `{ "error": "Invalid 2FA code." }`
  - `403 Forbidden`: `{ "error": "Account is deactivated..." }`
  - `429 Too Many Requests`: `{ "error": "Account temporarily locked...", "remainingSeconds": 900 }`

### POST /api/auth/logout

- **Description**: Clears session cookie and records audit log event.
- **Authentication**: Authenticated user.

### GET /api/auth/me

- **Description**: Inspects current session cookie and returns user profile. Re-verifies user is active and tokenVersion matches database.
- **Authentication**: Authenticated user.

### POST /api/auth/change-password

- **Description**: Changes password for the active user. Mandatory on first contributor login. Increments `tokenVersion` to revoke all other active sessions across devices.
- **Authentication**: Authenticated user.
- **Request Body**:

```json
{
  "currentPassword": "••••••••••••",
  "newPassword": "••••••••••••"
}
```

## 4. Admin User Management Endpoints

### GET /api/admin/users

- **Description**: Lists all registered staff and contributors with their status and roles.
- **Authentication**: Admin only (HTTP 403 for contributors).

### POST /api/admin/users

- **Description**: Creates a new contributor account, generates a 14-character secure random temporary password, and sends an email invitation via Resend (or logs to console in local development).
- **Authentication**: Admin only.
- **Request Body**:

```json
{
  "name": "Aditi Sharma",
  "displayName": "Aditi S.",
  "email": "aditi@example.com",
  "bio": "Curating entry-level roles"
}
```

- **Response**: `201 Created` with created user details and temporary password.

### PATCH /api/admin/users/[id]

- **Description**: Toggles contributor active status or updates profile. When setting `isActive: false`, increments `tokenVersion` to immediately revoke all active JWT sessions.
- **Authentication**: Admin only.
- **Request Body**:

```json
{
  "isActive": false
}
```

### DELETE /api/admin/users/[id]

- **Description**: Deletes a user account. Admins cannot delete their own account.
- **Authentication**: Admin only.
