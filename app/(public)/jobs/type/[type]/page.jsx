import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLandingPageJobs } from '@/lib/publicJobs';
import JobCard from '@/components/JobCard';
import Pagination from '@/components/Pagination';
import AdSlot from '@/components/AdSlot';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

const VALID_TYPES = {
  fresher: {
    label: 'Freshers',
    title: 'Freshers Jobs & Off-Campus Drives in India',
    desc: 'Browse entry-level job openings and off-campus recruitment drives for fresh college graduates in India. Apply on official career sites.',
  },
  intern: {
    label: 'Internships',
    title: 'Internships for College Students & Freshers in India',
    desc: 'Discover paid summer and winter tech internships, graduate internships, and remote roles. Apply directly on employer career pages.',
  },
  experienced: {
    label: 'Experienced',
    title: 'Experienced Professional Jobs in India',
    desc: 'Explore career opportunities for early-career and experienced professionals across India.',
  },
};

/**
 * Metadata generator for programmatic job type landing pages.
 * Enforces rule: Return 404 when 0 jobs, and noindex when fewer than 3 jobs.
 *
 * @param {Object} props
 * @param {Promise<{ type: string }>} props.params
 * @returns {Promise<import('next').Metadata>}
 */
export async function generateMetadata({ params }) {
  const { type } = await params;
  const normalized = type.toLowerCase();
  const typeConfig = VALID_TYPES[normalized];

  if (!typeConfig) {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }

  const { total, shouldIndex } = await getLandingPageJobs('type', normalized, 1, 1);

  if (total === 0) {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }

  return {
    title: `${typeConfig.title} | ${siteConfig.name}`,
    description: `${typeConfig.desc} Featuring ${total} verified positions.`,
    alternates: {
      canonical: `${siteConfig.url}/jobs/type/${normalized}`,
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
  };
}

/**
 * Programmatic SEO Landing Page for job types (e.g. /jobs/type/fresher, /jobs/type/intern).
 *
 * @param {Object} props
 * @param {Promise<{ type: string }>} props.params
 * @param {Promise<Record<string, string | string[] | undefined>>} props.searchParams
 */
export default async function JobTypeLandingPage({ params, searchParams }) {
  const { type } = await params;
  const normalized = type.toLowerCase();
  const typeConfig = VALID_TYPES[normalized];

  if (!typeConfig) {
    notFound();
  }

  const resolvedParams = await searchParams;
  const page = parseInt(String(resolvedParams?.page || '1'), 10) || 1;

  const { jobs, total, shouldIndex, totalPages } = await getLandingPageJobs(
    'type',
    normalized,
    page
  );

  if (total === 0) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
        <span className="font-semibold text-slate-800">{typeConfig.label}</span>
      </nav>

      {/* SEO Hero Header */}
      <header className="mb-8 rounded-3xl border border-blue-100 bg-linear-to-br from-blue-50/70 via-white to-slate-50 p-6 shadow-xs sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Category Hub
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {typeConfig.title}
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
            {typeConfig.desc}
          </p>

          {!shouldIndex && (
            <p className="mt-3 text-[11px] text-amber-600 italic">
              Showing limited opportunities ({total} active {total === 1 ? 'position' : 'positions'}
              ). Check back soon as more companies publish drives.
            </p>
          )}
        </div>
      </header>

      {/* Feed */}
      <div className="space-y-4">
        {jobs.map((job, index) => {
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

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl={`/jobs/type/${normalized}`}
        searchParams={resolvedParams}
      />
    </div>
  );
}
