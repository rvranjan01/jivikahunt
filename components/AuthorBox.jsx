import siteConfig from '@/lib/siteConfig';
import CompanyLogo from '@/components/CompanyLogo';

/**
 * Contributor author box rendered on the job detail page.
 * Strictly adheres to privacy guidelines: NEVER exposes a contributor's personal email address.
 * Displays only public display name, public bio, photo (or initials), and shared site contact email.
 *
 * @param {Object} props
 * @param {Object} props.author
 * @param {string} props.author.displayName
 * @param {string} [props.author.bio]
 * @param {string} [props.author.photoId]
 */
export default function AuthorBox({ author }) {
  const name = author?.displayName || 'JivikaHunt Team';
  const bio =
    author?.bio ||
    'Verified member of the JivikaHunt team curating trusted entry-level opportunities and internships for college students across India.';

  return (
    <aside
      aria-label="Job curator details"
      className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {/* Circular Avatar / Initials */}
        <div className="shrink-0">
          <CompanyLogo
            logoId={author?.photoId}
            name={name}
            size={64}
            className="!rounded-full shadow-sm"
          />
        </div>

        {/* Curator Profile Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">{name}</h4>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
              JivikaHunt Curator
            </span>
          </div>

          <p className="mt-1 text-xs leading-relaxed text-slate-600">{bio}</p>

          <p className="mt-3 text-xs text-slate-500">
            Have questions or spotted an issue with this listing? Contact our team at{' '}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-semibold text-blue-600 hover:underline"
            >
              {siteConfig.contactEmail}
            </a>
          </p>
        </div>
      </div>
    </aside>
  );
}
