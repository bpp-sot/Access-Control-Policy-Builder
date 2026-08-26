import { describe, it, expect } from 'vitest';
import { parseCustomPolicyJson } from '@/lib/custom-policy';

describe('parseCustomPolicyJson', () => {
  it('returns valid with no fragments for empty input', () => {
    const result = parseCustomPolicyJson('', 'aws');
    expect(result.valid).toBe(true);
    expect(result.fragments).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns valid with no fragments for whitespace-only input', () => {
    const result = parseCustomPolicyJson('   \n\t  ', 'azure');
    expect(result.valid).toBe(true);
    expect(result.fragments).toEqual([]);
  });

  it('rejects malformed JSON with a clear error', () => {
    const result = parseCustomPolicyJson('{ not json', 'aws');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not valid JSON');
    expect(result.fragments).toEqual([]);
  });

  it('rejects a primitive value', () => {
    const result = parseCustomPolicyJson('42', 'aws');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('primitive');
  });

  it('rejects null', () => {
    const result = parseCustomPolicyJson('null', 'aws');
    expect(result.valid).toBe(false);
  });

  it('accepts a single AWS IAM statement object', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ Action: 's3:GetObject', Resource: '*', Effect: 'Allow' }),
      'aws',
    );
    expect(result.valid).toBe(true);
    expect(result.fragments.length).toBe(1);
  });

  it('accepts an array of AWS IAM statements', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify([
        { Action: 's3:GetObject', Resource: '*', Effect: 'Allow' },
        { Action: 's3:PutObject', Resource: '*', Effect: 'Allow' },
      ]),
      'aws',
    );
    expect(result.valid).toBe(true);
    expect(result.fragments.length).toBe(2);
  });

  it('extracts Statement from a full AWS policy document', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Action: 's3:GetObject', Resource: '*', Effect: 'Allow' }],
      }),
      'aws',
    );
    expect(result.valid).toBe(true);
    expect(result.fragments.length).toBe(1);
  });

  it('accepts a single Azure condition object', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ field: 'type', equals: 'Microsoft.Storage/storageAccounts' }),
      'azure',
    );
    expect(result.valid).toBe(true);
    expect(result.fragments.length).toBe(1);
  });

  it('extracts anyOf from a full Azure Policy document', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({
        if: {
          not: {
            anyOf: [
              { field: 'type', equals: 'Microsoft.Storage/storageAccounts' },
              { field: 'location', equals: 'eastus' },
            ],
          },
        },
        then: { effect: 'Deny' },
      }),
      'azure',
    );
    expect(result.valid).toBe(true);
    expect(result.fragments.length).toBe(2);
  });

  it('rejects an array containing non-objects', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify([{ Action: 's3:GetObject' }, 'not-an-object']),
      'aws',
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('objects');
  });

  it('detects secrets in custom JSON', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({
        Action: 's3:GetObject',
        Resource: '*',
        Effect: 'Allow',
        Comment: 'AKIAIOSFODNN7EXAMPLE',
      }),
      'aws',
    );
    expect(result.secretWarnings.length).toBeGreaterThan(0);
  });

  it('returns no secret warnings for clean JSON', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ Action: 's3:GetObject', Resource: '*', Effect: 'Allow' }),
      'aws',
    );
    expect(result.secretWarnings).toEqual([]);
  });

  it('accepts a single AWS statement object without a provider-specific wrapper', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ Action: 'iam:ListRoles', Resource: '*', Effect: 'Allow', Sid: 'Custom' }),
      'aws',
    );
    expect(result.valid).toBe(true);
    expect(result.fragments.length).toBe(1);
  });

  // ─── Semantic validation ─────────────────────────────────────────────

  it('rejects an AWS statement without Effect', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ Action: 's3:GetObject', Resource: '*' }),
      'aws',
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Effect');
  });

  it('rejects an AWS statement with an invalid Effect value', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ Action: 's3:GetObject', Resource: '*', Effect: 'Maybe' }),
      'aws',
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Effect');
  });

  it('rejects an AWS statement without Action or NotAction', () => {
    const result = parseCustomPolicyJson(JSON.stringify({ Effect: 'Allow', Resource: '*' }), 'aws');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Action');
  });

  it('accepts an AWS statement with NotAction instead of Action', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ NotAction: 's3:DeleteBucket', Resource: '*', Effect: 'Deny' }),
      'aws',
    );
    expect(result.valid).toBe(true);
    expect(result.fragments.length).toBe(1);
  });

  it('rejects an Azure condition without field', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ equals: 'Microsoft.Storage/storageAccounts' }),
      'azure',
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('field');
  });

  it('rejects an Azure condition with an empty field value', () => {
    const result = parseCustomPolicyJson(JSON.stringify({ field: '   ', equals: 'test' }), 'azure');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('field');
  });

  it('rejects an Azure condition without a comparator operator', () => {
    const result = parseCustomPolicyJson(JSON.stringify({ field: 'type' }), 'azure');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('comparator');
  });

  it('accepts an Azure condition with the "in" comparator', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ field: 'location', in: ['eastus', 'westus'] }),
      'azure',
    );
    expect(result.valid).toBe(true);
    expect(result.fragments.length).toBe(1);
  });

  it('accepts an Azure condition with the "exists" comparator', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify({ field: 'tags.environment', exists: true }),
      'azure',
    );
    expect(result.valid).toBe(true);
    expect(result.fragments.length).toBe(1);
  });

  it('reports the fragment index in semantic validation errors', () => {
    const result = parseCustomPolicyJson(
      JSON.stringify([
        { Action: 's3:GetObject', Resource: '*', Effect: 'Allow' },
        { Resource: '*', Effect: 'Allow' },
      ]),
      'aws',
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('statement 2');
  });
});
