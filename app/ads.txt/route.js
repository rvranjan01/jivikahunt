import siteConfig from '@/lib/siteConfig';

/**
 * Serves ads.txt from configuration.
 * Complies with Google AdSense authorization requirements.
 *
 * @returns {Response}
 */
export async function GET() {
  return new Response(siteConfig.ads.adsTxtContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
