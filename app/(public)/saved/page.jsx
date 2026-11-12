'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import JobCard from '@/components/JobCard';
import { getSavedJobIds } from '@/components/SaveJobButton';

/**
 * Saved Jobs page (/saved) powered completely by client-side browser localStorage.
 * Zero user login or server tracking required.
 */
export default function SavedJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState([]);

  const loadSavedJobs = async (ids) => {
    if (!ids || ids.length === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/jobs/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // Network error fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      const ids = getSavedJobIds();
      if (!ignore) {
        setSavedIds(ids);
        await loadSavedJobs(ids);
      }
    }
    init();

    const handleUpdate = () => {
      const nextIds = getSavedJobIds();
      if (!ignore) {
        setSavedIds(nextIds);
        loadSavedJobs(nextIds);
      }
    };

    window.addEventListener('jh_saved_jobs_updated', handleUpdate);
    return () => {
      ignore = true;
      window.removeEventListener('jh_saved_jobs_updated', handleUpdate);
    };
  }, []);

  const handleClearAll = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jh_saved_jobs');
      window.dispatchEvent(new Event('jh_saved_jobs_updated'));
      setJobs([]);
      setSavedIds([]);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">Saved Jobs</span>
      </nav>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            My Saved Jobs
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Bookmarked opportunities stored locally on this device. No login or tracking required.
          </p>
        </div>

        {jobs.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="self-start rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 hover:text-rose-600"
          >
            Clear All Saved
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
          Loading your saved jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">No saved jobs yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Browse jobs and tap the heart icon on any card to save listings here for quick access
            later.
          </p>
          <div className="mt-6">
            <Link
              href="/jobs"
              className="inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700"
            >
              Explore Latest Jobs &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500">
            {jobs.length} saved {jobs.length === 1 ? 'position' : 'positions'}
          </div>
          {jobs.map((job) => (
            <JobCard key={job._id.toString()} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
