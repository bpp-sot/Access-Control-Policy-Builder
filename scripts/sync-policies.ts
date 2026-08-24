/**
 * sync-policies.ts
 *
 * Development script that inventories and normalises Access Control Policy
 * examples from a local clone of the LearnOnDemandSystems/labauthor repository.
 *
 * Usage:
 *   npm run sync:policies                              # uses default path
 *   npm run sync:policies -- --source /path/to/labauthor  # custom path
 *
 * Output:
 *   - src/data/source-manifest.json (updated)
 *   - src/data/azure-patterns.json (updated)
 *   - src/data/aws-patterns.json (updated)
 *   - sync-report.json (machine-readable report)
 */

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

interface PolicyEntry {
  provider: 'Azure' | 'AWS';
  folderName: string;
  relativePath: string;
  policyJsonValid: boolean;
  policyJson: unknown;
  readmeContent: string | null;
  error?: string;
}

interface SyncReport {
  syncDate: string;
  sourcePath: string;
  totalFiles: number;
  azureCount: number;
  awsCount: number;
  parsedSuccessfully: number;
  failedToParse: string[];
  entries: PolicyEntry[];
}

function findPolicyFolders(baseDir: string): string[] {
  if (!existsSync(baseDir)) return [];
  return readdirSync(baseDir)
    .filter((entry) => statSync(join(baseDir, entry)).isDirectory())
    .map((entry) => join(baseDir, entry));
}

function readPolicyFile(folderPath: string): { json: unknown; valid: boolean; error?: string } {
  const policyPath = join(folderPath, 'policy.json');
  if (!existsSync(policyPath)) {
    return { json: null, valid: false, error: 'policy.json not found' };
  }
  try {
    const raw = readFileSync(policyPath, 'utf-8');
    // Remove trailing commas and comments that may appear in sample JSON
    const cleaned = raw.replace(/,\s*([}\]])/g, '$1').replace(/\/\*.*?\*\//gs, '');
    return { json: JSON.parse(cleaned), valid: true };
  } catch (e) {
    return { json: null, valid: false, error: e instanceof Error ? e.message : 'Parse error' };
  }
}

function findReadme(folderPath: string): string | null {
  for (const name of ['readme.md', 'Readme.md', 'README.md', 'readme.txt']) {
    const path = join(folderPath, name);
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
  }
  return null;
}

