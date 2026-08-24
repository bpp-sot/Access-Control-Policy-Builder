// Detects potential secrets/credentials in free-text fields.
// Returns a list of warnings for detected patterns.

const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /AKIA[0-9A-Z]{16}/g, label: 'AWS Access Key ID' },
  { pattern: /aws_secret_access_key/gi, label: 'AWS secret access key reference' },
  { pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/g, label: 'Private key block' },
  { pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, label: 'JWT token' },
  { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, label: 'Password assignment' },
  { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi, label: 'Secret assignment' },
  { pattern: /token\s*[:=]\s*['"][^'"]{8,}['"]/gi, label: 'Token assignment' },
  { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, label: 'API key assignment' },
  { pattern: /connection\s*string\s*[:=]\s*['"][^'"]+['"]/gi, label: 'Connection string' },
  {
    pattern: /DefaultEndpointsProtocol=https?;AccountName=/gi,
    label: 'Azure Storage connection string',
  },
  { pattern: /ClientSecret\s*[:=]\s*['"][^'"]+['"]/gi, label: 'Client secret' },
  { pattern: /SAS\s*token/gi, label: 'SAS token reference' },
];

export interface SecretDetectionResult {
  detected: boolean;
  warnings: string[];
}

export function detectSecrets(text: string): SecretDetectionResult {
  if (!text || text.trim().length === 0) {
    return { detected: false, warnings: [] };
  }

  const warnings: string[] = [];
  for (const { pattern, label } of SECRET_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      warnings.push(
        `Potential ${label} detected (${matches.length} occurrence${matches.length > 1 ? 's' : ''}). Do not enter credentials or secrets into this field.`,
      );
    }
  }

  return { detected: warnings.length > 0, warnings };
}
