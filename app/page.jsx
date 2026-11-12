import siteConfig from '@/lib/siteConfig';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{siteConfig.name}</h1>
        <p className="mt-3 text-sm text-slate-600">{siteConfig.tagline}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Phase 0: Scaffolded & Ready
        </div>
      </div>
    </main>
  );
}
