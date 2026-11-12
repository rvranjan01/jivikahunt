'use client';

import { useState } from 'react';

/**
 * Public modal allowing visitors to report broken career links, expired roles, or scam postings.
 *
 * @param {Object} props
 * @param {string} props.jobId
 * @param {string} props.jobTitle
 * @param {string} props.companyName
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 */
export default function ReportJobModal({ jobId, jobTitle, companyName, isOpen, onClose }) {
  const [reason, setReason] = useState('broken_link');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          reason,
          note: note.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Report submitted successfully.');
        setTimeout(() => {
          onClose();
          setSuccessMsg('');
          setNote('');
        }, 2000);
      } else {
        setErrorMsg(data.error || 'Failed to submit report.');
      }
    } catch {
      setErrorMsg('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 id="report-modal-title" className="text-base font-bold text-slate-900">
              Report Listing Issue
            </h3>
            <p className="text-xs text-slate-500">
              {jobTitle} at {companyName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="mt-3 text-xs font-semibold text-emerald-700">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="report-reason" className="block text-xs font-bold text-slate-700">
                What is the issue? <span className="text-rose-500">*</span>
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="broken_link">Broken or dead application link (404/Error)</option>
                <option value="expired">Job is already closed / expired</option>
                <option value="scam">Suspicious listing or asking for money/fees</option>
                <option value="other">Incorrect details or eligibility requirements</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="report-note" className="block text-xs font-bold text-slate-700">
                  Additional Details (Optional)
                </label>
                <span className="text-[10px] text-slate-400">{note.length}/300</span>
              </div>
              <textarea
                id="report-note"
                rows={3}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Briefly describe what went wrong (e.g., career page says vacancy filled)..."
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
