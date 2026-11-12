# 08 — Testing Guide

## 1. Testing Strategy

JivikaHunt implements a three-tier test automation strategy:

1. **Unit Tests (Vitest)**: Core utilities, slug generators, date & expiry calculations, and Zod schemas.
2. **API Tests (Vitest)**: Route handlers, auth rules, contributor permission boundaries, and rate limits.
3. **End-to-End Tests (Playwright)**: Full browser workflows, 2FA admin login, job authoring, public browsing, and accessibility audits.

## 2. Running Tests

```bash
# Run unit and API tests with Vitest
npm test

# Run Vitest in watch mode during development
npm run test:watch

# Run Playwright End-to-End tests
npm run test:e2e
```

## 3. Test Cases Matrix

| Test ID | Category | Scenario              | Expected Outcome                                                         |
| ------- | -------- | --------------------- | ------------------------------------------------------------------------ |
| TC-01   | Unit     | Config loading        | `siteConfig.js` exports required brand name, socials, and nav.           |
| TC-02   | Unit     | Slug generator        | Unique, lowercase, hyphenated URL-safe slug generated.                   |
| TC-03   | Unit     | IST Expiry logic      | Deadlines correctly evaluate to 23:59:59.999 Asia/Kolkata.               |
| TC-04   | Unit     | Zod URL validator     | Rejects URL shorteners, non-HTTPS protocols, and user credentials.       |
| TC-05   | Unit     | NoSQL Sanitizer       | Strips keys containing `$` or `.`.                                       |
| TC-06   | API      | Health check          | `/api/health` returns status `ok` and uptime details.                    |
| TC-07   | API      | Admin 2FA login       | Admin login requires correct TOTP token; rejects invalid tokens.         |
| TC-08   | API      | Contributor isolation | Contributor cannot edit or delete another contributor's post.            |
| TC-09   | API      | Deactivated user      | Deactivated user token rejected immediately on subsequent requests.      |
| TC-10   | API      | Rate limiting         | 6th failed login within window receives HTTP 429 lock.                   |
| TC-11   | API      | Image upload          | Rejects non-image files, files > 1MB; converts valid images to WebP.     |
| TC-12   | E2E      | Public browsing       | Home page renders jobs; URL query filters correctly filter results.      |
| TC-13   | E2E      | Accessibility         | Axe scanner reports 0 critical or serious WCAG accessibility violations. |
