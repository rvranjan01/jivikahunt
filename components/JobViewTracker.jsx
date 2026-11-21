'use client';

import { useEffect, useRef } from 'react';

/**
 * Client component that triggers a view count increment once per browser session.
 * Stores a session key to avoid firing multiple requests during the same session.
 *
 * @param {{ slug: string }} props
 */
export default function JobViewTracker({ slug }) {
  const sent = useRef(false);

  useEffect(() => {
    if (!slug || sent.current) return;

    try {
      const key = `jh_view_${slug}`;
      if (sessionStorage.getItem(key)) return;

      sessionStorage.setItem(key, '1');
      sent.current = true;

      fetch('/api/jobs/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug }),
      }).catch(() => {
        // Silently swallow network errors on view tracking
      });
    } catch {
      // Ignore sessionStorage errors (e.g. in private browsing modes)
    }
  }, [slug]);

  return null;
}
