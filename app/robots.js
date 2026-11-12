import siteConfig from '@/lib/siteConfig';

/**
 * Generates dynamic robots.txt file instructing search engine crawlers.
 * Disallows admin panels and API endpoints; references canonical sitemap.
 *
 * @returns {import('next').MetadataRoute.Robots}
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/saved'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
