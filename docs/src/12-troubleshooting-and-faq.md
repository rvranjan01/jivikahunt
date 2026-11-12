# 12 — Troubleshooting and FAQ

## 1. Frequently Asked Questions

### Why do images load from `/img/[id]` instead of static hosting?

Heroku Dynos use ephemeral filesystems, meaning any files saved to the server disk disappear when the server restarts or deploys. Storing images directly in MongoDB Atlas and streaming them via `/img/[id]` with long-lived HTTP caching headers guarantees permanent persistence without costly S3 storage.

### How does job expiry work?

Jobs expire based on their `lastDate` field. At 23:59:59.999 IST on that day, the job is automatically filtered out of public listings and the sitemap. If a user visits an expired job via direct link, they see an "Expired" notice and related active listings.

### How are contributor email addresses protected?

The public author box only displays the contributor's public `displayName` and short bio. Inquiries use the team contact email from `lib/siteConfig.js`. The contributor's private personal email is never exposed in the HTML markup or client-side JSON.

## 2. Common Errors and Solutions

### Error: `MONGODB_URI is not defined`

- **Cause**: The application cannot find the MongoDB connection string.
- **Fix**: Create a `.env.local` file from `.env.example` and set `MONGODB_URI`.

### Error: `429 Too Many Requests` on login

- **Cause**: More than 5 failed login attempts were recorded within the rate-limit window.
- **Fix**: Wait 15 minutes for the TTL lockout to expire, or clear the `LoginAttempt` record in MongoDB.

### Error: Image upload rejected

- **Cause**: File size exceeds 1MB or the file is not a genuine PNG, JPEG, or WebP.
- **Fix**: Re-save the image as a standard WebP/PNG under 1MB.
