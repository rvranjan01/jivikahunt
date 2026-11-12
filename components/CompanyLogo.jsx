'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getInitials } from '@/lib/formatters';

const COLOR_PALETTE = [
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
  'bg-emerald-600 text-white',
  'bg-teal-600 text-white',
  'bg-violet-600 text-white',
  'bg-sky-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-600 text-white',
];

/**
 * Deterministically picks a palette index based on string hash.
 * @param {string} str
 * @returns {string} Tailwind classes for background and text
 */
function getAvatarColor(str) {
  if (!str) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

/**
 * Company logo component with automatic high-contrast initials avatar fallback.
 *
 * @param {Object} props
 * @param {string} [props.logoId] - MongoDB Image ObjectId
 * @param {string} props.name - Company name
 * @param {number} [props.size=48] - Dimensions in pixels
 * @param {string} [props.className=''] - Additional classes
 */
export default function CompanyLogo({ logoId, name, size = 48, className = '' }) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);
  const colorClass = getAvatarColor(name);

  if (logoId && !imageError) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xs ${className}`}
      >
        <Image
          src={`/img/${logoId}`}
          alt={`${name || 'Company'} logo`}
          width={size}
          height={size}
          unoptimized
          onError={() => setImageError(true)}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(12, Math.floor(size * 0.38)) }}
      className={`flex shrink-0 items-center justify-center rounded-xl font-bold tracking-wider shadow-xs select-none ${colorClass} ${className}`}
      aria-label={`${name || 'Company'} logo placeholder`}
    >
      {initials}
    </div>
  );
}
