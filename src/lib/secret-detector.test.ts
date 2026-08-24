import { describe, it, expect } from 'vitest';
import { detectSecrets } from '@/lib/secret-detector';

describe('detectSecrets', () => {
  it('returns no warnings for clean text', () => {
    const result = detectSecrets('This is a normal lab description.');
    expect(result.detected).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns no warnings for empty text', () => {
    const result = detectSecrets('');
    expect(result.detected).toBe(false);
  });

  it('detects AWS access key IDs', () => {
    const result = detectSecrets('My key is AKIAIOSFODNN7EXAMPLE');
    expect(result.detected).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('detects private key blocks', () => {
    const result = detectSecrets('-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...');
    expect(result.detected).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('detects password assignments', () => {
    const result = detectSecrets('password = "mySecretPassword123"');
    expect(result.detected).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('detects JWT tokens', () => {
    const result = detectSecrets(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    );
    expect(result.detected).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('detects Azure storage connection strings', () => {
    const result = detectSecrets('DefaultEndpointsProtocol=https;AccountName=mystorage;');
    expect(result.detected).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
