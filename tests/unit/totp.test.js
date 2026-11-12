import { describe, it, expect } from 'vitest';
import { createTotpSecret, verifyTotpToken, generateTotpQrCode } from '@/lib/totp';
import { generateSync } from 'otplib';

describe('Admin 2FA TOTP (lib/totp.js)', () => {
  it('should generate a valid 32-character base32 secret', () => {
    const secret = createTotpSecret();
    expect(secret).toBeDefined();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThanOrEqual(16);
    expect(/^[A-Z2-7]+=*$/.test(secret)).toBe(true);
  });

  it('should verify a valid token generated for the secret', () => {
    const secret = createTotpSecret();
    const token = generateSync({ secret });
    const isValid = verifyTotpToken(secret, token);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect 6-digit token', () => {
    const secret = createTotpSecret();
    const isValid = verifyTotpToken(secret, '000000');
    expect(isValid).toBe(false);
  });

  it('should reject malformed or non-numeric tokens', () => {
    const secret = createTotpSecret();
    expect(verifyTotpToken(secret, 'abc123')).toBe(false);
    expect(verifyTotpToken(secret, '')).toBe(false);
    expect(verifyTotpToken(null, '123456')).toBe(false);
  });

  it('should generate a valid otpauth uri and QR code data URL', async () => {
    const secret = createTotpSecret();
    const { uri, qrCodeDataUrl } = await generateTotpQrCode('admin@jivikahunt.com', secret);

    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('admin%40jivikahunt.com');
    expect(uri).toContain(secret);
    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
