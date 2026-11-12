import Link from 'next/link';

export default function AdminJobsPlaceholderPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
      <h1 className="text-xl font-bold text-slate-900">Job Management Hub</h1>
      <p className="mt-2 text-sm text-slate-500">
        Job listing, editing, duplicate checking, and WhatsApp copy workflows will be activated in
        Phase 3.
      </p>
      <div className="mt-6">
        <Link
          href="/admin"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
        >
          ← Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
