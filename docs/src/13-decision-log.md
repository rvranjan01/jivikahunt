# 13 — Architecture Decision Log

## 1. Overview

This document records key architectural and technical decisions made during the design and development of JivikaHunt.

## 2. Decision Records

### ADR-01: Next.js App Router without Express

- **Context**: A standalone Express server adds deployment complexity and duplicated routing logic.
- **Decision**: Use Next.js App Router Route Handlers (`app/api/**/route.js`).
- **Consequence**: Single deployment artifact, unified TypeScript/JSDoc types, simplified local setup, lower memory usage.

### ADR-02: In-Database Image Storage in MongoDB

- **Context**: Heroku's filesystem is ephemeral. Third-party cloud storage (e.g. AWS S3) introduces ongoing billing risks and credential management for a student-funded project.
- **Decision**: Store processed WebP image buffers directly in MongoDB within the `Image` collection and serve them from `/img/[id]` with `Cache-Control: public, max-age=31536000, immutable` and ETag validation.
- **Consequence**: Zero extra hosting costs, zero broken assets on dyno restarts, fast edge caching.

### ADR-03: Pure JavaScript with JSDoc Types

- **Context**: Strict TypeScript compilation can introduce build step overhead and complex typing acrobatics for a fast-moving, small-team codebase.
- **Decision**: Use modern JavaScript with thorough JSDoc annotations and `jsconfig.json` checkJs enabled.
- **Consequence**: Full IDE autocompletion and type checking without TypeScript compile step slowdowns.

### ADR-04: Fixed Minimum Height for AdSense Containers

- **Context**: Dynamic asynchronous ad loading introduces Cumulative Layout Shift (CLS), which penalizes Core Web Vitals.
- **Decision**: Wrap all ad units in containers with fixed minimum heights (`min-h-[280px]`).
- **Consequence**: Smooth reading experience with zero layout shift during ad rendering.
