'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import Link from 'next/link';

/**
 * URL-synchronized filter toolbar for public job listings.
 * Ensures all filter combinations generate shareable and crawlable URLs.
 */
export default function JobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentType = searchParams.get('type') || '';
  const currentMode = searchParams.get('workMode') || '';
  const currentBatch = searchParams.get('batch') || '';
  const currentLocation = searchParams.get('location') || '';
  const currentSkills = searchParams.get('skills') || '';
  const currentQ = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(currentQ);
  const [locationInput, setLocationInput] = useState(currentLocation);

  const hasActiveFilters = Boolean(
    currentType || currentMode || currentBatch || currentLocation || currentSkills || currentQ
  );

  /**
   * Pushes updated search params to the URL, always resetting to page 1.
   * @param {Record<string, string>} updates
   */
  const updateFilters = (updates) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset pagination to page 1 on filter changes
    params.delete('page');

    const destination = pathname === '/' ? '/jobs' : pathname;
    const queryStr = params.toString();

    startTransition(() => {
      router.push(queryStr ? `${destination}?${queryStr}` : destination);
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ q: searchQuery.trim(), location: locationInput.trim() });
  };

  const handleClearAll = () => {
    setSearchQuery('');
    setLocationInput('');
    startTransition(() => {
      router.push('/jobs');
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
      {/* Search Bar & Location Grid */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <input
            type="text"
            placeholder="Search title, company, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
          <svg
            className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="relative md:col-span-4">
          <input
            type="text"
            placeholder="City (e.g. Bengaluru, Pune, Remote)..."
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
          <svg
            className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
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
        </div>

        <div className="flex gap-2 md:col-span-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Searching...' : 'Search Jobs'}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Select Filter Dropdowns */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        {/* Job Type */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-type" className="text-[11px] font-semibold text-slate-500">
            Type:
          </label>
          <select
            id="filter-type"
            value={currentType}
            onChange={(e) => updateFilters({ type: e.target.value })}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="fresher">Fresher</option>
            <option value="intern">Internship</option>
            <option value="experienced">Experienced</option>
          </select>
        </div>

        {/* Work Mode */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-workmode" className="text-[11px] font-semibold text-slate-500">
            Work Mode:
          </label>
          <select
            id="filter-workmode"
            value={currentMode}
            onChange={(e) => updateFilters({ workMode: e.target.value })}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </div>

        {/* Batch Year */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-batch" className="text-[11px] font-semibold text-slate-500">
            Batch:
          </label>
          <select
            id="filter-batch"
            value={currentBatch}
            onChange={(e) => updateFilters({ batch: e.target.value })}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Batches</option>
            <option value="2027">2027</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
        </div>

        {/* Crawlable Quick Links for Search Engines and Fast Clicking */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <span className="text-[11px] text-slate-400">Popular:</span>
          <Link
            href="/jobs?type=fresher"
            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600"
          >
            Freshers
          </Link>
          <Link
            href="/jobs?type=intern"
            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600"
          >
            Internships
          </Link>
          <Link
            href="/jobs?workMode=remote"
            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600"
          >
            Remote
          </Link>
        </div>
      </div>
    </div>
  );
}
