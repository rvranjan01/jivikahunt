'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Guide authoring form for contributors and administrators.
 */
export default function NewGuidePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    body: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (targetStatus) => {
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: targetStatus,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/admin/guides');
      } else {
        setErrorMsg(data.error || 'Failed to save guide.');
      }
    } catch {
      setErrorMsg('A network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/admin/guides" className="hover:text-blue-600">
              Career Guides
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">New Guide</span>
          </nav>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Write New Guide</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('draft')}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('published')}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
          >
            Publish Now
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
            placeholder="e.g. How to Build an ATS-Friendly Resume as a College Fresher"
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
            placeholder="A concise 1-2 sentence overview explaining what students will learn from this article..."
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="guide-body" className="block text-xs font-bold text-slate-700">
            Guide Content (Markdown) <span className="text-rose-500">*</span>
          </label>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Write using standard Markdown (`## Headings`, `- Bullet points`, `**bold**`,
            `[Links](url)`).
          </p>
          <textarea
            id="guide-body"
            rows={14}
            required
            placeholder="Write your article content here in Markdown format..."
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
      </form>
    </div>
  );
}
