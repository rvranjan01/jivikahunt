import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLandingPageJobs } from '@/lib/publicJobs';
import JobCard from '@/components/JobCard';
import Pagination from '@/components/Pagination';
import AdSlot from '@/components/AdSlot';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

function decodeCity(slug) {
  if (!slug) return '';
  return decodeURIComponent(slug).replace(/-/g, ' ').trim();
}

/**
 * Metadata generator for programmatic city location landing pages.
 * Enforces rule: Return 404 when 0 jobs, and noindex when fewer than 3 jobs.
 *
 * @param {Object} props
 * @param {Promise<{ city: string }>} props.params
 * @returns {Promise<import('next').Metadata>}
 */
export async function generateMetadata({ params }) {
  const { city } = await params;
  const decoded = decodeCity(city);
  const { total, shouldIndex } = await getLandingPageJobs('location', decoded, 1, 1);

  if (total === 0) {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }

  const title = `Fresher Jobs & Internships in ${decoded} | JivikaHunt`;
  const description = `Discover ${total} verified entry-level job drives and tech internships located in ${decoded}, India. Apply on official company portals.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/jobs/location/${city}`,
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
  };
}

/**
 * Programmatic SEO Landing Page for locations (e.g. /jobs/location/bengaluru, /jobs/location/pune).
 *
 * @param {Object} props
 * @param {Promise<{ city: string }>} props.params
 * @param {Promise<Record<string, string | string[] | undefined>>} props.searchParams
 */
export default async function LocationLandingPage({ params, searchParams }) {
  const { city } = await params;
  const resolvedParams = await searchParams;
  const page = parseInt(String(resolvedParams?.page || '1'), 10) || 1;

  const decoded = decodeCity(city);
  const { jobs, total, shouldIndex, totalPages } = await getLandingPageJobs(
    'location',
    decoded,
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
        <span className="font-semibold text-slate-800 capitalize">{decoded}</span>
      </nav>

      {/* SEO Hero Header */}
      <header className="mb-8 rounded-3xl border border-blue-100 bg-linear-to-br from-blue-50/70 via-white to-slate-50 p-6 shadow-xs sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Location Hub
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 capitalize sm:text-3xl">
            Fresher Jobs in {decoded}
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
            Explore verified opportunities for college freshers and interns in{' '}
            <strong className="font-semibold text-slate-800 capitalize">{decoded}</strong>. Direct
            application links to company careers pages with zero recruiter commissions.
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
        baseUrl={`/jobs/location/${city}`}
        searchParams={resolvedParams}
      />
    </div>
  );
}
