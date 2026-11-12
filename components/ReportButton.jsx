'use client';

import { useState } from 'react';
import ReportJobModal from './ReportJobModal';

/**
 * Interactive button that opens the broken link / issue report modal.
 *
 * @param {Object} props
 * @param {string} props.jobId
 * @param {string} props.jobTitle
 * @param {string} props.companyName
 */
export default function ReportButton({ jobId, jobTitle, companyName }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        id="report-broken-link-btn"
        onClick={() => setModalOpen(true)}
        title="Report broken application link, scam, or incorrect details"
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
      >
        Report Broken Link
      </button>

      <ReportJobModal
        jobId={jobId}
        jobTitle={jobTitle}
        companyName={companyName}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
