# 08 — Testing Guide

## 1. Testing Strategy

JivikaHunt implements a three-tier test automation strategy:

1. **Unit Tests (Vitest)**: Core utilities, slug generators, date & expiry calculations, image magic byte signatures, and Zod schemas.
2. **API Tests (Vitest)**: Route handlers, auth rules, contributor permission boundaries, rate limits, image uploads, and job ingestion pipelines.
3. **End-to-End Tests (Playwright)**: Full browser workflows, 2FA admin login, job authoring, public browsing, and accessibility audits.

## 2. Running Tests

```bash
# Run all unit and API tests with Vitest (134 tests across 22 suites)
npm test

# Run Vitest in interactive watch mode during development
npm run test:watch

# Run Playwright End-to-End tests
npm run test:e2e
```

## 3. Test Cases Matrix

| Test ID | Category | Scenario                | Expected Outcome                                                                | Status |
| ------- | -------- | ----------------------- | ------------------------------------------------------------------------------- | ------ |
| TC-01   | Unit     | Config loading          | `siteConfig.js` exports brand name, socials, and nav.                           | Passed |
| TC-02   | Unit     | Slug generator          | Unique, lowercase, hyphenated URL-safe slug generated with collision counters.  | Passed |
| TC-03   | Unit     | IST Expiry logic        | Deadlines correctly evaluate to 23:59:59.999 Asia/Kolkata (18:29:59.999 UTC).   | Passed |
| TC-04   | Unit     | Zod URL validator       | Rejects URL shorteners, non-HTTPS protocols, and user credentials.              | Passed |
| TC-05   | Unit     | NoSQL Sanitizer         | Strips keys containing `$` or `.`.                                              | Passed |
| TC-06   | Unit     | TOTP 2FA                | Verifies RFC 6238 tokens and rejects malformed/invalid codes.                   | Passed |
| TC-07   | Unit     | Image Magic Bytes       | Detects genuine PNG/JPEG/WebP; rejects executables, SVGs, and text files.       | Passed |
| TC-08   | Unit     | Job Zod Schema          | Validates job fields, enforces summary min 40 chars, rejects missing locations. | Passed |
| TC-09   | API      | Health check            | `/api/health` returns status `ok` and uptime details.                           | Passed |
| TC-10   | API      | Admin 2FA login         | Admin login requires correct TOTP token; rejects invalid tokens.                | Passed |
| TC-11   | API      | Contributor isolation   | Contributor cannot edit or delete another contributor's post (HTTP 403).        | Passed |
| TC-12   | API      | Deactivated user        | Deactivated user token rejected immediately on subsequent requests.             | Passed |
| TC-13   | API      | Rate limiting           | 6th failed login within window receives HTTP 429 lock.                          | Passed |
| TC-14   | API      | Image upload            | Rejects non-image files, files > 1MB; converts valid images to WebP.            | Passed |
| TC-15   | API      | Media delivery          | Serves WebP with immutable headers and returns 304 on matching ETag.            | Passed |
| TC-16   | API      | Job duplicate warning   | Detects matching company + title + applyUrl and warns with HTTP 409.            | Passed |
| TC-17   | API      | Contributor daily quota | Caps contributors at 30 jobs per 24 hours (HTTP 429); exempts admins.           | Passed |
| TC-18   | Unit     | Markdown sanitizer      | Strips `<script>`, `<iframe>`, `onerror`; adds safe external link attributes.   | Passed |
| TC-19   | Unit     | Static page parser      | Loads `/content/*.md`, extracts page titles and returns sanitized HTML.         | Passed |
| TC-20   | Unit     | Public query builder    | Generates MongoDB filters for `type`, `workMode`, `batch`, `location`, and `q`. | Passed |
| TC-21   | API      | Contributor privacy     | Public job detail response never exposes contributor personal email address.    | Passed |
| TC-22   | API      | Expired job filtering   | Excludes expired jobs from lists; marks expired detail views with noindex.      | Passed |
| TC-23   | Unit     | JobPosting JSON-LD      | Generates schema.org compliant data (`validThrough`, `directApply: false`).     | Passed |
| TC-24   | Unit     | SEO Indexing Threshold  | Flags `noindex` when < 3 jobs exist; enables indexing when >= 3 jobs exist.     | Passed |
| TC-25   | Unit     | Robots & Sitemap        | robots.txt disallows admin/api; sitemap includes active jobs and companies.     | Passed |
| TC-26   | API      | Broken Link Reporting   | Allows public reports; enforces 5 reports/hr rate limit per IP with HTTP 429.   | Passed |
| TC-27   | API      | Report Moderation       | Admin lists and resolves reports; contributors restricted with HTTP 403.        | Passed |
