'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'jh_saved_jobs';

/**
 * Retrieves the list of saved job IDs from localStorage.
 * @returns {string[]}
 */
export function getSavedJobIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Toggles a job ID in localStorage.
 * @param {string} jobId
 * @returns {boolean} True if now saved, false if removed
 */
export function toggleSavedJobId(jobId) {
  if (typeof window === 'undefined') return false;
  try {
    const current = getSavedJobIds();
    const exists = current.includes(jobId);
    const updated = exists ? current.filter((id) => id !== jobId) : [...current, jobId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('jh_saved_jobs_updated'));
    return !exists;
  } catch {
    return false;
  }
}

/**
 * Interactive bookmark button allowing visitors to save job listings in localStorage.
 * Requires zero account signup and preserves privacy.
 *
 * @param {Object} props
 * @param {string} props.jobId
 * @param {string} [props.className='']
 * @param {boolean} [props.showLabel=false]
 */
export default function SaveJobButton({ jobId, className = '', showLabel = false }) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const checkState = () => {
      const saved = getSavedJobIds();
      setIsSaved(saved.includes(jobId));
    };

    checkState();
    window.addEventListener('jh_saved_jobs_updated', checkState);
    return () => window.removeEventListener('jh_saved_jobs_updated', checkState);
  }, [jobId]);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextSaved = toggleSavedJobId(jobId);
    setIsSaved(nextSaved);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isSaved ? 'Remove from saved jobs' : 'Save this job'}
      title={isSaved ? 'Remove from saved jobs' : 'Save for later (no login required)'}
      className={`inline-flex items-center gap-1.5 rounded-xl p-2 text-xs font-semibold transition-all active:scale-90 ${
        isSaved
          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
      } ${className}`}
    >
      <svg
        className="h-4 w-4"
        fill={isSaved ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={isSaved ? '0' : '2'}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {showLabel && <span>{isSaved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
