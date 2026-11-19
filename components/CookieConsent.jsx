'use client';

import { useSyncExternalStore, useEffect } from 'react';
import Link from 'next/link';

export const CONSENT_STORAGE_KEY = 'jh_cookie_consent';

function subscribeToConsent(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('jh_cookie_consent_updated', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('jh_cookie_consent_updated', callback);
    window.removeEventListener('storage', callback);
  };
}

function getConsentSnapshot() {
  if (typeof window === 'undefined') return 'server';
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) || 'pending';
  } catch {
    return 'pending';
  }
}

function getServerSnapshot() {
  return 'server';
}

/**
 * Loads external services (AdSense, Analytics, OneSignal) only after consent is granted.
 */
function loadConsentScripts() {
  if (typeof window === 'undefined') return;

  // 1. Google Analytics
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (gaId && !document.getElementById('ga-script')) {
    const script = document.createElement('script');
    script.id = 'ga-script';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    script.async = true;
    document.head.appendChild(script);

    const inline = document.createElement('script');
    inline.id = 'ga-init';
    inline.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { anonymize_ip: true });
    `;
    document.head.appendChild(inline);
  }

  // 2. Google AdSense Script
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (adsenseId && !document.getElementById('adsense-script')) {
    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseId)}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }

  // 3. OneSignal Web Push
  const onesignalId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (onesignalId && !document.getElementById('onesignal-script')) {
    const script = document.createElement('script');
    script.id = 'onesignal-script';
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({
        appId: onesignalId,
        safari_web_id: undefined,
        notifyButton: { enable: false },
      });
    });
  }
}

/**
 * Cookie consent banner gating ads, analytics, and push notifications.
 */
export default function CookieConsent() {
  const consentStatus = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    if (consentStatus === 'accepted') {
      loadConsentScripts();
    }
  }, [consentStatus]);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new CustomEvent('jh_cookie_consent_updated', { detail: 'accepted' }));
    loadConsentScripts();
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'declined');
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new CustomEvent('jh_cookie_consent_updated', { detail: 'declined' }));
  };

  if (consentStatus !== 'pending') {
    return null;
  }

  return (
    <aside aria-label="Cookie consent banner" className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">We respect your privacy</p>
          <p className="text-xs text-slate-600">
            JivikaHunt uses cookies and browser storage strictly to preserve your saved jobs,
            measure traffic, and serve non-intrusive ads. We never sell personal information. Read
            our{' '}
            <Link
              href="/privacy"
              className="font-medium text-blue-600 underline hover:text-blue-700"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="mt-3 flex shrink-0 items-center gap-3 sm:mt-0">
          <button
            type="button"
            onClick={handleDecline}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:ring-2 focus:ring-slate-400 focus:outline-hidden"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}
