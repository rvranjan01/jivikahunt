import Link from 'next/link';
import { getPublicJobs } from '@/lib/publicJobs';
import JobCard from '@/components/JobCard';
import JobFilters from '@/components/JobFilters';
import Pagination from '@/components/Pagination';
import AdSlot from '@/components/AdSlot';
import JobAlertsBanner from '@/components/JobAlertsBanner';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

/**
 * Server-rendered Home Page displaying curated job listings with live URL-based filters.
 *
 * @param {Object} props
 * @param {Promise<Record<string, string | string[] | undefined>>} props.searchParams
 */
export default async function HomePage({ searchParams }) {
  const resolvedParams = await searchParams;
  const { jobs, pagination } = await getPublicJobs(resolvedParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <section className="mb-8 rounded-3xl border border-blue-100 bg-linear-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-xs sm:p-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/60 px-3 py-1 text-xs font-bold text-blue-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            Verified Opportunities • Zero Application Fees
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {siteConfig.tagline}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Apply directly to official careers portals at top tech firms, startups, and enterprises.
            No spam, no third-party recruiters, and no expired listings.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href="/jobs?type=fresher"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              Freshers Jobs
            </Link>
            <Link
              href="/jobs?type=intern"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              Internships
            </Link>
            <Link
              href="/jobs?workMode=remote"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              Remote Roles
            </Link>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <div className="mb-6">
        <JobFilters />
      </div>

      {/* Job Count & Results Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">
          Latest Opportunities{' '}
          <span className="ml-1 text-xs font-semibold text-slate-500">
            ({pagination.total} {pagination.total === 1 ? 'position' : 'positions'})
          </span>
        </h2>
        <span className="text-xs text-slate-500">
          Page {pagination.page} of {pagination.totalPages}
        </span>
      </div>

      {/* Job Card Feed */}
      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">No matching jobs found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search keywords, clearing your filters, or check back soon for fresh
            drives.
          </p>
          <div className="mt-6">
            <Link
              href="/jobs"
              className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              Clear all filters
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, index) => {
            // Render an ad slot after every 5th card, maximum 3 ads per page
            const cardNum = index + 1;
            const shouldRenderAd = cardNum % 5 === 0 && cardNum <= 15;

            return (
              <div key={job._id.toString()}>
                <JobCard job={job} />
                {shouldRenderAd && <AdSlot position="feed-inline" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Email Job Alerts Banner */}
      <div className="my-10">
        <JobAlertsBanner />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        baseUrl="/"
        searchParams={resolvedParams}
      />
    </div>
  );
}
