import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLandingPageJobs } from '@/lib/publicJobs';
import JobCard from '@/components/JobCard';
import Pagination from '@/components/Pagination';
import AdSlot from '@/components/AdSlot';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

function decodeSkill(slug) {
  if (!slug) return '';
  return decodeURIComponent(slug).replace(/-/g, ' ').trim();
}

/**
 * Metadata generator for programmatic skill landing pages.
 * Enforces rule: Return 404 when 0 jobs, and noindex when fewer than 3 jobs.
 *
 * @param {Object} props
 * @param {Promise<{ skill: string }>} props.params
 * @returns {Promise<import('next').Metadata>}
 */
export async function generateMetadata({ params }) {
  const { skill } = await params;
  const decoded = decodeSkill(skill);
  const { total, shouldIndex } = await getLandingPageJobs('skill', decoded, 1, 1);

  if (total === 0) {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }

  const title = `${decoded.toUpperCase()} Jobs for Freshers & Interns in India`;
  const description = `Browse ${total} verified ${decoded} job openings and internships for college students and fresh graduates in India.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/jobs/skill/${skill}`,
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
  };
}

/**
 * Programmatic SEO Landing Page for skills (e.g. /jobs/skill/python, /jobs/skill/react).
 *
 * @param {Object} props
 * @param {Promise<{ skill: string }>} props.params
 * @param {Promise<Record<string, string | string[] | undefined>>} props.searchParams
 */
export default async function SkillLandingPage({ params, searchParams }) {
  const { skill } = await params;
  const resolvedParams = await searchParams;
  const page = parseInt(String(resolvedParams?.page || '1'), 10) || 1;

  const decoded = decodeSkill(skill);
  const { jobs, total, shouldIndex, totalPages } = await getLandingPageJobs('skill', decoded, page);

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
            Skill Spotlight
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 capitalize sm:text-3xl">
            {decoded} Jobs for Freshers in India
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
            Discover verified entry-level job drives and internships requiring{' '}
            <strong className="font-semibold text-slate-800 capitalize">{decoded}</strong>. Direct
            links to official company career portals with zero recruitment spam.
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
        baseUrl={`/jobs/skill/${skill}`}
        searchParams={resolvedParams}
      />
    </div>
  );
}
