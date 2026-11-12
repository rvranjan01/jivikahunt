import Link from 'next/link';
import CompanyLogo from '@/components/CompanyLogo';
import SaveJobButton from '@/components/SaveJobButton';
import { formatIST } from '@/lib/time';

const TYPE_STYLES = {
  fresher: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  intern: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  experienced: 'bg-amber-50 text-amber-700 border-amber-200',
};

const MODE_STYLES = {
  remote: 'bg-sky-50 text-sky-700 border-sky-200',
  hybrid: 'bg-purple-50 text-purple-700 border-purple-200',
  onsite: 'bg-slate-100 text-slate-700 border-slate-200',
};

/**
 * Clean, high-speed Job Card component for list views and search results.
 *
 * @param {Object} props
 * @param {Object} props.job - Job document object
 */
export default function JobCard({ job }) {
  const typeStyle = TYPE_STYLES[job.type] || TYPE_STYLES.fresher;
  const modeStyle = MODE_STYLES[job.workMode] || MODE_STYLES.onsite;
  const locationsStr = Array.isArray(job.locations) ? job.locations.join(', ') : job.locations;
  const deadlineStr = job.lastDate ? formatIST(job.lastDate) : null;

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <div>
        {/* Top Header: Logo, Company & Title */}
        <div className="flex items-start gap-4">
          <CompanyLogo
            logoId={job.company?.logoId}
            name={job.company?.name}
            size={48}
            className="rounded-xl shadow-xs"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {job.company?.name}
                </span>
                {job.featured && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Sponsored
                  </span>
                )}
              </div>
              <div className="relative z-10">
                <SaveJobButton jobId={job._id.toString()} />
              </div>
            </div>

            <h2 className="mt-1 text-base font-bold text-slate-900 group-hover:text-blue-600">
              <Link href={`/jobs/${job.slug}`} className="focus:outline-none">
                <span className="absolute inset-0" aria-hidden="true" />
                {job.title}
              </Link>
            </h2>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{locationsStr}</span>
            </div>
          </div>
        </div>

        {/* Badges / Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${typeStyle}`}
          >
            {job.type}
          </span>

          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${modeStyle}`}
          >
            {job.workMode}
          </span>

          {Array.isArray(job.batches) && job.batches.length > 0 && (
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              Batch {job.batches.join(', ')}
            </span>
          )}

          {job.salary && (
            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              {job.salary}
            </span>
          )}
        </div>
      </div>

      {/* Footer Info: Deadline & Callout */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <div>
          {deadlineStr ? (
            <span>
              Last Date: <strong className="font-semibold text-slate-700">{deadlineStr}</strong>
            </span>
          ) : (
            <span className="text-slate-400">Apply early</span>
          )}
        </div>

        <span className="font-semibold text-blue-600 transition-transform group-hover:translate-x-0.5">
          View details &rarr;
        </span>
      </div>
    </article>
  );
}
