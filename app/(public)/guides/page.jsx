import Link from 'next/link';
import connectDB from '@/lib/db';
import Guide from '@/models/Guide';
import { formatIST } from '@/lib/time';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Career & Placement Guides for Freshers',
  description:
    'Free roadmaps, resume templates, and off-campus interview preparation guides curated for Indian college students and fresh graduates.',
  alternates: {
    canonical: `${siteConfig.url}/guides`,
  },
};

export default async function GuidesHubPage() {
  await connectDB();

  const guides = await Guide.find({ status: 'published' }).sort({ createdAt: -1 }).lean();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">Guides</span>
      </nav>

      {/* Hero Header */}
      <header className="mb-8 rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-50/70 via-white to-blue-50 p-6 shadow-xs sm:p-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            Knowledge Base
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Career Guides & Placement Playbooks
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
            Actionable strategies written by trusted mentors to help you build an ATS-friendly
            resume, crack coding assessments, and land off-campus job offers.
          </p>
        </div>
      </header>

      {/* Guides Grid */}
      {guides.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">Guides coming soon</h2>
          <p className="mt-1 text-xs text-slate-500">
            Our team is currently drafting detailed career guides. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <article
              key={guide._id.toString()}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{guide.readingTime} min read</span>
                  <span>{formatIST(guide.createdAt)}</span>
                </div>

                <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-900 hover:text-blue-600">
                  <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
                </h2>

                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                  {guide.summary}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                <span className="font-semibold text-slate-700">By {guide.postedByName}</span>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Read guide &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
