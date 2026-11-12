import Link from 'next/link';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import Report from '@/models/Report';
import Guide from '@/models/Guide';
import { getSessionUser } from '@/lib/auth';
import { getContributorQuotaRemaining } from '@/lib/quota';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  const isAdmin = user?.role === 'admin';

  await connectDB();

  // Fetch real-time dashboard metrics
  const jobQuery = isAdmin ? {} : { createdBy: user?._id };

  const [publishedCount, draftsCount, guidesCount, openReportsCount, quotaRemaining, viewsResult] =
    await Promise.all([
      Job.countDocuments({ ...jobQuery, status: 'published' }),
      Job.countDocuments({ ...jobQuery, status: 'draft' }),
      Guide.countDocuments(isAdmin ? {} : { createdBy: user?._id }),
      isAdmin ? Report.countDocuments({ status: 'open' }) : 0,
      isAdmin ? Promise.resolve(null) : getContributorQuotaRemaining(user?._id),
      Job.aggregate([
        { $match: jobQuery },
        { $group: { _id: null, totalViews: { $sum: '$views' } } },
      ]),
    ]);

  const totalViews = viewsResult[0]?.totalViews || 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.displayName}!
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Logged in as <strong className="capitalize">{user?.role}</strong> •{' '}
            {isAdmin ? 'Unlimited posting privileges' : `${quotaRemaining} posts remaining today`}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
          <Link
            href="/admin/jobs/new"
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
          >
            + Post New Job
          </Link>
          <Link
            href="/admin/guides/new"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            + Write Guide
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Published Jobs</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{publishedCount}</p>
          <p className="mt-1 text-xs text-slate-400">
            {isAdmin ? 'Active site-wide postings' : 'Live listings by you'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Drafts</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{draftsCount}</p>
          <p className="mt-1 text-xs text-slate-400">Unpublished postings</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Impressions</p>
          <p className="mt-2 text-3xl font-black text-blue-600">{totalViews}</p>
          <p className="mt-1 text-xs text-slate-400">Total job views</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            {isAdmin ? 'Open Reports' : 'Daily Quota'}
          </p>
          <p
            className={`mt-2 text-3xl font-black ${
              isAdmin
                ? openReportsCount > 0
                  ? 'text-rose-600'
                  : 'text-emerald-600'
                : 'text-emerald-600'
            }`}
          >
            {isAdmin ? openReportsCount : `${quotaRemaining} left`}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isAdmin ? 'User reports awaiting review' : 'Posts remaining in 24h'}
          </p>
        </div>
      </div>

      {/* Quick Navigation Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">Quick Navigation</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Link
            href="/admin/jobs/new"
            className="block rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500 hover:shadow-xs"
          >
            <p className="font-semibold text-slate-900">Create Job</p>
            <p className="mt-1 text-xs text-slate-500">
              Publish a fresh entry-level opening or internship.
            </p>
          </Link>

          <Link
            href="/admin/jobs"
            className="block rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500 hover:shadow-xs"
          >
            <p className="font-semibold text-slate-900">Job Listings</p>
            <p className="mt-1 text-xs text-slate-500">
              Manage existing posts, copy WhatsApp texts, or edit.
            </p>
          </Link>

          <Link
            href="/admin/guides"
            className="block rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500 hover:shadow-xs"
          >
            <p className="font-semibold text-slate-900">Career Guides</p>
            <p className="mt-1 text-xs text-slate-500">
              Author placement advice and student career roadmaps ({guidesCount} total).
            </p>
          </Link>

          {isAdmin ? (
            <Link
              href="/admin/reports"
              className="block rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500 hover:shadow-xs"
            >
              <p className="font-semibold text-slate-900">Broken Link Reports</p>
              <p className="mt-1 text-xs text-slate-500">
                Review community reports ({openReportsCount} open).
              </p>
            </Link>
          ) : (
            <Link
              href="/admin/change-password"
              className="block rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500 hover:shadow-xs"
            >
              <p className="font-semibold text-slate-900">Change Password</p>
              <p className="mt-1 text-xs text-slate-500">Update your account credentials.</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
