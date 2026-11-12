'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CHATGPT_EXTRACTION_PROMPT from '@/lib/chatgptPrompt';

export default function NewJobPage() {
  const router = useRouter();

  // Form Fields
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [logoId, setLogoId] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [type, setType] = useState('fresher');
  const [workMode, setWorkMode] = useState('onsite');
  const [locations, setLocations] = useState('');
  const [batches, setBatches] = useState('');
  const [salary, setSalary] = useState('');
  const [skills, setSkills] = useState('');
  const [summary, setSummary] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [publishAt, setPublishAt] = useState('');

  // UI state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('Logo file must be under 1 MB.');
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.image) {
        setLogoId(data.image.id);
        setLogoPreviewUrl(data.image.url);
      } else {
        alert(data.error || 'Failed to upload logo.');
      }
    } catch (err) {
      alert('Network error uploading logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(CHATGPT_EXTRACTION_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleSubmit = async (targetStatus, force = false) => {
    setError('');
    setSaving(true);

    const locationsArray = locations
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const batchesArray = batches
      .split(',')
      .map((b) => parseInt(b.trim(), 10))
      .filter((b) => !isNaN(b) && b > 2000);

    const skillsArray = skills
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    const responsibilitiesArray = responsibilities
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const eligibilityArray = eligibility
      .split('\n')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const payload = {
      title,
      company: {
        name: companyName,
        logoId: logoId || null,
        description: companyDescription,
      },
      type,
      workMode,
      locations: locationsArray,
      batches: batchesArray,
      salary,
      skills: skillsArray,
      summary,
      responsibilities: responsibilitiesArray,
      eligibility: eligibilityArray,
      applyUrl,
      lastDate: lastDate || null,
      status: targetStatus,
      publishAt: targetStatus === 'scheduled' && publishAt ? publishAt : null,
      force,
    };

    try {
      const res = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.isDuplicate) {
        setDuplicateWarning(data.warning);
        setSaving(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Failed to save job posting.');
        setSaving(false);
        return;
      }

      router.push('/admin/jobs');
      router.refresh();
    } catch (err) {
      setError('Network connection error. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Post a New Job</h1>
          <p className="mt-1 text-sm text-slate-500">
            Publish verified freshers and internship opportunities.
          </p>
        </div>
        <Link
          href="/admin/jobs"
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Cancel
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Duplicate Warning Alert */}
      {duplicateWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-800">Duplicate Listing Detected</p>
          <p className="mt-1 text-xs text-amber-700">{duplicateWarning}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleSubmit('published', true)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Publish Anyway (Override)
            </button>
            <button
              onClick={() => setDuplicateWarning(null)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Job Form */}
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-900">
              1. Basic Information
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Job Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Graduate Software Engineer"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Infosys"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Company Logo (Max 160x160, &lt; 1MB)
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="block w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-blue-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {logoPreviewUrl && (
                    <Image
                      src={logoPreviewUrl}
                      alt="Logo preview"
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 rounded-md border border-slate-200 object-contain"
                    />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Company Description (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={1000}
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                placeholder="Short background on company culture or business..."
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-900">
              2. Job Details & Eligibility
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Job Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="fresher">Fresher (0 - 1 Years)</option>
                  <option value="intern">Internship</option>
                  <option value="experienced">Experienced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Work Mode *</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Locations (comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={locations}
                  onChange={(e) => setLocations(e.target.value)}
                  placeholder="e.g. Bengaluru, Pune, Hyderabad"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Eligible Batches (comma separated years)
                </label>
                <input
                  type="text"
                  value={batches}
                  onChange={(e) => setBatches(e.target.value)}
                  placeholder="e.g. 2024, 2025, 2026"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Salary / Stipend
                </label>
                <input
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. ₹25,000/month or 6 - 8 LPA"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Skills (comma separated keywords)
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. react, nodejs, sql, python"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Summary (Min 40 characters) *
              </label>
              <textarea
                rows={3}
                required
                minLength={40}
                maxLength={2000}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Concise overview explaining the role, department, and opportunity..."
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {summary.length} / 2000 characters (min 40)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Responsibilities (One bullet per line)
              </label>
              <textarea
                rows={3}
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                placeholder="Develop features using React&#10;Collaborate with product designers&#10;Participate in code reviews"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Eligibility & Qualifications (One per line)
              </label>
              <textarea
                rows={3}
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                placeholder="B.Tech / B.E in CS / IT&#10;No active backlogs&#10;Strong communication skills"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-900">
              3. Application Link & Deadlines
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Official Careers Apply Link * (HTTPS only, shorteners blocked)
              </label>
              <input
                type="url"
                required
                value={applyUrl}
                onChange={(e) => setApplyUrl(e.target.value)}
                placeholder="https://careers.company.com/jobs/12345"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                Must be an official company portal link. Shorteners like bit.ly are strictly
                prohibited.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Last Date to Apply (Optional)
                </label>
                <input
                  type="date"
                  value={lastDate}
                  onChange={(e) => setLastDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">Expires at 23:59:59 IST on this day.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Schedule Release Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: ChatGPT Extraction Prompt Panel & Publish Actions */}
        <div className="space-y-6">
          {/* Action Card */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Publish Actions</h3>
            <p className="text-xs text-slate-500">
              Contributors publish immediately with zero approval delay.
            </p>

            <button
              onClick={() => handleSubmit('published')}
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Publishing...' : 'Publish Immediately'}
            </button>

            <button
              onClick={() => handleSubmit('draft')}
              disabled={saving}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Save as Draft
            </button>

            {publishAt && (
              <button
                onClick={() => handleSubmit('scheduled')}
                disabled={saving}
                className="w-full rounded-lg border border-purple-300 bg-purple-50 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
              >
                Schedule Release
              </button>
            )}
          </div>

          {/* ChatGPT Helper Panel */}
          <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-blue-950">ChatGPT Extraction Prompt</h3>
              <span className="rounded-md bg-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-900">
                AI Helper
              </span>
            </div>
            <p className="text-xs leading-relaxed text-blue-800">
              Found a job post on LinkedIn or careers portal? Copy this extraction prompt, paste it
              into ChatGPT along with the raw text, and copy-paste the clean fields into this form!
            </p>

            <button
              onClick={handleCopyPrompt}
              className="w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              {copiedPrompt ? '✓ Prompt Copied to Clipboard!' : 'Copy ChatGPT Prompt'}
            </button>

            <div className="mt-2 rounded-lg border border-blue-200 bg-white p-3">
              <pre className="max-h-40 overflow-y-auto font-mono text-[10px] leading-tight whitespace-pre-wrap text-slate-700">
                {CHATGPT_EXTRACTION_PROMPT}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
