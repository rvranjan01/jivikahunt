import Link from 'next/link';

/**
 * Accessible server-rendered pagination controls preserving all active search queries.
 *
 * @param {Object} props
 * @param {number} props.currentPage
 * @param {number} props.totalPages
 * @param {string} [props.baseUrl='/jobs']
 * @param {Record<string, any>} [props.searchParams={}]
 */
export default function Pagination({
  currentPage,
  totalPages,
  baseUrl = '/jobs',
  searchParams = {},
}) {
  if (totalPages <= 1) return null;

  /**
   * Helper to construct a URL string for a target page while keeping existing filters.
   * @param {number} page
   * @returns {string}
   */
  const getPageUrl = (page) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, val]) => {
      if (val && key !== 'page') {
        params.set(key, String(val));
      }
    });

    if (page > 1) {
      params.set('page', String(page));
    }

    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  // Generate page numbers window (e.g. 1 2 3 ... 10)
  const pages = [];
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let p = startPage; p <= endPage; p++) {
    pages.push(p);
  }

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          &larr; Previous
        </Link>
      ) : (
        <span className="inline-flex cursor-not-allowed items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-400">
          &larr; Previous
        </span>
      )}

      {/* First Page Link if not in window */}
      {startPage > 1 && (
        <>
          <Link
            href={getPageUrl(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            1
          </Link>
          {startPage > 2 && <span className="px-1 text-slate-400">...</span>}
        </>
      )}

      {/* Current Page Window */}
      {pages.map((p) => {
        const isCurrent = p === currentPage;
        return isCurrent ? (
          <span
            key={p}
            aria-current="page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-xs"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={getPageUrl(p)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            {p}
          </Link>
        );
      })}

      {/* Last Page Link if not in window */}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-1 text-slate-400">...</span>}
          <Link
            href={getPageUrl(totalPages)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          Next &rarr;
        </Link>
      ) : (
        <span className="inline-flex cursor-not-allowed items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-400">
          Next &rarr;
        </span>
      )}
    </nav>
  );
}
