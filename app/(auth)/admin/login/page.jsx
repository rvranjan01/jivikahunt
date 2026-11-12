'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      if (data.requires2FA) {
        setRequires2FA(true);
        setError('');
        setLoading(false);
        return;
      }

      // Check if user is forced to change password
      if (data.user?.mustChangePassword) {
        router.push('/admin/change-password');
      } else {
        router.push('/admin');
      }
      router.refresh();
    } catch (err) {
      setError('Network connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <Link href="/" className="inline-block text-2xl font-black tracking-tight text-slate-900">
            JivikaHunt
          </Link>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
            Staff Portal Login
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Restricted to authorized administrators and contributors
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={requires2FA}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
              placeholder="you@jivikahunt.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={requires2FA}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
              placeholder="••••••••••••"
            />
          </div>

          {requires2FA && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <label className="block text-xs font-bold text-blue-900" htmlFor="totpCode">
                Two-Factor Authentication (2FA) Code
              </label>
              <p className="mt-0.5 text-xs text-blue-700">
                Enter the 6-digit code from your authenticator app
              </p>
              <input
                id="totpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                placeholder="123456"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : requires2FA ? 'Verify 2FA & Sign In' : 'Sign In'}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center">
          <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-800">
            ← Return to public site
          </Link>
        </div>
      </div>
    </div>
  );
}
