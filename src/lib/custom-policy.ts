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
 *
 * Semantic validation is applied per provider:
 *  - AWS statements must contain an Effect and at least one of Action / NotAction.
 *  - Azure conditions must contain a field and at least one comparator operator.
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

  const extracted = extractFragments(parsed, provider);
  if (extracted.error) {
    return { valid: false, error: extracted.error, fragments: [], secretWarnings };
  }

  const semanticError = validateFragmentsSemantic(extracted.items, provider);
  if (semanticError) {
    return { valid: false, error: semanticError, fragments: [], secretWarnings };
  }

  return { valid: true, error: null, fragments: extracted.items, secretWarnings };
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

// ─── Semantic validation ──────────────────────────────────────────────────

const AZURE_COMPARATORS = [
  'equals',
  'notEquals',
  'like',
  'notLike',
  'match',
  'notMatch',
  'in',
  'notIn',
  'contains',
  'notContains',
  'exists',
  'less',
  'lessOrEquals',
  'greater',
  'greaterOrEquals',
];

/**
 * Validate that each extracted fragment is semantically meaningful for the
 * target policy engine. This catches objects that are valid JSON and the
 * correct top-level shape, but would produce a broken policy at deployment
 * time (e.g. an AWS statement without Effect, or an Azure condition without
 * a field/comparator).
 */
function validateFragmentsSemantic(
  fragments: unknown[],
  provider: CloudProvider | null,
): string | null {
  if (!provider) return null;

  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];
    if (!fragment || typeof fragment !== 'object' || Array.isArray(fragment)) {
      return `Fragment ${i + 1} is not an object.`;
    }

    const record = fragment as Record<string, unknown>;

    if (provider === 'aws') {
      const error = validateAwsStatement(record, i + 1);
      if (error) return error;
    } else if (provider === 'azure') {
      const error = validateAzureCondition(record, i + 1);
      if (error) return error;
    }
  }

  return null;
}

function validateAwsStatement(record: Record<string, unknown>, index: number): string | null {
  if (!('Effect' in record)) {
    return `AWS statement ${index} is missing the required "Effect" field (e.g. "Allow" or "Deny").`;
  }

  const effect = record.Effect;
  if (typeof effect !== 'string' || (effect !== 'Allow' && effect !== 'Deny')) {
    return `AWS statement ${index} has an invalid "Effect" value. Use "Allow" or "Deny".`;
  }

  if (!('Action' in record) && !('NotAction' in record)) {
    return `AWS statement ${index} must contain at least one of "Action" or "NotAction".`;
  }

  return null;
}

function validateAzureCondition(record: Record<string, unknown>, index: number): string | null {
  if (!('field' in record)) {
    return `Azure condition ${index} is missing the required "field" property (e.g. "type", "location", "name").`;
  }

  const field = record.field;
  if (typeof field !== 'string' || field.trim().length === 0) {
    return `Azure condition ${index} has an invalid "field" value. It must be a non-empty string.`;
  }

  const hasComparator = AZURE_COMPARATORS.some((key) => key in record);
  if (!hasComparator) {
    return `Azure condition ${index} must contain at least one comparator operator (e.g. "equals", "in", "like", "exists").`;
  }

  return null;
}
