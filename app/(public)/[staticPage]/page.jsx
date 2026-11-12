import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getStaticPageContent } from '@/lib/markdown';

const VALID_STATIC_PAGES = ['about', 'contact', 'disclaimer', 'privacy', 'privacy-policy'];

/**
 * Metadata generator for static informational and policy pages.
 *
 * @param {Object} props
 * @param {Promise<{ staticPage: string }>} props.params
 * @returns {Promise<import('next').Metadata>}
 */
export async function generateMetadata({ params }) {
  const { staticPage } = await params;
  if (!VALID_STATIC_PAGES.includes(staticPage.toLowerCase())) {
    return { title: 'Page Not Found' };
  }

  const content = getStaticPageContent(staticPage);
  if (!content) return { title: 'Page Not Found' };

  return {
    title: content.title,
    description: `Official ${content.title} for JivikaHunt — Verified Job Board for Freshers & Interns.`,
  };
}

/**
 * Public static page renderer powered by safe Markdown parser & HTML sanitizer.
 *
 * @param {Object} props
 * @param {Promise<{ staticPage: string }>} props.params
 */
export default async function StaticPage({ params }) {
  const { staticPage } = await params;

  if (!VALID_STATIC_PAGES.includes(staticPage.toLowerCase())) {
    notFound();
  }

  const content = getStaticPageContent(staticPage);
  if (!content) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">{content.title}</span>
      </nav>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10">
        {/* Render safe sanitized HTML */}
        <div
          className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-700 sm:text-sm [&_a]:text-blue-600 [&_a]:underline [&_h1]:text-2xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-slate-900 sm:[&_h1]:text-3xl [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-slate-100 [&_h2]:pb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 [&_hr]:my-8 [&_hr]:border-slate-200 [&_li]:my-1 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
      </article>
    </div>
  );
}
