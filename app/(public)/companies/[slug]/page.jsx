import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLandingPageJobs } from '@/lib/publicJobs';
import JobCard from '@/components/JobCard';
import CompanyLogo from '@/components/CompanyLogo';
import Pagination from '@/components/Pagination';
import AdSlot from '@/components/AdSlot';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

/**
 * Metadata generator for individual company landing pages.
 *
 * @param {Object} props
 * @param {Promise<{ slug: string }>} props.params
 * @returns {Promise<import('next').Metadata>}
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { jobs, total } = await getLandingPageJobs('company', slug, 1, 1);

  if (total === 0 || jobs.length === 0) {
    return { title: 'Company Not Found', robots: { index: false, follow: false } };
  }

  const company = jobs[0].company;
  const title = `${company?.name} Jobs for Freshers & Interns | ${siteConfig.name}`;
  const description =
    company?.description ||
    `Browse all active job openings and internships at ${company?.name} for freshers and students in India. Apply directly.`;

  return {
    title,
    description: description.slice(0, 160),
    alternates: {
      canonical: `${siteConfig.url}/companies/${slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Company Landing Page (/companies/[slug]) aggregating all active openings for an employer.
 *
 * @param {Object} props
 * @param {Promise<{ slug: string }>} props.params
 * @param {Promise<Record<string, string | string[] | undefined>>} props.searchParams
 */
export default async function CompanyLandingPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedParams = await searchParams;
  const page = parseInt(String(resolvedParams?.page || '1'), 10) || 1;

  const { jobs, total, totalPages } = await getLandingPageJobs('company', slug, page);

  if (total === 0 || jobs.length === 0) {
    notFound();
  }

  const company = jobs[0].company;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span>/</span>
        <span className="text-slate-400">Companies</span>
        <span>/</span>
        <span className="font-semibold text-slate-800">{company?.name}</span>
      </nav>

      {/* Company Header Card */}
      <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <CompanyLogo
            logoId={company?.logoId}
            name={company?.name}
            size={72}
            className="rounded-2xl shadow-sm"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {company?.name}
              </h1>
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                {total} Active {total === 1 ? 'Opening' : 'Openings'}
              </span>
            </div>

            {company?.description && (
              <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {company.description}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Openings Feed */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Current Openings at {company?.name}</h2>
        <span className="text-xs text-slate-500">
          Page {page} of {totalPages}
        </span>
      </div>

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
        baseUrl={`/companies/${slug}`}
        searchParams={resolvedParams}
      />
    </div>
  );
}
