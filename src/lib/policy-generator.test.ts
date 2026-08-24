import { describe, it, expect } from 'vitest';
import { generatePolicy } from '@/lib/policy-generator';
import { createEmptyWizardState } from '@/lib/storage';
import type { WizardState, ServiceSelection } from '@/types';

function makeWizard(overrides?: Partial<WizardState>): WizardState {
  return { ...createEmptyWizardState(), ...overrides };
}

describe('generatePolicy — Azure', () => {
  it('throws if no provider is selected', () => {
    const wizard = makeWizard({ provider: null });
    expect(() => generatePolicy(wizard)).toThrow('no cloud provider');
  });

  it('generates a deny-all policy when no services are selected', () => {
    const wizard = makeWizard({ provider: 'azure' });
    const policy = generatePolicy(wizard);
    expect(policy.provider).toBe('azure');
    expect(policy.policyJson).toBeDefined();
    expect(policy.warnings.length).toBeGreaterThan(0);
    expect(policy.warnings.some((w) => w.includes('No services selected'))).toBe(true);
  });

  it('generates a whitelist policy with VM restrictions', () => {
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create', 'start', 'stop', 'delete'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1', 'VM-2'],
    };
    const wizard = makeWizard({
      provider: 'azure',
      services: [vmService],
      region: {
        approvedLocations: ['eastus'],
        primaryLocation: 'eastus',
        globalResourcesRequired: true,
      },
    });
    const policy = generatePolicy(wizard);

    expect(policy.provider).toBe('azure');
    const json = policy.policyJson as {
      if: { not: { anyOf: unknown[] } };
      then: { effect: string };
    };
    expect(json.if).toBeDefined();
    expect(json.then.effect).toBe('Deny');

    // Should have a statement with Class A evidence
    const classA = policy.statements.filter((s) => s.evidence.classification === 'A');
    expect(classA.length).toBeGreaterThan(0);

    // Should have VM-specific statement
    const vmStmt = policy.statements.find((s) => s.description.includes('virtual machines'));
    expect(vmStmt).toBeDefined();
    expect(vmStmt?.plainEnglish).toContain('Standard_B1s');
    expect(vmStmt?.plainEnglish).toContain('VM-1');
  });

  it('warns when VM has no SKU restriction', () => {
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);

    expect(policy.securityRisks.some((r) => r.includes('no SKU restriction'))).toBe(true);
  });

  it('warns about background deployment', () => {
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
    expect(policy.warnings.some((w) => w.includes('Background deployment'))).toBe(true);
    expect(policy.securityRisks.some((r) => r.includes('Background deployment'))).toBe(true);
  });

  it('flags services without official samples', () => {
    const keyVaultService: ServiceSelection = {
      serviceId: 'azure-keyvault',
      operations: ['view'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'azure', services: [keyVaultService] });
    const policy = generatePolicy(wizard);
    expect(policy.warnings.some((w) => w.includes('Key Vault'))).toBe(true);
    expect(policy.unsupportedCombinations.some((u) => u.includes('Key Vault'))).toBe(true);
  });

  it('includes region restriction when locations are specified', () => {
    const wizard = makeWizard({
      provider: 'azure',
      region: {
        approvedLocations: ['eastus', 'westus'],
        primaryLocation: 'eastus',
        globalResourcesRequired: true,
      },
    });
    const policy = generatePolicy(wizard);
    const regionStmt = policy.statements.find((s) => s.description.includes('locations'));
    expect(regionStmt).toBeDefined();
  });
});

describe('generatePolicy — AWS', () => {
  it('generates an AWS IAM policy with Version 2012-10-17', () => {
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['create', 'start', 'stop', 'delete'],
      customResourceTypes: [],
      allowedSkus: ['t2.micro'],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const policy = generatePolicy(wizard);

    expect(policy.provider).toBe('aws');
    const json = policy.policyJson as { Version: string; Statement: unknown[] };
    expect(json.Version).toBe('2012-10-17');
    expect(json.Statement.length).toBeGreaterThan(0);
  });

  it('generates a Deny statement for unapproved EC2 instance types', () => {
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['t2.micro', 't2.small'],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const policy = generatePolicy(wizard);

    const denyStmt = policy.statements.find((s) =>
      s.description.includes('unapproved instance types'),
    );
    expect(denyStmt).toBeDefined();
    expect(denyStmt?.plainEnglish).toContain('t2.micro');
    expect(denyStmt?.plainEnglish).toContain('t2.small');
  });

  it('warns when EC2 has no instance type restriction', () => {
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const policy = generatePolicy(wizard);
    expect(policy.securityRisks.some((r) => r.includes('no instance type restriction'))).toBe(true);
  });

  it('warns about AWS region restriction limitations', () => {
    const wizard = makeWizard({
      provider: 'aws',
      region: {
        approvedLocations: ['us-east-1'],
        primaryLocation: 'us-east-1',
        globalResourcesRequired: false,
      },
    });
    const policy = generatePolicy(wizard);
    expect(policy.warnings.some((w) => w.includes('region restriction'))).toBe(true);
    expect(
      policy.unsupportedCombinations.some(
        (u) => u.includes('location restrictions') || u.includes('region'),
      ),
    ).toBe(true);
  });

  it('generates a deny-all policy when no services selected', () => {
    const wizard = makeWizard({ provider: 'aws' });
    const policy = generatePolicy(wizard);
    const json = policy.policyJson as { Statement: Array<{ Effect: string; Action: string }> };
    expect(json.Statement.some((s) => s.Effect === 'Deny' && s.Action === '*')).toBe(true);
  });
});
