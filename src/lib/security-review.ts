import type { GeneratedPolicy, SecurityReview, SecurityReviewItem, WizardState } from '@/types';
import sourceManifest from '@data/source-manifest.json';

export function generateSecurityReview(
  wizard: WizardState,
  policy: GeneratedPolicy,
): SecurityReview {
  const items: SecurityReviewItem[] = [];

  // Security risks from the generated policy
  for (const risk of policy.securityRisks) {
    items.push({
      severity: 'high',
      category: 'Security Risk',
      description: risk,
      recommendation: 'Review and address this risk before submitting the policy to Skillable.',
    });
  }

  // Warnings
  for (const warning of policy.warnings) {
    items.push({
      severity: 'medium',
      category: 'Warning',
      description: warning,
      recommendation: 'Review this warning and adjust the policy configuration if needed.',
    });
  }

  // Unsupported combinations
  for (const combo of policy.unsupportedCombinations) {
    items.push({
      severity: 'medium',
      category: 'Unsupported Combination',
      description: combo,
      recommendation:
        'This combination has not been validated against official Skillable examples. Manual review required.',
    });
  }

  // Evidence classification summary
  const unverifiedCount = policy.evidenceSummary.classificationG;
  if (unverifiedCount > 0) {
    items.push({
      severity: 'medium',
      category: 'Evidence Quality',
      description: `${unverifiedCount} statement(s) are classified as unverified (Classification G) — they have no official Skillable sample.`,
      recommendation:
        'Review each unverified statement and confirm it is safe for your lab environment.',
    });
  }

  // Wildcard usage
  const wildcardStatements = policy.statements.filter((s) => {
    const json = JSON.stringify(s.jsonFragment);
    return json.includes('*');
  });
  if (wildcardStatements.length > 0) {
    items.push({
      severity: 'high',
      category: 'Wildcard Permissions',
      description: `${wildcardStatements.length} statement(s) use wildcard permissions (*). Wildcards grant broad access and increase abuse potential.`,
      recommendation:
        'Where possible, replace wildcards with specific actions or resource ARNs. If wildcards are necessary, document why.',
    });
  }

  // VM-specific checks
  const hasVMs = wizard.services.some(
    (s) => s.serviceId === 'azure-compute-vm' || s.serviceId === 'aws-ec2',
  );
  if (hasVMs) {
    const vmService = wizard.services.find(
      (s) => s.serviceId === 'azure-compute-vm' || s.serviceId === 'aws-ec2',
    );
    if (vmService && vmService.allowedSkus.length === 0) {
      items.push({
        severity: 'high',
        category: 'VM Security',
        description:
          'Virtual machines are allowed but no SKU/instance type restriction is configured. VMs are the most abused resource for activities like cryptocurrency mining.',
        recommendation:
          'Add specific allowed VM sizes or instance types to limit cost and abuse potential. This is a Skillable best practice.',
      });
    }
    if (vmService && vmService.allowedNames.length === 0 && wizard.provider === 'azure') {
      items.push({
        severity: 'medium',
        category: 'VM Security',
        description:
          'Azure VMs have no name restriction. Users can create unlimited VMs within the resource group quota.',
        recommendation:
          'Add specific allowed VM names to limit the number of VMs that can be created. This is the most secure option per Skillable best practices.',
      });
    }
  }

  // Background deployment
  if (wizard.deployment.method === 'background') {
    items.push({
      severity: 'high',
      category: 'Deployment Compatibility',
      description:
        'Background deployment is enabled. The ACP will be active during resource deployment, which may block template operations.',
      recommendation:
        'Ensure the policy permits all operations performed by the resource template. Add exceptions for template-deployed resources if needed.',
    });
  }

  // No services selected
  if (wizard.services.length === 0) {
    items.push({
      severity: 'low',
      category: 'Policy Completeness',
      description:
        'No services have been selected. The policy will block/deny all resource creation.',
      recommendation:
        'Select the cloud services required by the lab before generating the final policy.',
    });
  }

  // Custom JSON
  if (wizard.customJson && wizard.customJson.trim().length > 0) {
    items.push({
      severity: 'medium',
      category: 'Custom JSON',
      description:
        'Custom JSON has been provided. Custom JSON is not validated against official Skillable examples.',
      recommendation:
        'Manually review the custom JSON for correctness, security, and compatibility with Skillable.',
    });
  }

  // Determine overall risk
  const hasCritical = items.some((i) => i.severity === 'critical');
  const hasHigh = items.some((i) => i.severity === 'high');
  const hasMedium = items.some((i) => i.severity === 'medium');
  const overallRisk: SecurityReview['overallRisk'] = hasCritical
    ? 'critical'
    : hasHigh
      ? 'high'
      : hasMedium
        ? 'medium'
        : 'low';

  const summary = generateSummary(wizard, policy, items, overallRisk);

  return {
    projectName: wizard.project.projectName || 'Untitled Project',
    labProfileNumber: wizard.project.labProfileNumber || 'N/A',
    provider: wizard.provider ?? 'azure',
    generatedAt: new Date().toISOString(),
    sourceVersion: sourceManifest.sourceRepository.commitSha,
    items,
    overallRisk,
    summary,
  };
}

function generateSummary(
  wizard: WizardState,
  policy: GeneratedPolicy,
  items: SecurityReviewItem[],
  overallRisk: SecurityReview['overallRisk'],
): string {
  const providerLabel = wizard.provider === 'azure' ? 'Azure Policy' : 'AWS IAM';
  const serviceCount = wizard.services.length;
  const statementCount = policy.statements.length;
  const officialCount = policy.evidenceSummary.classificationA;
  const unverifiedCount = policy.evidenceSummary.classificationG;

  return [
    `Security Review Summary for: ${wizard.project.projectName || 'Untitled Project'}`,
    `Lab Profile Number: ${wizard.project.labProfileNumber || 'N/A'}`,
    `Cloud Provider: ${wizard.provider === 'azure' ? 'Microsoft Azure' : 'Amazon Web Services'}`,
    `Policy Model: ${providerLabel}`,
    `Source Version: ${sourceManifest.sourceRepository.commitSha}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    `Overall Risk Assessment: ${overallRisk.toUpperCase()}`,
    '',
    `Services Selected: ${serviceCount}`,
    `Policy Statements Generated: ${statementCount}`,
    `Statements with Official Skillable Evidence (Class A): ${officialCount}`,
    `Unverified Statements (Class G): ${unverifiedCount}`,
    '',
    `Security Items Identified: ${items.length}`,
    `  Critical: ${items.filter((i) => i.severity === 'critical').length}`,
    `  High: ${items.filter((i) => i.severity === 'high').length}`,
    `  Medium: ${items.filter((i) => i.severity === 'medium').length}`,
    `  Low: ${items.filter((i) => i.severity === 'low').length}`,
    `  Info: ${items.filter((i) => i.severity === 'info').length}`,
    '',
    'This security review summary is suitable for submission to Skillable as part of the lab authoring process.',
    'Review each item above and address any high or critical severity findings before deploying the policy.',
  ].join('\n');
}

export function securityReviewToText(review: SecurityReview): string {
  const lines: string[] = [review.summary, '', '─'.repeat(60), ''];

  for (const item of review.items) {
    lines.push(`[${item.severity.toUpperCase()}] ${item.category}`);
    lines.push(`  Description: ${item.description}`);
    lines.push(`  Recommendation: ${item.recommendation}`);
    lines.push('');
  }

  return lines.join('\n');
}
