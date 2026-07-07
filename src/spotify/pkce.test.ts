import { describe, it, expect } from 'vitest';
import {
  generateCodeVerifier,
  deriveCodeChallenge,
  base64UrlEncode,
  generateState,
} from './pkce';

describe('pkce', () => {
  it('generates a verifier in the RFC 7636 length range and charset', () => {
    const v = generateCodeVerifier();
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
    expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('clamps requested verifier length to [43, 128]', () => {
    expect(generateCodeVerifier(10).length).toBe(43);
    expect(generateCodeVerifier(500).length).toBe(128);
  });

  it('base64UrlEncode is URL-safe and unpadded', () => {
    const bytes = new Uint8Array([251, 255, 191]).buffer; // would contain + / = in std base64
    const out = base64UrlEncode(bytes);
    expect(out).not.toMatch(/[+/=]/);
  });

  it('matches the RFC 7636 Appendix B challenge test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await deriveCodeChallenge(verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('derives a deterministic challenge for a given verifier', async () => {
    const v = generateCodeVerifier();
    expect(await deriveCodeChallenge(v)).toBe(await deriveCodeChallenge(v));
  });

  it('generates hex state of the expected length', () => {
    expect(generateState(16)).toMatch(/^[0-9a-f]{32}$/);
  });
});
