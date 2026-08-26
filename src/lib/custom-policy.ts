import { detectSecrets } from '@/lib/secret-detector';
import type { CloudProvider } from '@/types';

export interface CustomPolicyParseResult {
  valid: boolean;
  error: string | null;
  fragments: unknown[];
  secretWarnings: string[];
}

/**
 * Parse professional-mode custom JSON into one or more policy fragments.
 *
 * Accepted shapes:
 *  - A single Azure Policy condition object (merged into anyOf)
 *  - A single AWS IAM statement object
 *  - An array of either
 *  - An AWS policy document { Version, Statement: [...] } — only Statement is used
 *  - An Azure Policy document { if: { not: { anyOf: [...] } } } — only anyOf is used
 *
 * Prose is rejected. The tool does not invent Skillable or cloud syntax from
 * free text. Classification F applies to whatever the author supplies.
 */
export function parseCustomPolicyJson(
  raw: string,
  provider: CloudProvider | null,
): CustomPolicyParseResult {
  const secretWarnings = detectSecrets(raw).warnings;
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true, error: null, fragments: [], secretWarnings };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? `Custom JSON is not valid JSON: ${error.message}`
          : 'Custom JSON is not valid JSON.',
      fragments: [],
      secretWarnings,
    };
  }

  if (parsed === null || typeof parsed !== 'object') {
    return {
      valid: false,
      error: 'Custom JSON must be an object or an array of objects — not a primitive value.',
      fragments: [],
      secretWarnings,
    };
  }

  const fragments = extractFragments(parsed, provider);
  if (fragments.error) {
    return { valid: false, error: fragments.error, fragments: [], secretWarnings };
  }

  return { valid: true, error: null, fragments: fragments.items, secretWarnings };
}

function extractFragments(
  parsed: unknown,
  provider: CloudProvider | null,
): { items: unknown[]; error: string | null } {
  if (Array.isArray(parsed)) {
    if (parsed.some((item) => item === null || typeof item !== 'object' || Array.isArray(item))) {
      return { items: [], error: 'Custom JSON arrays may only contain objects.' };
    }
    return { items: parsed, error: null };
  }

  const record = parsed as Record<string, unknown>;

  if (provider === 'aws' && Array.isArray(record.Statement)) {
    return { items: record.Statement, error: null };
  }

  if (provider === 'azure') {
    const anyOf = getAzureAnyOf(record);
    if (anyOf) return { items: anyOf, error: null };
  }

  return { items: [parsed], error: null };
}

function getAzureAnyOf(record: Record<string, unknown>): unknown[] | null {
  const ifBlock = record.if;
  if (!ifBlock || typeof ifBlock !== 'object' || Array.isArray(ifBlock)) return null;
  const notBlock = (ifBlock as Record<string, unknown>).not;
  if (!notBlock || typeof notBlock !== 'object' || Array.isArray(notBlock)) return null;
  const anyOf = (notBlock as Record<string, unknown>).anyOf;
  return Array.isArray(anyOf) ? anyOf : null;
}
