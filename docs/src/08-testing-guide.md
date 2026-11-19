# 08 — Testing Guide

## 1. Testing Strategy

JivikaHunt implements a three-tier test automation strategy:

1. **Unit Tests (Vitest)**: Core utilities, slug generators, date & expiry calculations, image magic byte signatures, and Zod schemas.
2. **API Tests (Vitest)**: Route handlers, auth rules, contributor permission boundaries, rate limits, image uploads, and job ingestion pipelines.
3. **End-to-End Tests (Playwright)**: Full browser workflows, 2FA admin login, job authoring, public browsing, and accessibility audits.

## 2. Running Tests

```bash
# Run all unit and API tests with Vitest (147 tests across 27 suites)
npm test

# Run Vitest in interactive watch mode during development
npm run test:watch

# Run Playwright End-to-End tests
npm run test:e2e

# Run Playwright with interactive UI
npx playwright test --ui

# Run Playwright Accessibility and Mobile suite
npx playwright test tests/e2e/a11y-mobile.spec.js --project="Mobile Chrome"
```

## 3. Playwright End-to-End & Accessibility Architecture

JivikaHunt's E2E test suite validates real-browser workflows using Playwright with desktop and mobile viewports:

- **Isolated Seeding (`tests/e2e/fixtures/seed.js`)**: Executes in `global-setup.js` before worker instantiation. Sets up an admin user with RFC-compliant 32-char Base32 TOTP secret, contributor credentials, active sample jobs, expired listings, and career guides.
- **Admin Workflow (`tests/e2e/auth-admin.spec.js`)**: Validates 2FA prompt enforcement, invalid password rejection, TOTP verification via `otplib`, contributor invitations, and contributor job publishing with ChatGPT extraction prompt assistance.
- **Public Workflow (`tests/e2e/public-site.spec.js`)**: Exercises live job browsing, full-text search, query parameter filtering (Remote, Internships), detail page hierarchy, `nofollow noopener noreferrer` apply link generation, Web Share and copy link interactions, contributor personal email leakage audits, broken link modal submissions with IP rate limits, client-side saved jobs bookmarks (`localStorage`), expired job notice banners with `noindex`, and cookie consent banner dismissal and script gating.
- **Automated Accessibility Auditing (`@axe-core/playwright`)**: In `tests/e2e/a11y-mobile.spec.js`, runs automated WCAG 2.1 AA audits across `/`, `/jobs`, `/guides`, `/jobs/[slug]`, and `/admin/login`, asserting zero critical accessibility violations.
- **Responsive Mobile Testing**: Validates mobile navigation drawer toggle, menu accessibility, and touch targets using the Pixel 5 viewport profile.

## 4. Test Cases Matrix

