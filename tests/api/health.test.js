import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('Health Check API (/api/health)', () => {
  it('should return 200 and healthy JSON report when unconfigured or connected', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    // Verify cache prevention headers
    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toContain('no-store');

    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('jivikahunt');
    expect(data.uptimeSeconds).toBeTypeOf('number');
    expect(data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(data.responseTimeMs).toBeTypeOf('number');
    expect(data.timestamp).toBeTypeOf('string');
    expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    expect(['connected', 'unconfigured']).toContain(data.database);
  });
});
