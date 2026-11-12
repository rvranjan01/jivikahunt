import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.displayName}!
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Logged in as <strong className="capitalize">{user?.role}</strong> · Post limit: 30
            jobs/day
          </p>
        </div>
        <div className="mt-4 flex gap-3 sm:mt-0">
          <Link
            href="/admin/jobs/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            + Post New Job
          </Link>
          {isAdmin && (
            <Link
              href="/admin/users"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              Manage Users
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">My Listings</p>
          <p className="mt-2 text-3xl font-black text-slate-900">0</p>
          <p className="mt-1 text-xs text-slate-400">Total jobs authored by you</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Views</p>
          <p className="mt-2 text-3xl font-black text-slate-900">0</p>
          <p className="mt-1 text-xs text-slate-400">Combined reader impressions</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Drafts</p>
          <p className="mt-2 text-3xl font-black text-slate-900">0</p>
          <p className="mt-1 text-xs text-slate-400">Unpublished postings</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Daily Quota</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">30 left</p>
          <p className="mt-1 text-xs text-slate-400">Remaining posts today</p>
        </div>
      </div>

      {/* Quick Navigation Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">Quick Actions & Shortcuts</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Link
            href="/admin/jobs/new"
            className="block rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500 hover:shadow-xs"
          >
            <p className="font-semibold text-slate-900">Create Job Opening</p>
            <p className="mt-1 text-xs text-slate-500">
              Publish a fresh entry-level opening or internship.
            </p>
          </Link>

          <Link
            href="/admin/jobs"
            className="block rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500 hover:shadow-xs"
          >
            <p className="font-semibold text-slate-900">View Job Feed</p>
            <p className="mt-1 text-xs text-slate-500">
              Manage existing posts or copy formatted WhatsApp broadcasts.
            </p>
          </Link>

          {isAdmin && (
            <Link
              href="/admin/users"
              className="block rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500 hover:shadow-xs"
            >
              <p className="font-semibold text-slate-900">Invite Contributor</p>
              <p className="mt-1 text-xs text-slate-500">
                Grant team members access to publish verified listings.
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
