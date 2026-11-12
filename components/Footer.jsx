import Link from 'next/link';
import siteConfig from '@/lib/siteConfig';

/**
 * Public four-column footer with legal disclaimers and community links.
 * Strictly adheres to lib/siteConfig.js for all URLs, brand references, and contact information.
 */
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: About */}
          <div>
            <div className="text-xl font-black tracking-tight text-white">{siteConfig.name}</div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">{siteConfig.description}</p>
            <p className="mt-4 text-xs font-medium text-slate-300">
              Inquiries:{' '}
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="text-blue-400 hover:underline"
              >
                {siteConfig.contactEmail}
              </a>
            </p>
          </div>

          {/* Column 2: Categories */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">Categories</h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              {siteConfig.categories.map((cat) => (
                <li key={cat.label}>
                  <Link
                    href={cat.href}
                    className="transition-colors hover:text-white hover:underline"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Quick Links */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">Quick Links</h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              {siteConfig.quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-white hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Follow Us Social Box */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">Follow Us</h3>
            <p className="mt-3 text-xs text-slate-400">
              Join our official communities for real-time alerts on freshers drives & internships:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={siteConfig.socials.telegram}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-blue-600 hover:text-white"
              >
                Telegram
              </a>
              <a
                href={siteConfig.socials.whatsapp}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-emerald-600 hover:text-white"
              >
                WhatsApp
              </a>
              <a
                href={siteConfig.socials.linkedin}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-blue-700 hover:text-white"
              >
                LinkedIn
              </a>
              <a
                href={siteConfig.socials.instagram}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-pink-600 hover:text-white"
              >
                Instagram
              </a>
              <a
                href={siteConfig.socials.facebook}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-blue-800 hover:text-white"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Line Notice & Copyright */}
        <div className="mt-12 border-t border-slate-800 pt-8 text-center text-xs text-slate-400 sm:flex sm:items-center sm:justify-between sm:text-left">
          <p>{siteConfig.copyrightText}</p>
          <p className="mt-2 font-medium text-amber-400 sm:mt-0">{siteConfig.disclaimerNote}</p>
        </div>
      </div>
    </footer>
  );
}
