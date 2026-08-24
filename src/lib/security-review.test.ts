import { describe, it, expect } from 'vitest';
import { generateSecurityReview } from '@/lib/security-review';
import { generatePolicy } from '@/lib/policy-generator';
import { createEmptyWizardState } from '@/lib/storage';
import type { WizardState, ServiceSelection } from '@/types';

function makeWizard(overrides?: Partial<WizardState>): WizardState {
  return { ...createEmptyWizardState(), ...overrides };
}

describe('generateSecurityReview', () => {
  it('generates a review with project metadata', () => {
    const wizard = makeWizard({
      provider: 'azure',
      project: {
        ...createEmptyWizardState().project,
        projectName: 'Test Project',
        labProfileNumber: 'CLD-AZR-SBX-001',
      },
    });
    const policy = generatePolicy(wizard);
    const review = generateSecurityReview(wizard, policy);

    expect(review.projectName).toBe('Test Project');
    expect(review.labProfileNumber).toBe('CLD-AZR-SBX-001');
    expect(review.provider).toBe('azure');
    expect(review.generatedAt).toBeDefined();
    expect(review.sourceVersion).toBeDefined();
  });

  it('identifies wildcard permissions as a risk', () => {
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['t2.micro'],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const policy = generatePolicy(wizard);
    const review = generateSecurityReview(wizard, policy);

    expect(review.items.some((i) => i.category === 'Wildcard Permissions')).toBe(true);
  });

  it('flags missing VM SKU restrictions', () => {
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);
    const review = generateSecurityReview(wizard, policy);

    expect(review.items.some((i) => i.category === 'VM Security' && i.severity === 'high')).toBe(
      true,
    );
  });

  it('flags background deployment as high severity', () => {
    const wizard = makeWizard({
      provider: 'azure',
      deployment: {
        method: 'background',
        lifecycleActions: false,
        validationScripts: false,
        cleanupScripts: false,
        deploymentFailureBehaviour: '',
        labSaveEnabled: true,
      },
    });
    const policy = generatePolicy(wizard);
    const review = generateSecurityReview(wizard, policy);

    expect(
      review.items.some((i) => i.category === 'Deployment Compatibility' && i.severity === 'high'),
    ).toBe(true);
  });

  it('calculates overall risk correctly', () => {
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);
    const review = generateSecurityReview(wizard, policy);

    // Missing SKU restriction should make it at least high risk
    expect(['high', 'critical']).toContain(review.overallRisk);
  });

  it('includes a summary suitable for submission', () => {
    const wizard = makeWizard({
      provider: 'azure',
      project: {
        ...createEmptyWizardState().project,
        projectName: 'Submission Test',
      },
    });
    const policy = generatePolicy(wizard);
    const review = generateSecurityReview(wizard, policy);

    expect(review.summary).toContain('Submission Test');
    expect(review.summary).toContain('Security Review Summary');
    expect(review.summary).toContain('Overall Risk Assessment');
    expect(review.summary).toContain('suitable for submission');
  });
});
