'use client';

import { useSyncExternalStore } from 'react';
import siteConfig from '@/lib/siteConfig';

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
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('jh_cookie_consent') === 'accepted';
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

/**
 * Google AdSense banner placement wrapper.
 * Strictly enforces a fixed minimum height (min-h-[280px]) to prevent Cumulative Layout Shift (CLS).
 * Gated by cookie consent: loads only after the user accepts cookies.
 * Renders nothing if ads are disabled or if NEXT_PUBLIC_ADSENSE_CLIENT_ID is unset.
 *
 * @param {Object} props
 * @param {string} [props.slotId] - Optional specific ad unit slot ID
 * @param {'job-detail' | 'feed-inline'} [props.position='feed-inline']
 * @param {string} [props.className='']
 */
export default function AdSlot({ slotId, position = 'feed-inline', className = '' }) {
  const hasConsent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerSnapshot
  );

  if (!siteConfig.ads.enabled || !hasConsent) {
    return null;
  }

  return (
    <aside
      aria-label="Advertisement"
      className={`my-6 flex min-h-[280px] w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-2 text-center text-xs text-slate-400 ${className}`}
      data-ad-position={position}
    >
      <div className="w-full">
        <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Advertisement
        </span>
        <div className="mt-2 min-h-[250px] w-full">
          {/* AdSense ins container */}
          <ins
            className="adsbygoogle"
            style={{ display: 'block', minHeight: '250px' }}
            data-ad-client={siteConfig.ads.publisherId}
            data-ad-slot={slotId || '0000000000'}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </aside>
  );
}
