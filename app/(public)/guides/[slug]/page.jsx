import { notFound } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/db';
import Guide from '@/models/Guide';
import User from '@/models/User';
import AuthorBox from '@/components/AuthorBox';
import { renderMarkdown } from '@/lib/markdown';
import { formatIST } from '@/lib/time';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  await connectDB();

  const guide = await Guide.findOne({ slug: slug.toLowerCase(), status: 'published' }).lean();

  if (!guide) {
    return { title: 'Guide Not Found', robots: { index: false, follow: false } };
  }

  const canonicalUrl = `${siteConfig.url}/guides/${guide.slug}`;

  return {
    title: guide.title,
    description: guide.summary,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: guide.title,
      description: guide.summary,
      url: canonicalUrl,
      type: 'article',
      publishedTime: guide.createdAt ? new Date(guide.createdAt).toISOString() : undefined,
      modifiedTime: guide.updatedAt ? new Date(guide.updatedAt).toISOString() : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.summary,
    },
  };
}

export default async function GuideReaderPage({ params }) {
  const { slug } = await params;
  await connectDB();

  const guide = await Guide.findOne({ slug: slug.toLowerCase(), status: 'published' }).lean();

  if (!guide) {
    notFound();
  }

  // Lookup author details (strictly excluding email)
  let author = {
    displayName: guide.postedByName || 'JivikaHunt Curator',
    bio: '',
    photoId: null,
  };

  if (guide.createdBy) {
    const user = await User.findById(guide.createdBy).select('displayName bio photoId').lean();
    if (user) {
      author = {
        displayName: user.displayName || guide.postedByName,
        bio: user.bio || '',
        photoId: user.photoId || null,
      };
    }
  }

  // Find other published guides
  const otherGuides = await Guide.find({
    status: 'published',
    _id: { $ne: guide._id },
  })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const sanitizedHtml = renderMarkdown(guide.body);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.summary,
    datePublished: guide.createdAt
      ? new Date(guide.createdAt).toISOString()
      : new Date().toISOString(),
    dateModified: guide.updatedAt
      ? new Date(guide.updatedAt).toISOString()
      : new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: author.displayName,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span>/</span>
        <Link href="/guides" className="hover:text-blue-600">
          Guides
        </Link>
        <span>/</span>
        <span className="truncate font-semibold text-slate-800">{guide.title}</span>
      </nav>

      {/* Article Container */}
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10">
        <header className="border-b border-slate-100 pb-6">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{guide.readingTime} min read</span>
            <span>•</span>
            <span>Published on {formatIST(guide.createdAt)}</span>
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {guide.title}
          </h1>

          <p className="mt-3 text-sm leading-relaxed font-medium text-slate-600">{guide.summary}</p>
        </header>

        {/* Sanitized Markdown Body */}
        <div
          className="prose prose-slate mt-8 max-w-none text-xs leading-relaxed text-slate-700 sm:text-sm [&_a]:text-blue-600 [&_a]:underline [&_code]:font-mono [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-slate-100 [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_li]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-4 [&_pre]:rounded-2xl [&_pre]:bg-slate-900 [&_pre]:p-4 [&_pre]:text-slate-100 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </article>

      {/* Author Box */}
      <div className="mt-8">
        <AuthorBox author={author} />
      </div>

      {/* Related Guides */}
      {otherGuides.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-base font-bold text-slate-900">More Career Guides</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {otherGuides.map((item) => (
              <div
                key={item._id.toString()}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-300"
              >
                <div className="text-[10px] text-slate-400">{item.readingTime} min read</div>
                <h3 className="mt-1 text-xs font-bold text-slate-900 hover:text-blue-600">
                  <Link href={`/guides/${item.slug}`}>{item.title}</Link>
                </h3>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Article Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </div>
  );
}
