'use client';

import { useState } from 'react';

/**
 * Clean, lightweight email job alerts subscription banner.
 */
export default function JobAlertsBanner() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          types: ['fresher', 'intern'],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Check your inbox to confirm your alerts!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('A network error occurred. Please try again.');
    }
  };

  return (
    <aside
      aria-label="Daily Job Alerts Subscription"
      className="rounded-3xl border border-blue-200 bg-linear-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-md sm:p-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/40 px-3 py-1 text-xs font-semibold text-blue-100">
            <span>✉️</span>
            <span>Daily Alerts</span>
          </div>
          <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
            Never miss a college fresher drive
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-blue-100 sm:text-sm">
            Get the newest verified freshers jobs and internships sent to your inbox every morning.
            Zero spam, double opt-in, unsubscribe anytime with one click.
          </p>
        </div>

        <div className="w-full max-w-md">
          {status === 'success' ? (
            <div className="rounded-2xl bg-white/10 p-4 text-xs font-semibold text-white backdrop-blur-xs">
              🎉 {message}
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  placeholder="Enter your student or personal email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs text-white placeholder:text-blue-200 focus:bg-white focus:text-slate-900 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 disabled:opacity-50"
                >
                  {status === 'loading' ? 'Sending...' : 'Get Free Alerts'}
                </button>
              </div>

              {status === 'error' && (
                <p className="text-[11px] font-semibold text-rose-200">{message}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
