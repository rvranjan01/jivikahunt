'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function EditJobPage({ params }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
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
  const [status, setStatus] = useState('published');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadJob() {
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}`);
        const data = await res.json();

        if (!ignore) {
          if (res.ok && data.job) {
            const j = data.job;
            setTitle(j.title || '');
            setCompanyName(j.company?.name || '');
            setCompanyDescription(j.company?.description || '');
            setLogoId(j.company?.logoId || '');
            if (j.company?.logoId) {
              setLogoPreviewUrl(`/img/${j.company.logoId}`);
            }
            setType(j.type || 'fresher');
            setWorkMode(j.workMode || 'onsite');
            setLocations(j.locations?.join(', ') || '');
            setBatches(j.batches?.join(', ') || '');
            setSalary(j.salary || '');
            setSkills(j.skills?.join(', ') || '');
            setSummary(j.summary || '');
            setResponsibilities(j.responsibilities?.join('\n') || '');
            setEligibility(j.eligibility?.join('\n') || '');
            setApplyUrl(j.applyUrl || '');
            if (j.lastDate) {
              setLastDate(new Date(j.lastDate).toISOString().split('T')[0]);
            }
            setStatus(j.status || 'published');
          } else {
            setError(data.error || 'Failed to load job posting.');
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError('Network error loading job details.');
          setLoading(false);
        }
      }
    }

    loadJob();
    return () => {
      ignore = true;
    };
  }, [jobId]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      status,
    };

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update job posting.');
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

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading job editor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Job Listing</h1>
          <p className="mt-1 text-sm text-slate-500">Update job details, criteria, or status.</p>
        </div>
        <Link
          href="/admin/jobs"
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Jobs
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-900">
            Job & Company Information
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Job Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Company Logo</label>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Job Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="fresher">Fresher</option>
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

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="unpublished">Unpublished</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Locations *</label>
              <input
                type="text"
                required
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Eligible Batches</label>
              <input
                type="text"
                value={batches}
                onChange={(e) => setBatches(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Summary * (min 40 chars)
            </label>
            <textarea
              rows={3}
              required
              minLength={40}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Official Apply URL *
            </label>
            <input
              type="url"
              required
              value={applyUrl}
              onChange={(e) => setApplyUrl(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Last Date to Apply</label>
            <input
              type="date"
              value={lastDate}
              onChange={(e) => setLastDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none sm:w-64"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Link
              href="/admin/jobs"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
