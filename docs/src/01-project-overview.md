# 01 — Project Overview

## 1. Introduction

JivikaHunt is a fast, clean, and trustworthy job board designed specifically for college freshers and interns in India. The platform bridges the gap between aspiring students and legitimate hiring companies by providing direct, unshortened links to official career portals.

## 2. Key Objectives

- **Simplicity**: No clunky registration walls for job seekers. Anyone can search and view listings instantly.
- **Trust**: Every job application link directs strictly to the company's official career page or ATS (Applicant Tracking System). URL shorteners are strictly blocked.
- **Speed**: Built on Next.js App Router with server-side rendering and aggressive caching to load pages in milliseconds, even on slow 3G mobile connections.
- **Zero Spam**: Only verified contributors and admins can publish listings through an authenticated management portal.

## 3. User Roles

| Role               | Who They Are                       | What They Can Do                                                                                            |
| ------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Public Visitor** | Students, fresh graduates, interns | Browse jobs, filter by batch or skill, save jobs locally, and apply directly on company sites.              |
| **Contributor**    | Trusted team members (5-6 people)  | Create, edit, and delete their own job posts through the `/admin` area (capped at 30 new jobs/day).         |
| **Admin**          | Site owner / founder               | Manage all jobs, create and invite contributors, review broken link reports, and enforce security policies. |

## 4. Glossary of Terms

- **Fresher**: A recent college graduate seeking their first full-time role (0-1 years of experience).
- **Intern**: A current college student or recent graduate working short-term for practical experience.
- **IST (Asia/Kolkata)**: Indian Standard Time (UTC+05:30). All deadline and expiry logic on JivikaHunt operates in IST.
- **2FA (Two-Factor Authentication)**: An extra security layer requiring a 6-digit TOTP code generated on a mobile authenticator app.
- **ISR (Incremental Static Regeneration)**: A Next.js mechanism that serves pre-rendered pages instantly and updates them in the background when changes occur.
