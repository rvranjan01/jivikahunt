'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatISTDateTime } from '@/lib/time';

/**
 * Admin and Contributor Guides management view.
 */
export default function AdminGuidesPage() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/guides');
      if (res.ok) {
        const data = await res.json();
        setGuides(data.guides || []);
      }
    } catch {
      setActionError('Failed to load career guides.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/admin/guides');
        if (!ignore && res.ok) {
          const data = await res.json();
          setGuides(data.guides || []);
        }
      } catch {
        if (!ignore) setActionError('Failed to load career guides.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/guides/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionSuccess(`Guide "${title}" deleted successfully.`);
        fetchGuides();
      } else {
        const data = await res.json();
        setActionError(data.error || 'Failed to delete guide.');
      }
    } catch {
      setActionError('Network error while deleting guide.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Career Guides</h1>
          <p className="mt-1 text-xs text-slate-500">
            Author and publish student career advice, resume templates, and placement roadmaps.
          </p>
        </div>

        <Link
          href="/admin/guides/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
        >
          <span>+ Write New Guide</span>
        </Link>
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

      {/* Guides Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading guides...</div>
        ) : guides.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No guides found. Click <strong>+ Write New Guide</strong> to author your first article.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Read Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created (IST)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guides.map((guide) => (
                  <tr key={guide._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/guides/${guide.slug}`}
                        target="_blank"
                        className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {guide.title}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 max-w-sm text-[11px] text-slate-500">
                        {guide.summary}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">{guide.postedByName}</td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                      {guide.readingTime} min read
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                          guide.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {guide.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                      {formatISTDateTime(guide.createdAt)}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/guides/${guide._id}/edit`}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(guide._id, guide.title)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
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
