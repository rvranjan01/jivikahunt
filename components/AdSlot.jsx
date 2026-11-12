import siteConfig from '@/lib/siteConfig';

/**
 * Google AdSense banner placement wrapper.
 * Strictly enforces a fixed minimum height (min-h-[280px]) to prevent Cumulative Layout Shift (CLS).
 * Renders nothing if ads are disabled or if NEXT_PUBLIC_ADSENSE_CLIENT_ID is unset.
 *
 * @param {Object} props
 * @param {string} [props.slotId] - Optional specific ad unit slot ID
 * @param {'job-detail' | 'feed-inline'} [props.position='feed-inline']
 * @param {string} [props.className='']
 */
export default function AdSlot({ slotId, position = 'feed-inline', className = '' }) {
  if (!siteConfig.ads.enabled) {
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
