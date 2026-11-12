# Changelog

All notable changes to the JivikaHunt project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-12

### Added

- **Phase 0 Foundation**: Initialized Next.js App Router application with Node.js and JavaScript with JSDoc types.
- Configured Tailwind CSS v4, PostCSS, ESLint flat config, Prettier, and Vitest test runner.
- Configured Playwright end-to-end testing harness with desktop and mobile viewports.
- Configured GitHub Actions CI workflow covering linting, security audit, unit/API tests, and documentation builds.
- Created `lib/siteConfig.js` containing centralized site metadata, social community links, and navigation items.
- Created `.env.example` documenting all configuration keys and secret requirements.
- Implemented `lib/db.js` providing cached singleton Mongoose connection management.
- Implemented `/api/health` route handler reporting system uptime, DB connectivity, and response latency.
- Established documentation skeleton in `docs/src` with 13 comprehensive guides and `CHANGELOG.md`.
- Implemented `scripts/build-docs.js` converting Markdown documentation into structured `.docx` files.
- Added comprehensive `README.md` with step-by-step local setup instructions.
