# 11 — SEO and Ads Playbook

## 1. Search Engine Optimization (SEO) Strategy

JivikaHunt is optimized for search engines to attract organic traffic from students searching for entry-level roles.

### JobPosting Schema (JSON-LD)

Every job listing includes Google Jobs compliant JSON-LD structured data:

- `title`: Job title (validated: max 100 chars, no all-caps, no promotional phrases like "hiring now", no company name embedded).
- `description`: Rich HTML description formatted using only safe `<p>`, `<ul>`, and `<li>` tags with all dynamic values escaped (`&`, `<`, `>`). Includes summary, company, location, workMode, type, salary (if provided), batches, last date, responsibilities, eligibility, and skills.
- `datePosted`: Original first publication timestamp (`publishedAt` falling back to `createdAt`).
- `validThrough`: Expiry timestamp in ISO IST format.
- `identifier`: PropertyValue containing the employer name and internal Job ID.
- `hiringOrganization`: Employer Organization without redundant sameAs.
- `jobLocation` / `jobLocationType`: Configured as `TELECOMMUTE` for remote jobs; parsed as `addressLocality` and `addressRegion` for "City, State", or nationwide `addressCountry: 'IN'` for "Pan India" / "India".
- `directApply`: Explicitly set to `false` because applicants apply on the external company site.
- **Expired Job Suppression**: When a job expires, the JSON-LD `<script>` tag is completely omitted from the HTML markup, while keeping the visual expired alert banner and `<meta name="robots" content="noindex, follow" />`.

### Google Job Posting Quality Policies

The system enforces Google's technical and editorial quality policies at ingestion time:

- No fees, deposits, or pay-to-work scams.
- Real open job requisitions only (no resume collecting or training events).
- Live verified direct apply link to company career portal.
- Minimum 150 characters summary, at least 2 responsibilities, at least 2 eligibility requirements.

### Programmatic Landing Pages

- URLs: `/jobs/skill/[skill]`, `/jobs/location/[city]`, `/jobs/batch/[year]`, `/jobs/type/[type]`, `/companies/[slug]`.
- **Quality Safeguard**: Returns HTTP `404` if 0 jobs exist. Renders `<meta name="robots" content="noindex" />` if fewer than 3 jobs exist, preventing thin content search penalties.

### Dynamic Sitemap & Robots.txt

- **Dynamic Sitemap (`/sitemap.xml`)**: Built via Next.js App Router metadata route. Indexes only active published jobs (dynamically excluding expired vacancies based on IST deadline), static policy pages, category hubs, and company landing pages.
- **Robots.txt (`/robots.txt`)**: Explicitly disallows `/admin/`, `/api/`, and `/saved`; permits crawling of all public routes; references the dynamic sitemap.

## 2. Google AdSense Implementation

AdSense monetization is configured strictly for high usability and full policy compliance.

### Ad Placements

- **Slot 1**: Below the job header on detail pages (`min-h-[280px]`).
- **Slot 2**: In job listing feeds after every 5th job card.
- **Strict Limit**: Maximum 3 ad units rendered per page.

### Layout Stability & Consent

- Containers use fixed minimum heights (`min-h-[280px]`) to eliminate Cumulative Layout Shift (CLS).
- Ads are suppressed until the user gives consent on the Cookie Consent banner. The banner utilizes React 19 `useSyncExternalStore` and dispatches custom `jh_cookie_consent_updated` window events.
- The `ads.txt` file is dynamically served from `/ads.txt` matching `siteConfig.ads.adsTxtContent` with `Cache-Control: public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800`.
- Google Search Console ownership verification is supported through the `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` environment variable.
