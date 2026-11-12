import Link from 'next/link';
import { getPublicJobs } from '@/lib/publicJobs';
import JobCard from '@/components/JobCard';
import JobFilters from '@/components/JobFilters';
import Pagination from '@/components/Pagination';
import AdSlot from '@/components/AdSlot';

export const dynamic = 'force-dynamic';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Browse Jobs & Internships',
  description:
    'Search and filter verified entry-level fresher jobs, tech internships, and remote openings across India.',
};

/**
 * Filtered search view for all published opportunities.
 *
 * @param {Object} props
 * @param {Promise<Record<string, string | string[] | undefined>>} props.searchParams
 */
export default async function JobsPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const { jobs, pagination } = await getPublicJobs(resolvedParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Title & Breadcrumb */}
      <div className="mb-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-2 flex items-center gap-2 text-xs text-slate-500"
        >
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">Jobs</span>
        </nav>

        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Browse All Opportunities
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Discover verified roles for freshers, college graduates, and interns with direct
          application links.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-6">
        <JobFilters />
      </div>

      {/* Job Count & Results Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">
          Showing {jobs.length} of {pagination.total} positions
        </h2>
        <span className="text-xs text-slate-500">
          Page {pagination.page} of {pagination.totalPages}
        </span>
      </div>

      {/* Job Feed */}
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
          <h3 className="mt-4 text-base font-bold text-slate-900">No jobs match your criteria</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try broadening your search or resetting active filters.
          </p>
          <div className="mt-6">
            <Link
              href="/jobs"
              className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              Reset all filters
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

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        baseUrl="/jobs"
        searchParams={resolvedParams}
      />
    </div>
  );
}