function extractTitleFromReadme(readme: string | null): string | null {
  if (!readme) return null;
  const match = readme.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractPurposeFromReadme(readme: string | null): string {
  if (!readme) return 'No readme available.';
  // Try to find the first paragraph after the title
  const lines = readme.split('\n');
  let foundTitle = false;
  for (const line of lines) {
    if (line.startsWith('#')) {
      foundTitle = true;
      continue;
    }
    if (foundTitle && line.trim().length > 0) {
      return line.trim();
    }
  }
  return 'Purpose not specified in readme.';
}

function inventoryProvider(
  provider: 'Azure' | 'AWS',
  basePath: string,
  repoRoot: string,
): PolicyEntry[] {
  const folders = findPolicyFolders(basePath);
  const entries: PolicyEntry[] = [];

  for (const folder of folders) {
    const folderName = basename(folder);
    const relativePath = relative(repoRoot, folder).replace(/\\/g, '/');

    const { json, valid, error } = readPolicyFile(folder);
    const readme = findReadme(folder);

    entries.push({
      provider,
      folderName,
      relativePath,
      policyJsonValid: valid,
      policyJson: json,
      readmeContent: readme,
      error,
    });
  }

  return entries;
}

function main() {
  const args = process.argv.slice(2);
  let sourcePath = '';

  // Parse --source argument
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      sourcePath = args[i + 1];
    }
  }

  // Default source path
  if (!sourcePath) {
    const defaultPath = resolve(projectRoot, '..', 'labauthor-master', 'labauthor-master');
    const altPath = resolve(os_homedir(), 'Downloads', 'labauthor-master', 'labauthor-master');
    if (existsSync(defaultPath)) {
      sourcePath = defaultPath;
    } else if (existsSync(altPath)) {
      sourcePath = altPath;
    } else {
      console.error('Could not find labauthor repository. Use --source /path/to/labauthor');
      process.exit(1);
    }
  }

  console.log(`Source path: ${sourcePath}`);

  const acpBasePath = join(sourcePath, 'access-control-policies');
  const azurePath = join(acpBasePath, 'Azure');
  const awsPath = join(acpBasePath, 'AWS');

  console.log('Inventorying Azure policies...');
  const azureEntries = inventoryProvider('Azure', azurePath, sourcePath);
  console.log(`  Found ${azureEntries.length} Azure policies`);

  console.log('Inventorying AWS policies...');
  const awsEntries = inventoryProvider('AWS', awsPath, sourcePath);
  console.log(`  Found ${awsEntries.length} AWS policies`);

  const allEntries = [...azureEntries, ...awsEntries];
  const failedToParse = allEntries
    .filter((e) => !e.policyJsonValid)
    .map((e) => `${e.relativePath}: ${e.error}`);

  const report: SyncReport = {
    syncDate: new Date().toISOString().split('T')[0],
    sourcePath,
    totalFiles: allEntries.length,
    azureCount: azureEntries.length,
    awsCount: awsEntries.length,
    parsedSuccessfully: allEntries.filter((e) => e.policyJsonValid).length,
    failedToParse,
    entries: allEntries,
  };

  // Write sync report
  const reportPath = join(projectRoot, 'sync-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nSync report written to: ${reportPath}`);
  console.log(`  Total: ${report.totalFiles}`);
  console.log(`  Azure: ${report.azureCount}`);
  console.log(`  AWS: ${report.awsCount}`);
  console.log(`  Parsed: ${report.parsedSuccessfully}`);
  console.log(`  Failed: ${failedToParse.length}`);

  if (failedToParse.length > 0) {
    console.log('\nFailed to parse:');
    failedToParse.forEach((f) => console.log(`  - ${f}`));
  }

  // Generate normalised pattern data
  const dataDir = join(projectRoot, 'src', 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Generate azure-patterns.json
  const azurePatterns = {
    provider: 'Azure',
    policyModel: 'Azure Policy',
    policyModelDescription:
      'Skillable Azure ACPs use Azure Policy definitions. The recommended approach is a whitelist model: encase allowed resources in a "not" block with effect "Deny".',
    patterns: azureEntries.map((e) => ({
      id: `azure-${e.folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: extractTitleFromReadme(e.readmeContent) ?? e.folderName,
      reusablePattern: 'synced-pattern',
      purpose: extractPurposeFromReadme(e.readmeContent),
      sourcePath: e.relativePath,
      sourceReadmePath: e.readmeContent ? `${e.relativePath}/readme.md` : null,
      githubUrl: `https://github.com/LearnOnDemandSystems/labauthor/tree/master/${e.relativePath}`,
      evidenceClassification: 'A',
      servicesRepresented: [],
      resourceTypesRepresented: [],
      regionsOrLocationsMentioned: [],
      sizesOrSkusMentioned: [],
      wildcardUse: [],
      policyJson: e.policyJson,
      structureNotes: e.error ? `Parse error: ${e.error}` : 'Synced from source repository.',
      applicableWhen: 'Review the source readme for applicability guidance.',
    })),
  };

  const awsPatterns = {
    provider: 'AWS',
    policyModel: 'IAM Managed Identity-Based Policy',
    policyModelDescription:
      'Skillable AWS ACPs use IAM managed identity-based policies with Version "2012-10-17".',
    patterns: awsEntries.map((e) => ({
      id: `aws-${e.folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: extractTitleFromReadme(e.readmeContent) ?? e.folderName,
      reusablePattern: 'synced-pattern',
      purpose: extractPurposeFromReadme(e.readmeContent),
      sourcePath: e.relativePath,
      sourceReadmePath: e.readmeContent ? `${e.relativePath}/readme.md` : null,
      githubUrl: `https://github.com/LearnOnDemandSystems/labauthor/tree/master/${e.relativePath}`,
      evidenceClassification: 'A',
      servicesRepresented: [],
      resourceTypesRepresented: [],
      regionsOrLocationsMentioned: [],
      sizesOrSkusMentioned: [],
      wildcardUse: [],
      policyJson: e.policyJson,
      structureNotes: e.error ? `Parse error: ${e.error}` : 'Synced from source repository.',
      applicableWhen: 'Review the source readme for applicability guidance.',
    })),
  };

  const azurePatternsPath = join(dataDir, 'azure-patterns.synced.json');
  const awsPatternsPath = join(dataDir, 'aws-patterns.synced.json');
  writeFileSync(azurePatternsPath, JSON.stringify(azurePatterns, null, 2));
  writeFileSync(awsPatternsPath, JSON.stringify(awsPatterns, null, 2));
  console.log(`\nNormalised data written to:`);
  console.log(`  ${azurePatternsPath}`);
  console.log(`  ${awsPatternsPath}`);
  console.log('\nNote: The .synced.json files are generated for review. The curated');
  console.log('azure-patterns.json and aws-patterns.json files contain hand-annotated metadata.');
}

function os_homedir(): string {
  return process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || '.';
}

main();
