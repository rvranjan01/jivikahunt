'use client';

import { useState, useEffect } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // New contributor form state
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (err) {
      setError('Network error loading users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (!ignore) {
          if (res.ok) {
            setUsers(data.users || []);
          } else {
            setError(data.error || 'Failed to load users');
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError('Network error loading users.');
          setLoading(false);
        }
      }
    }

    loadInitialUsers();

    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user status.');
      }
    } catch (err) {
      alert('Network error updating user status.');
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, displayName, email, bio }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create contributor.');
        setInviting(false);
        return;
      }

      setInviteResult({
        email: data.user.email,
        temporaryPassword: data.temporaryPassword,
      });

      // Reset form
      setName('');
      setDisplayName('');
      setEmail('');
      setBio('');
      refreshUsers();
    } catch (err) {
      setError('Network error inviting contributor.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Contributors & Team Access
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage authorized staff members permitted to publish jobs on JivikaHunt.
          </p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setInviteResult(null);
            setError('');
          }}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
        >
          + Invite Contributor
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading contributors...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3.5">Contributor</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{u.displayName}</div>
                      <div className="text-xs text-slate-500">{u.name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStatus(u.id, u.isActive)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            u.isActive
                              ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Contributor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Invite New Contributor</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-lg font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {inviteResult ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-800">
                    Contributor Created Successfully!
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    An email invitation has been dispatched (and logged locally). You can also share
                    these temporary credentials directly:
                  </p>
                  <div className="mt-3 rounded-lg border border-emerald-100 bg-white p-3 font-mono text-xs text-slate-800">
                    <p>
                      <strong>Email:</strong> {inviteResult.email}
                    </p>
                    <p className="mt-1">
                      <strong>Temp Password:</strong> {inviteResult.temporaryPassword}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    placeholder="Aditi Sharma"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Public Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    placeholder="Aditi S."
                  />
                  <p className="mt-0.5 text-xs text-slate-400">
                    Displayed on job postings and the author box.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    placeholder="aditi@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Short Bio (Optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={250}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    placeholder="Tech enthusiast curating early-career tech jobs."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {inviting ? 'Creating...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
