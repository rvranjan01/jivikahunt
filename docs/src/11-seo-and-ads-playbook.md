# 11 — SEO and Ads Playbook

## 1. Search Engine Optimization (SEO) Strategy

JivikaHunt is optimized for search engines to attract organic traffic from students searching for entry-level roles.

### JobPosting Schema (JSON-LD)

Every job listing includes Google Jobs compliant JSON-LD structured data:

- `title`: Job title.
- `description`: Clean text summary and responsibilities.
- `datePosted`: Original publication timestamp (ISO).
- `validThrough`: Expiry timestamp in ISO IST format.
- `hiringOrganization`: Company name and logo.
- `jobLocation` / `jobLocationType`: Configured as `TELECOMMUTE` for remote jobs or postal address for physical cities.
- `directApply`: Explicitly set to `false` because applicants apply on the external company site.

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

- Containers use fixed minimum heights to eliminate Cumulative Layout Shift (CLS).
- Ads are suppressed until the user gives consent on the Cookie Consent banner.
- The `ads.txt` file is dynamically served from `/ads.txt` matching `siteConfig.ads.adsTxtContent`.
