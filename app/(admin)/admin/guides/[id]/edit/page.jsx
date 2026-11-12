'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Guide editor page for modifying existing articles.
 */
export default function EditGuidePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    body: '',
    status: 'draft',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let ignore = false;
    async function fetchGuide() {
      try {
        const res = await fetch(`/api/admin/guides/${id}`);
        if (!ignore && res.ok) {
          const data = await res.json();
          if (data.guide) {
            setFormData({
              title: data.guide.title || '',
              summary: data.guide.summary || '',
              body: data.guide.body || '',
              status: data.guide.status || 'draft',
            });
          }
        }
      } catch {
        if (!ignore) setErrorMsg('Failed to load guide details.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (id) fetchGuide();
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleSubmit = async (targetStatus) => {
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/guides/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: targetStatus || formData.status,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/admin/guides');
      } else {
        setErrorMsg(data.error || 'Failed to update guide.');
      }
    } catch {
      setErrorMsg('A network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading guide...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/admin/guides" className="hover:text-blue-600">
              Career Guides
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Edit Guide</span>
          </nav>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit Guide</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('draft')}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('published')}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
          >
            Update & Publish
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      <form className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div>
          <label htmlFor="guide-title" className="block text-xs font-bold text-slate-700">
            Guide Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="guide-title"
            type="text"
            required
            maxLength={150}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="guide-summary" className="block text-xs font-bold text-slate-700">
              Summary (Overview for listings & meta description){' '}
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400">{formData.summary.length}/500</span>
          </div>
          <textarea
            id="guide-summary"
            rows={3}
            required
            minLength={30}
            maxLength={500}
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="guide-body" className="block text-xs font-bold text-slate-700">
            Guide Content (Markdown) <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="guide-body"
            rows={14}
            required
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
      </form>
    </div>
  );
}
