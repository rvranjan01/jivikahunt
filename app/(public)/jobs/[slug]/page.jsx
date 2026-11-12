import { notFound } from 'next/navigation';
import Link from 'next/link';
import CompanyLogo from '@/components/CompanyLogo';
import AdSlot from '@/components/AdSlot';
import ShareButtons from '@/components/ShareButtons';
import AuthorBox from '@/components/AuthorBox';
import JobCard from '@/components/JobCard';
import { getPublicJobBySlug, getRelatedJobs } from '@/lib/publicJobs';
import { formatIST } from '@/lib/time';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

/**
 * Dynamic metadata generator with canonical URLs and expired job noindex enforcement.
 *
 * @param {Object} props
 * @param {Promise<{ slug: string }>} props.params
 * @returns {Promise<import('next').Metadata>}
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getPublicJobBySlug(slug);

  if (!result || !result.job) {
    return {
      title: 'Job Not Found',
      robots: { index: false, follow: false },
    };
  }

  const { job, isExpired } = result;
  const canonicalUrl = `${siteConfig.url}/jobs/${job.slug}`;

  return {
    title: `${job.title} at ${job.company?.name}`,
    description: job.summary ? job.summary.slice(0, 160) : siteConfig.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: isExpired ? { index: false, follow: true } : { index: true, follow: true },
  };
}

/**
 * Public Job Detail Page strictly conforming to the AGENTS.md ordering requirement.
 *
 * Ordering:
 * 1. Header with logo, title, company, location, chips
 * 2. "Posted by {displayName}, JivikaHunt Team" with date and updated date
 * 3. Ad slot
 * 4. Company description
 * 5. Summary
 * 6. Skills
 * 7. Responsibilities
 * 8. Eligibility
 * 9. Official Apply button (rel nofollow noopener noreferrer, opens in new tab)
 * 10. Report broken link button
 * 11. Related jobs (max 4)
 * 12. Share buttons
 * 13. Author box
 *
 * @param {Object} props
 * @param {Promise<{ slug: string }>} props.params
 */
export default async function JobDetailPage({ params }) {
  const { slug } = await params;
  const result = await getPublicJobBySlug(slug);

  if (!result || !result.job) {
    notFound();
  }

  const { job, author, isExpired } = result;
  const relatedJobs = await getRelatedJobs(job, 4);
  const currentUrl = `${siteConfig.url}/jobs/${job.slug}`;

  const createdDateStr = formatIST(job.createdAt);
  const updatedDateStr = formatIST(job.updatedAt);
  const hasBeenUpdated =
    job.updatedAt &&
    job.createdAt &&
    new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime() > 60000;

  const locationsStr = Array.isArray(job.locations) ? job.locations.join(', ') : job.locations;
  const deadlineStr = job.lastDate ? formatIST(job.lastDate) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span>/</span>
        <Link href="/jobs" className="hover:text-blue-600">
          Jobs
        </Link>
        <span>/</span>
        <span className="truncate font-semibold text-slate-800">{job.title}</span>
      </nav>

      {/* Expired Job Notice Banner */}
      {isExpired && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800"
        >
          <svg
            className="h-5 w-5 shrink-0 text-rose-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="text-xs">
            <p className="font-bold">This job listing has expired</p>
            <p className="mt-0.5 text-rose-700">
              The application deadline ({deadlineStr || 'passed'} IST) has closed. You may still
              review the requirements or browse related active opportunities below.
            </p>
          </div>
        </div>
      )}

      {/* Container Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        {/* 1. Header with Logo, Title, Company, Location, and Chips */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <CompanyLogo
            logoId={job.company?.logoId}
            name={job.company?.name}
            size={72}
            className="rounded-2xl shadow-sm"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                {job.company?.name}
              </span>
              {job.featured && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  Sponsored
                </span>
              )}
            </div>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {job.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{locationsStr}</span>
              </div>

              {deadlineStr && (
                <div className="flex items-center gap-1.5">
                  <svg
                    className="h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>
                    Apply before:{' '}
                    <strong className="font-semibold text-slate-800">{deadlineStr}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Badges / Chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 capitalize">
                {job.type}
              </span>
              <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 capitalize">
                {job.workMode}
              </span>
              {Array.isArray(job.batches) && job.batches.length > 0 && (
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Batch: {job.batches.join(', ')}
                </span>
              )}
              {job.salary && (
                <span className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {job.salary}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Posted By line with IST Dates */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
          Posted by{' '}
          <strong className="font-semibold text-slate-700">
            {author?.displayName || job.postedByName}
          </strong>
          , JivikaHunt Team
          <span className="mx-2">•</span>
          Published on {createdDateStr} IST
          {hasBeenUpdated && (
            <>
              <span className="mx-2">•</span>
              Updated {updatedDateStr} IST
            </>
          )}
        </div>

        {/* 3. Ad Slot */}
        <div className="my-6">
          <AdSlot position="job-detail" />
        </div>

        {/* 4. Company Description */}
        {job.company?.description && (
          <section className="mt-6">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              About {job.company.name}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-700">{job.company.description}</p>
          </section>
        )}

        {/* 5. Summary */}
        <section className="mt-6">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Role Overview
          </h2>
          <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700">
            {job.summary}
          </p>
        </section>

        {/* 6. Skills */}
        {Array.isArray(job.skills) && job.skills.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Required Skills
            </h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 7. Responsibilities */}
        {Array.isArray(job.responsibilities) && job.responsibilities.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Key Responsibilities
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700">
              {job.responsibilities.map((resp, i) => (
                <li key={i}>{resp}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 8. Eligibility */}
        {Array.isArray(job.eligibility) && job.eligibility.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Eligibility & Qualifications
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700">
              {job.eligibility.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 9. Official Apply Button */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          {isExpired ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold text-slate-600">
                Applications for this role have officially closed.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg active:scale-98"
              >
                <span>Apply on Official Company Site</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>

              {/* 10. Report Broken Link Button */}
              <button
                type="button"
                id="report-broken-link-btn"
                title="Report broken application link, scam, or incorrect details"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                Report Broken Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 11. Related Jobs (max 4) */}
      {relatedJobs.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Related Opportunities</h2>
            <Link href="/jobs" className="text-xs font-semibold text-blue-600 hover:underline">
              View all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {relatedJobs.map((relJob) => (
              <JobCard key={relJob._id.toString()} job={relJob} />
            ))}
          </div>
        </section>
      )}

      {/* 12. Share Buttons */}
      <div className="mt-8">
        <ShareButtons title={job.title} company={job.company?.name} url={currentUrl} />
      </div>

      {/* 13. Author Box */}
      <div className="mt-8">
        <AuthorBox author={author} />
      </div>
    </div>
  );
}
