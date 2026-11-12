'use client';

import { useState, useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

function getServerSnapshot() {
  return false;
}

/**
 * Share buttons widget using pure HTML/JS share intents (no third-party tracking scripts).
 * Includes Copy Link and native mobile Web Share API support.
 *
 * @param {Object} props
 * @param {string} props.title - Job title
 * @param {string} props.company - Company name
 * @param {string} props.url - Full canonical job URL
 */
export default function ShareButtons({ title, company, url }) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const shareText = `Check out this opening for ${title} at ${company} on JivikaHunt:`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${shareText} ${url}`);

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${title} at ${company}`,
          text: shareText,
          url,
        });
      }
    } catch {
      // User cancelled share
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Share this opportunity</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Help your friends and college batchmates find this opening:
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodedText}`}
            target="_blank"
            rel="nofollow noopener noreferrer"
            aria-label="Share on WhatsApp"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            <span>WhatsApp</span>
          </a>

          {/* Telegram */}
          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="nofollow noopener noreferrer"
            aria-label="Share on Telegram"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-100"
          >
            <span>Telegram</span>
          </a>

          {/* X (Twitter) */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodedUrl}`}
            target="_blank"
            rel="nofollow noopener noreferrer"
            aria-label="Share on X"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
          >
            <span>X</span>
          </a>

          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="nofollow noopener noreferrer"
            aria-label="Share on Facebook"
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100"
          >
            <span>Facebook</span>
          </a>

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copy job link"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
          >
            {copied ? (
              <span className="font-bold text-emerald-600">Copied!</span>
            ) : (
              <span>Copy Link</span>
            )}
          </button>

          {/* Native Web Share on Mobile */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              aria-label="Open mobile share sheet"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 sm:hidden"
            >
              <span>Share...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
