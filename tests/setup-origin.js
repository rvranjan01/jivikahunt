const OriginalRequest = globalThis.Request;

globalThis.Request = class extends OriginalRequest {
  constructor(input, init) {
    const method = (
      init?.method ||
      (typeof input === 'object' && input?.method) ||
      'GET'
    ).toUpperCase();

    if (method !== 'GET' && method !== 'HEAD') {
      let testPath = '';
      try {
        testPath = expect?.getState?.()?.testPath || '';
      } catch {
        testPath = '';
      }

      if (!testPath.includes('security.test.js')) {
        const rawHeaders = init?.headers || (typeof input === 'object' && input?.headers) || {};
        const headers = new Headers(rawHeaders);
        if (!headers.has('origin')) {
          headers.set('origin', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
          init = { ...init, headers };
        }
      }
    }

    super(input, init);
  }
};