| Test ID | Category | Scenario                | Expected Outcome                                                                   | Status |
| ------- | -------- | ----------------------- | ---------------------------------------------------------------------------------- | ------ |
| TC-01   | Unit     | Config loading          | `siteConfig.js` exports brand name, socials, and nav.                              | Passed |
| TC-02   | Unit     | Slug generator          | Unique, lowercase, hyphenated URL-safe slug generated with collision counters.     | Passed |
| TC-03   | Unit     | IST Expiry logic        | Deadlines correctly evaluate to 23:59:59.999 Asia/Kolkata (18:29:59.999 UTC).      | Passed |
| TC-04   | Unit     | Zod URL validator       | Rejects URL shorteners, non-HTTPS protocols, and user credentials.                 | Passed |
| TC-05   | Unit     | NoSQL Sanitizer         | Strips keys containing `$` or `.`.                                                 | Passed |
| TC-06   | Unit     | TOTP 2FA                | Verifies RFC 6238 tokens and rejects malformed/invalid codes.                      | Passed |
| TC-07   | Unit     | Image Magic Bytes       | Detects genuine PNG/JPEG/WebP; rejects executables, SVGs, and text files.          | Passed |
| TC-08   | Unit     | Job Zod Schema          | Validates job fields, enforces summary min 40 chars, rejects missing locations.    | Passed |
| TC-09   | API      | Health check            | `/api/health` returns status `ok` and uptime details.                              | Passed |
| TC-10   | API      | Admin 2FA login         | Admin login requires correct TOTP token; rejects invalid tokens.                   | Passed |
| TC-11   | API      | Contributor isolation   | Contributor cannot edit or delete another contributor's post (HTTP 403).           | Passed |
| TC-12   | API      | Deactivated user        | Deactivated user token rejected immediately on subsequent requests.                | Passed |
| TC-13   | API      | Rate limiting           | 6th failed login within window receives HTTP 429 lock.                             | Passed |
| TC-14   | API      | Image upload            | Rejects non-image files, files > 1MB; converts valid images to WebP.               | Passed |
| TC-15   | API      | Media delivery          | Serves WebP with immutable headers and returns 304 on matching ETag.               | Passed |
| TC-16   | API      | Job duplicate warning   | Detects matching company + title + applyUrl and warns with HTTP 409.               | Passed |
| TC-17   | API      | Contributor daily quota | Caps contributors at 30 jobs per 24 hours (HTTP 429); exempts admins.              | Passed |
| TC-18   | Unit     | Markdown sanitizer      | Strips `<script>`, `<iframe>`, `onerror`; adds safe external link attributes.      | Passed |
| TC-19   | Unit     | Static page parser      | Loads `/content/*.md`, extracts page titles and returns sanitized HTML.            | Passed |
| TC-20   | Unit     | Public query builder    | Generates MongoDB filters for `type`, `workMode`, `batch`, `location`, and `q`.    | Passed |
| TC-21   | API      | Contributor privacy     | Public job detail response never exposes contributor personal email address.       | Passed |
| TC-22   | API      | Expired job filtering   | Excludes expired jobs from lists; marks expired detail views with noindex.         | Passed |
| TC-23   | Unit     | JobPosting JSON-LD      | Generates schema.org compliant data (`validThrough`, `directApply: false`).        | Passed |
| TC-24   | Unit     | SEO Indexing Threshold  | Flags `noindex` when < 3 jobs exist; enables indexing when >= 3 jobs exist.        | Passed |
| TC-25   | Unit     | Robots & Sitemap        | robots.txt disallows admin/api; sitemap includes active jobs and companies.        | Passed |
| TC-26   | API      | Broken Link Reporting   | Allows public reports; enforces 5 reports/hr rate limit per IP with HTTP 429.      | Passed |
| TC-27   | API      | Report Moderation       | Admin lists and resolves reports; contributors restricted with HTTP 403.           | Passed |
| TC-28   | Unit     | RSS 2.0 Syndication     | Feed outputs valid XML with RFC 822 dates and excludes expired listings.           | Passed |
| TC-29   | Unit     | Guide Schema & Reading  | Validates guide fields, min lengths, and accurately calculates reading minutes.    | Passed |
| TC-30   | API      | Double Opt-In Alerts    | Issues confirmation tokens, confirms subscribers, handles one-click unsubscribe.   | Passed |
| TC-31   | API      | Guide Author Isolation  | Contributors restricted to viewing/editing own guides (HTTP 403); Admin can edit   | Passed |
| TC-32   | API      | Saved Jobs Lookup       | Validates batches of IDs, drops invalid ObjectIds, returns active postings only.   | Passed |
| TC-33   | E2E      | Admin 2FA & Auth Flow   | Tests invalid credentials rejection, TOTP verification, and session creation.      | Passed |
| TC-34   | E2E      | Contributor Management  | Admin invites contributor; contributor logs in and accesses posting portal.        | Passed |
| TC-35   | E2E      | E2E Job Publishing      | Contributor posts job using form; verified published on public index.              | Passed |
| TC-36   | E2E      | Public Portal & Privacy | Tests search, filters, safe apply links, no email leakage, report modal, save.     | Passed |
| TC-37   | E2E      | Accessibility (axe)     | Automated WCAG 2.1 AA audits on 5 key routes report 0 critical violations.         | Passed |
| TC-38   | E2E      | Mobile Viewport Drawer  | Pixel 5 viewport check confirms responsive navigation drawer toggle functionality. | Passed |
