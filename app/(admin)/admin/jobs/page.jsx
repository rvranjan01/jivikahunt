'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CompanyLogo from '@/components/CompanyLogo';
import { formatWhatsAppJobMessage } from '@/lib/formatters';
import { formatIST } from '@/lib/time';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [quota, setQuota] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const refreshJobs = async (customSearch = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (customSearch) params.set('q', customSearch);

      const res = await fetch(`/api/admin/jobs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setJobs(data.jobs || []);
        if (data.quota) setQuota(data.quota);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialJobs() {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);

        const res = await fetch(`/api/admin/jobs?${params.toString()}`);
        const data = await res.json();
        if (!ignore) {
          if (res.ok) {
            setJobs(data.jobs || []);
            if (data.quota) setQuota(data.quota);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitialJobs();

    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    refreshJobs(search);
  };

  const handleCopyWhatsApp = (job) => {
    const text = formatWhatsAppJobMessage(job);
    navigator.clipboard.writeText(text);
    setCopiedId(job.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to delete the job posting "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete job.');
      }
    } catch (err) {
      alert('Network error while deleting job.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quota */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Listings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, manage, and broadcast entry-level openings and internships.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {quota && quota.limit < 1000 && (
            <span className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:inline-flex">
              Daily Quota: {quota.remaining} of {quota.limit} remaining
            </span>
          )}
          <Link
            href="/admin/jobs/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            + New Job
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'All', value: '' },
            { label: 'Published', value: 'published' },
            { label: 'Drafts', value: 'draft' },
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Unpublished', value: 'unpublished' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === tab.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or company..."
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none md:w-64"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Search
          </button>
        </form>
      </div>

      {/* Jobs Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900">No job postings found</p>
            <p className="mt-1 text-xs text-slate-500">
              Get started by publishing an entry-level opening.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/jobs/new"
                className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                + Create First Job
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3.5">Job / Company</th>
                  <th className="px-6 py-3.5">Type & Mode</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <CompanyLogo
                          logoId={job.company?.logoId}
                          name={job.company?.name}
                          size={38}
                        />
                        <div>
                          <p className="line-clamp-1 font-semibold text-slate-900">{job.title}</p>
                          <p className="text-xs text-slate-500">
                            {job.company?.name} · {job.locations?.join(', ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
                          {job.type}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
                          {job.workMode}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          job.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'draft'
                              ? 'bg-amber-100 text-amber-800'
                              : job.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatIST(job.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCopyWhatsApp(job)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          title="Copy formatted text for WhatsApp channel"
                        >
                          {copiedId === job.id ? '✓ Copied' : 'WhatsApp'}
                        </button>
                        <Link
                          href={`/admin/jobs/${job.id}/edit`}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(job.id, job.title)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
