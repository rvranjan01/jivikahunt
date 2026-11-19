'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    displayName: '',
    bio: '',
    photoId: null,
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/admin/profile');
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.user.name || '',
            email: data.user.email || '',
            role: data.user.role || '',
            displayName: data.user.displayName || '',
            bio: data.user.bio || '',
            photoId: data.user.photoId || null,
          });
        } else {
          setError('Failed to load profile.');
        }
      } catch (err) {
        setError('Network error while loading profile.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setMessage('');
    setUploading(true);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setFormData((prev) => ({ ...prev, photoId: data.imageId }));
      setMessage('Photo uploaded! Click "Save Changes" to apply.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photoId: null }));
    setMessage('Photo removed. Click "Save Changes" to apply.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: formData.displayName,
          bio: formData.bio,
          photoId: formData.photoId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your public curator presence and author details.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        {/* Profile Picture */}
        <div>
          <label className="block text-xs font-semibold tracking-wider text-slate-700 uppercase">
            Profile Photo
          </label>
          <div className="mt-2 flex items-center gap-4">
            {formData.photoId ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-200">
                <Image
                  src={`/img/${formData.photoId}`}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xl font-bold text-slate-500">
                {formData.displayName?.slice(0, 2).toUpperCase() || 'JH'}
              </div>
            )}

            <div className="space-y-2">
              <label className="inline-block cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50">
                {uploading ? 'Processing...' : 'Upload New Photo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={uploading || saving}
                  className="hidden"
                />
              </label>

              {formData.photoId && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="block text-xs text-rose-600 hover:text-rose-800"
                >
                  Remove photo
                </button>
              )}
              <p className="text-[11px] text-slate-500">Max 1 MB. Resized to 256x256 WebP.</p>
            </div>
          </div>
        </div>

        {/* Readonly Identity */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Email Address (Fixed)
            </label>
            <input
              type="text"
              readOnly
              value={formData.email}
              className="mt-1 block w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Role
            </label>
            <input
              type="text"
              readOnly
              value={formData.role}
              className="mt-1 block w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 capitalize"
            />
          </div>
        </div>

        {/* Editable Display Name */}
        <div>
          <label
            htmlFor="displayName"
            className="block text-xs font-semibold tracking-wider text-slate-700 uppercase"
          >
            Display Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="displayName"
            type="text"
            required
            minLength={2}
            maxLength={40}
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            placeholder="e.g. Priya Sharma"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Displayed on job detail author boxes (2 to 40 characters).
          </p>
        </div>

        {/* Editable Bio */}
        <div>
          <label
            htmlFor="bio"
            className="block text-xs font-semibold tracking-wider text-slate-700 uppercase"
          >
            Curator Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            maxLength={250}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            placeholder="Short bio about your curation focus..."
          />
          <p className="mt-1 text-right text-[11px] text-slate-400">
            {formData.bio.length} / 250 characters
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
