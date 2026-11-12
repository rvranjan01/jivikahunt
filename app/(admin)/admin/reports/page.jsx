'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatISTDateTime } from '@/lib/time';

const REASON_LABELS = {
  broken_link: { label: 'Broken Link', class: 'bg-rose-50 text-rose-700 border-rose-200' },
  expired: { label: 'Expired Vacancy', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  scam: { label: 'Potential Scam', class: 'bg-purple-50 text-purple-700 border-purple-200' },
  other: { label: 'Other Issue', class: 'bg-slate-100 text-slate-700 border-slate-200' },
};

/**
 * Admin moderation queue for public reports on broken links and suspicious job postings.
 */
export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchReports = async (status) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {
      setActionError('Failed to load reports queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/reports?status=${statusFilter}`);
        if (!ignore && res.ok) {
          const data = await res.json();
          setReports(data.reports || []);
        }
      } catch {
        if (!ignore) setActionError('Failed to load reports queue.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  const handleToggleStatus = async (reportId, currentStatus) => {
    setActionError('');
    setActionSuccess('');
    const newStatus = currentStatus === 'open' ? 'resolved' : 'open';

    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setActionSuccess(`Report successfully marked as ${newStatus}.`);
        fetchReports(statusFilter);
      } else {
        const data = await res.json();
        setActionError(data.error || 'Failed to update report status.');
      }
    } catch {
      setActionError('Network error while updating report.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Broken Links & Reports
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Review and moderate community reports regarding broken career links, expired roles, or
            fraudulent postings.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          {['open', 'resolved', 'all'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setStatusFilter(tab);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          {actionSuccess}
        </div>
      )}

      {/* Reports Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No {statusFilter !== 'all' ? statusFilter : ''} reports found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Reported Job</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">User Note</th>
                  <th className="px-4 py-3">Date (IST)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => {
                  const job = report.jobId;
                  const reasonInfo = REASON_LABELS[report.reason] || REASON_LABELS.other;

                  return (
                    <tr key={report._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        {job ? (
                          <div>
                            <Link
                              href={`/jobs/${job.slug}`}
                              target="_blank"
                              className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                            >
                              {job.title}
                            </Link>
                            <p className="text-[11px] text-slate-500">{job.company?.name}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Job deleted</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${reasonInfo.class}`}
                        >
                          {reasonInfo.label}
                        </span>
                      </td>

                      <td className="max-w-xs px-4 py-3.5 text-slate-600">
                        {report.note ? (
                          <p className="truncate" title={report.note}>
                            {report.note}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                        {formatISTDateTime(report.createdAt)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                            report.status === 'open'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {job && (
                            <Link
                              href={`/admin/jobs/${job._id}/edit`}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                            >
                              Edit Job
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(report._id, report.status)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold shadow-xs transition-colors ${
                              report.status === 'open'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {report.status === 'open' ? 'Mark Resolved' : 'Reopen'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
