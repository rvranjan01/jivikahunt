# 02 — Architecture and Folder Guide

## 1. System Architecture

JivikaHunt is built as a single unified Next.js application using the App Router. There is no separate backend framework (such as Express); all API endpoints are implemented as Next.js Route Handlers.

```
[Browser / Mobile Visitor] ──> [Cloudflare Edge] ──> [Next.js App Router (Node.js)]
                                                              │
                                                     ┌────────┴────────┐
                                                     ▼                 ▼
                                             [MongoDB Atlas]     [Resend / Telegram]
```

## 2. Directory Structure

| Directory     | Responsibility                                                                                |
| ------------- | --------------------------------------------------------------------------------------------- |
| `app/`        | Contains all public and admin pages, layouts, and route handlers (`api/`).                    |
| `components/` | Reusable React components (Header, Footer, JobCard, AuthorBox, AdSenseSlot).                  |
| `content/`    | Static markdown files for standard informational pages (`about.md`, `privacy-policy.md`).     |
| `docs/src/`   | Source documentation written in Markdown.                                                     |
| `docs/docx/`  | Generated Word documents (`.docx`) produced by `npm run docs:build`.                          |
| `lib/`        | Shared utilities: database client, auth tokens, time helpers, slug generators, and config.    |
| `models/`     | Mongoose database schema definitions (`User`, `Job`, `Image`, `Report`, etc.).                |
| `scripts/`    | Standalone CLI automation scripts (documentation builder, scheduled publisher, email digest). |
| `tests/`      | Automated test suites: unit tests, API tests, and Playwright end-to-end specs.                |

## 3. Key Public Components & Routes

- `app/(public)/layout.jsx`: Brand shell with `Header` and `Footer`.
- `app/(public)/page.jsx`: Server-rendered home page with hero, live filter toolbar, job card feed, inline ads, and pagination.
- `app/(public)/jobs/page.jsx`: Filtered search view supporting `type`, `workMode`, `batch`, `location`, `skills`, and `q`.
- `app/(public)/jobs/[slug]/page.jsx`: Canonical job detail view with strict AGENTS.md element hierarchy, `robots` noindex for expired postings, and related job cards.
- `app/(public)/[staticPage]/page.jsx`: Dynamic static content loader serving `/about`, `/contact`, `/disclaimer`, and `/privacy` from `/content/*.md`.
- `components/Header.jsx`: Top navigation and site wordmark with quick search and mobile menu drawer.
- `components/Footer.jsx`: 4-column footer with category links, policy pages, social channels, and recruitment disclaimers.
- `components/JobCard.jsx`: Reusable job listing card with company logo/initials, type/mode/batch chips, and IST deadline.
- `components/JobFilters.jsx`: URL-synchronized filter controls preserving bookmarkable and shareable search URLs.
- `components/AuthorBox.jsx`: Dashed-border curator box displaying display name, bio, and shared team email.
- `components/ShareButtons.jsx`: Pure HTML share intents for WhatsApp, Telegram, X, Facebook, plus native mobile Web Share.
- `components/AdSlot.jsx`: Fixed minimum-height (`min-h-[280px]`) container preventing layout shift, gated by configuration.

## 4. Technology Choices

- **Next.js App Router**: Server components for fast initial load and SEO; client components only when interactivity is needed.
- **Mongoose & MongoDB Atlas**: Document database ideal for flexible job metadata, text search, and in-database image storage.
- **Tailwind CSS**: Utility-first CSS framework ensuring responsive, lightweight styling without runtime overhead.
- **Vitest & Playwright**: Fast modern testing stack covering unit functions, route handlers, and real browser user flows.
