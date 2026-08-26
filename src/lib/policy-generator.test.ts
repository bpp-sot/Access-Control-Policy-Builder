import { describe, it, expect } from 'vitest';
import { generatePolicy } from '@/lib/policy-generator';
import { createEmptyWizardState } from '@/lib/storage';
import type { WizardState, ServiceSelection } from '@/types';

function makeWizard(overrides?: Partial<WizardState>): WizardState {
  return { ...createEmptyWizardState(), ...overrides };
}

function collectAllowActions(policyJson: unknown): {
  actions: string[];
  statements: Array<{ Action: string | string[]; Resource: string | string[]; Effect: string }>;
} {
  const json = policyJson as {
    Statement: Array<{ Action: string | string[]; Resource: string | string[]; Effect: string }>;
  };
  const statements = json.Statement.filter((s) => s.Effect === 'Allow');
  const actions = statements.flatMap((s) => (Array.isArray(s.Action) ? s.Action : [s.Action]));
  return { actions, statements };
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

  it('whitelists Microsoft.Compute/disks (managed disks) when VMs are selected', () => {
    // This is the regression test for the original deployment failure:
    // a policy allowing VMs but blocking Microsoft.Compute/disks caused
    // Azure deployment to fail because Azure creates an OS managed disk
    // automatically when provisioning a VM.
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);

    // The generated policy JSON must include an equals condition for
    // Microsoft.Compute/disks in the anyOf whitelist.
    const json = policy.policyJson as {
      if: { not: { anyOf: Array<Record<string, unknown>> } };
    };
    const anyOfJson = JSON.stringify(json.if.not.anyOf);
    expect(anyOfJson).toContain('Microsoft.Compute/disks');

    // There should be a statement explaining the managed disk whitelisting
    const diskStmt = policy.statements.find((s) => s.description.includes('managed disks'));
    expect(diskStmt).toBeDefined();
    expect(diskStmt?.plainEnglish).toContain('Microsoft.Compute/disks');
    // Should be Classification C (native Azure documentation), not A
    expect(diskStmt?.evidence.classification).toBe('C');
  });

  it('uses equals (not contains) for managed disks to avoid substring over-admission', () => {
    // Remark 4: "contains" is a substring match that can unintentionally
    // admit child resource types. The VM supporting types should use
    // "equals" for precise type matching.
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);

    const json = policy.policyJson as {
      if: { not: { anyOf: Array<Record<string, unknown>> } };
    };

    // Find the anyOf entry for Microsoft.Compute/disks
    const diskEntry = json.if.not.anyOf.find((entry) => entry.equals === 'Microsoft.Compute/disks');
    expect(diskEntry).toBeDefined();
    expect(diskEntry?.equals).toBe('Microsoft.Compute/disks');
    // Should NOT use contains for disks
    const containsDiskEntry = json.if.not.anyOf.find(
      (entry) => entry.contains === 'Microsoft.Compute/disks',
    );
    expect(containsDiskEntry).toBeUndefined();
  });

  it('does NOT whitelist VM extensions by default (opt-in only)', () => {
    // Remark 2: VM extensions are not required for basic VM deployment.
    // They should NOT be auto-whitelisted — only included when the user
    // explicitly opts in via customResourceTypes.
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [], // no extensions opted in
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);

    const json = policy.policyJson as {
      if: { not: { anyOf: Array<Record<string, unknown>> } };
    };
    const anyOfJson = JSON.stringify(json.if.not.anyOf);

    // VMs and managed disks should be present
    expect(anyOfJson).toContain('Microsoft.Compute/virtualMachines');
    expect(anyOfJson).toContain('Microsoft.Compute/disks');
    // Extensions should NOT be present
    expect(anyOfJson).not.toContain('Microsoft.Compute/virtualMachines/extensions');

    // Should not have an extensions statement
    const extStmt = policy.statements.find((s) => s.description.includes('extensions'));
    expect(extStmt).toBeUndefined();
  });

  it('whitelists VM extensions when opted in via customResourceTypes', () => {
    // When the user opts in to extensions via the dependency panel,
    // the extension resource type is added to customResourceTypes and
    // the generator should whitelist it using equals.
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: ['Microsoft.Compute/virtualMachines/extensions'],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);

    const json = policy.policyJson as {
      if: { not: { anyOf: Array<Record<string, unknown>> } };
    };
    const anyOfJson = JSON.stringify(json.if.not.anyOf);

    // Extensions should now be present with equals
    expect(anyOfJson).toContain('Microsoft.Compute/virtualMachines/extensions');
    const extEntry = json.if.not.anyOf.find(
      (entry) => entry.equals === 'Microsoft.Compute/virtualMachines/extensions',
    );
    expect(extEntry).toBeDefined();

    // Should have an extensions statement with a warning about opting in
    const extStmt = policy.statements.find((s) => s.description.includes('extensions'));
    expect(extStmt).toBeDefined();
    expect(extStmt?.warnings.some((w) => w.includes('opted in'))).toBe(true);
  });

  it('regression: VM whitelist contains exactly VMs and disks (not extensions) by default', () => {
    // Remark 3: Full regression test asserting the exact whitelist entries
    // when VMs are selected without opting in to extensions.
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);

    const json = policy.policyJson as {
      if: { not: { anyOf: Array<Record<string, unknown>> } };
    };

    // Collect all type conditions from the anyOf
    const typeConditions: string[] = [];
    for (const entry of json.if.not.anyOf) {
      if (entry.equals) typeConditions.push(entry.equals as string);
      if (entry.contains) typeConditions.push(entry.contains as string);
      // Check inside allOf blocks
      if (entry.allOf) {
        for (const cond of entry.allOf as Array<Record<string, unknown>>) {
          if (cond.equals) typeConditions.push(cond.equals as string);
          if (cond.in) typeConditions.push('(SKU/name/location condition)');
        }
      }
    }

    // Must include VMs and managed disks
    expect(typeConditions).toContain('Microsoft.Compute/virtualMachines');
    expect(typeConditions).toContain('Microsoft.Compute/disks');
    // Must NOT include extensions
    expect(typeConditions).not.toContain('Microsoft.Compute/virtualMachines/extensions');
  });

  it('whitelists Microsoft.Compute/disks when VMSS is selected', () => {
    const vmssService: ServiceSelection = {
      serviceId: 'azure-compute-vmss',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: [],
      maxCapacity: 5,
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmssService] });
    const policy = generatePolicy(wizard);

    const json = policy.policyJson as {
      if: { not: { anyOf: Array<Record<string, unknown>> } };
    };
    const anyOfJson = JSON.stringify(json.if.not.anyOf);
    expect(anyOfJson).toContain('Microsoft.Compute/disks');
  });

  it('does not warn about missing managed disks dependency (auto-included)', () => {
    // Managed disks are autoIncluded — the generator whitelists them
    // automatically. So even if no other service is selected, the
    // managed disks dependency should NOT appear as a missing required dep.
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);

    // Should NOT warn about missing Managed Disks (it's auto-included)
    expect(
      policy.warnings.some((w) => w.includes('Managed Disks') && w.includes('not selected')),
    ).toBe(false);
    // Should NOT flag managed disks as a missing required dependency
    expect(
      policy.securityRisks.some(
        (r) => r.includes('Missing required dependency') && r.includes('Managed Disks'),
      ),
    ).toBe(false);
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

  it('generates specific IAM actions when operations are selected (not wildcards)', () => {
    // The core fix: selecting operations should produce specific IAM
    // actions, not a wildcard. This is what addresses the user's report
    // of unresolvable wildcard security risk warnings.
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['view', 'list', 'start', 'stop'],
      customResourceTypes: [],
      allowedSkus: ['t2.micro'],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const policy = generatePolicy(wizard);

    const { actions } = collectAllowActions(policy.policyJson);
    // Should NOT contain a wildcard
    expect(actions.some((a) => a.includes('*'))).toBe(false);
    // Should contain specific actions derived from the operations
    expect(actions).toContain('ec2:DescribeInstances'); // from view + list
    expect(actions).toContain('ec2:StartInstances'); // from start
    expect(actions).toContain('ec2:StopInstances'); // from stop
  });

  it('falls back to wildcard when no operations are selected', () => {
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: [], // no operations selected
      customResourceTypes: [],
      allowedSkus: ['t2.micro'],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const policy = generatePolicy(wizard);

    const json = policy.policyJson as {
      Statement: Array<{ Action: string | string[]; Effect: string }>;
    };
    const allowStmt = json.Statement.find((s) => s.Effect === 'Allow');
    const actions = Array.isArray(allowStmt!.Action) ? allowStmt!.Action : [allowStmt!.Action];
    expect(actions).toContain('ec2:*');

    // Should warn about wildcard usage
    expect(policy.warnings.some((w) => w.includes('wildcard'))).toBe(true);
    expect(policy.securityRisks.some((r) => r.includes('wildcard'))).toBe(true);
  });

  it('does not produce wildcard security risk when operations are selected', () => {
    // The user's core complaint: wildcard security risks they can't address.
    // When operations ARE selected, there should be no wildcard risk.
    const s3Service: ServiceSelection = {
      serviceId: 'aws-s3',
      operations: ['view', 'list', 'upload', 'download'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [s3Service] });
    const policy = generatePolicy(wizard);

    // Should NOT have a wildcard security risk for S3
    expect(policy.securityRisks.some((r) => r.includes('S3') && r.includes('wildcard'))).toBe(
      false,
    );
  });

  it('uses resource ARN restrictions when allowedNames are provided', () => {
    const s3Service: ServiceSelection = {
      serviceId: 'aws-s3',
      operations: ['view', 'list'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: ['arn:aws:s3:::my-lab-bucket'],
    };
    const wizard = makeWizard({ provider: 'aws', services: [s3Service] });
    const policy = generatePolicy(wizard);

    const { statements } = collectAllowActions(policy.policyJson);
    // view/list map to Get*/List* which stay on Resource "*" (Describe-style).
    // A mutating action with an ARN restriction is tested via upload.
    expect(statements.some((s) => s.Resource === '*')).toBe(true);

    const mutatingService: ServiceSelection = {
      serviceId: 'aws-s3',
      operations: ['upload'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: ['arn:aws:s3:::my-lab-bucket'],
    };
    const mutatingPolicy = generatePolicy(
      makeWizard({ provider: 'aws', services: [mutatingService] }),
    );
    const mutating = collectAllowActions(mutatingPolicy.policyJson);
    const scoped = mutating.statements.find((s) => {
      const acts = Array.isArray(s.Action) ? s.Action : [s.Action];
      return acts.includes('s3:PutObject');
    });
    expect(scoped).toBeDefined();
    expect(scoped!.Resource).toBe('arn:aws:s3:::my-lab-bucket');
  });

  it('generates specific IAM actions for IAM service with privilege escalation warning', () => {
    const iamService: ServiceSelection = {
      serviceId: 'aws-iam',
      operations: ['view', 'list', 'create'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [iamService] });
    const policy = generatePolicy(wizard);

    // Should have specific actions, not wildcard
    const { actions } = collectAllowActions(policy.policyJson);
    expect(actions.some((a) => a === 'iam:*')).toBe(false);
    expect(actions).toContain('iam:GetUser'); // from view
    expect(actions).toContain('iam:ListUsers'); // from list
    expect(actions).toContain('iam:CreateUser'); // from create

    // Should still warn about IAM privilege escalation even with specific actions
    expect(policy.warnings.some((w) => w.includes('escalate') || w.includes('privilege'))).toBe(
      true,
    );
    expect(policy.securityRisks.some((r) => r.includes('IAM'))).toBe(true);
  });

  it('does not warn about missing sample for VPC (covered by EC2 samples)', () => {
    const vpcService: ServiceSelection = {
      serviceId: 'aws-vpc',
      operations: ['view', 'list'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [vpcService] });
    const policy = generatePolicy(wizard);

    // VPC uses ec2: prefix which IS covered by official samples
    expect(policy.warnings.some((w) => w.includes('VPC') && w.includes('No official'))).toBe(false);
    expect(policy.unsupportedCombinations.some((u) => u.includes('VPC'))).toBe(false);
  });

  it('auto-includes EC2 launch-wizard Describe* actions for a create-only selection', () => {
    // Regression for the console Network Settings failure:
    // "No VPCs found" / "No subnets found" when only RunInstances is granted.
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['t2.micro'],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const policy = generatePolicy(wizard);
    const { actions } = collectAllowActions(policy.policyJson);

    expect(actions).toContain('ec2:RunInstances');
    expect(actions).toContain('ec2:DescribeVpcs');
    expect(actions).toContain('ec2:DescribeSubnets');
    expect(actions).toContain('ec2:DescribeSecurityGroups');
    expect(actions).toContain('ec2:DescribeImages');
    expect(actions).toContain('ec2:DescribeInstanceTypes');
    expect(actions).toContain('ec2:DescribeKeyPairs');
    expect(actions).toContain('ec2:DescribeAvailabilityZones');
    expect(actions).toContain('ec2:CreateVolume');
    expect(actions).toContain('ec2:CreateNetworkInterface');

    const discoveryStmt = policy.statements.find((s) =>
      s.description.includes('launch wizard discovery'),
    );
    expect(discoveryStmt).toBeDefined();
    expect(discoveryStmt?.evidence.classification).toBe('D');
    expect(discoveryStmt?.evidence.sourceUrl).toContain('iam-policies-ec2-console');
  });

  it('does not auto-include optional EC2 actions such as AllocateAddress or CreateTags', () => {
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['t2.micro'],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const { actions } = collectAllowActions(generatePolicy(wizard).policyJson);

    expect(actions).not.toContain('ec2:AllocateAddress');
    expect(actions).not.toContain('ec2:AssociateAddress');
    expect(actions).not.toContain('ec2:CreateTags');
    expect(actions).not.toContain('ec2:CreateKeyPair');
    expect(actions).not.toContain('ec2:AuthorizeSecurityGroupIngress');
  });

  it('includes optional EC2 actions when the author opts in via customResourceTypes', () => {
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['create'],
      customResourceTypes: ['elastic-ip', 'instance', 'security-group', 'key-pair'],
      allowedSkus: ['t2.micro'],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const { actions } = collectAllowActions(generatePolicy(wizard).policyJson);

    expect(actions).toContain('ec2:AllocateAddress');
    expect(actions).toContain('ec2:AssociateAddress');
    expect(actions).toContain('ec2:CreateTags');
    expect(actions).toContain('ec2:CreateKeyPair');
    expect(actions).toContain('ec2:CreateSecurityGroup');
    expect(actions).toContain('ec2:AuthorizeSecurityGroupIngress');
  });

  it('keeps EC2 Describe* actions on Resource * even when ARNs are restricted', () => {
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['t2.micro'],
      allowedNames: ['arn:aws:ec2:eu-west-2:123456789012:instance/*'],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const { statements } = collectAllowActions(generatePolicy(wizard).policyJson);

    const describeStmt = statements.find((s) => {
      const acts = Array.isArray(s.Action) ? s.Action : [s.Action];
      return acts.includes('ec2:DescribeVpcs');
    });
    expect(describeStmt).toBeDefined();
    expect(describeStmt!.Resource).toBe('*');

    const runStmt = statements.find((s) => {
      const acts = Array.isArray(s.Action) ? s.Action : [s.Action];
      return acts.includes('ec2:RunInstances');
    });
    expect(runStmt).toBeDefined();
    expect(runStmt!.Resource).toBe('arn:aws:ec2:eu-west-2:123456789012:instance/*');
  });

  it('warns about optional EC2 dependencies that were not selected', () => {
    const ec2Service: ServiceSelection = {
      serviceId: 'aws-ec2',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['t2.micro'],
      allowedNames: [],
    };
    const wizard = makeWizard({ provider: 'aws', services: [ec2Service] });
    const policy = generatePolicy(wizard);

    expect(policy.warnings.some((w) => w.includes('Public IP / Elastic IP'))).toBe(true);
    expect(policy.warnings.some((w) => w.includes('Instance Name Tags'))).toBe(true);
    expect(policy.securityRisks.some((r) => r.includes('Missing required dependency'))).toBe(false);
  });
});

describe('generatePolicy — Azure VM dependency awareness', () => {
  it('warns when VMs are selected without required networking dependency', () => {
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create', 'start', 'stop', 'delete'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    // VM selected, but Networking is NOT selected
    const wizard = makeWizard({ provider: 'azure', services: [vmService] });
    const policy = generatePolicy(wizard);

    // Should warn about missing required dependency
    expect(
      policy.warnings.some((w) => w.includes('Virtual Machines') && w.includes('Networking')),
    ).toBe(true);
    // Should flag as a security risk (deployment may fail)
    expect(policy.securityRisks.some((r) => r.includes('Missing required dependency'))).toBe(true);
  });

  it('does not warn about required dependencies when networking is also selected', () => {
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    const networkingService: ServiceSelection = {
      serviceId: 'azure-networking',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({
      provider: 'azure',
      services: [vmService, networkingService],
    });
    const policy = generatePolicy(wizard);

    // Should NOT warn about missing required Networking dependency
    expect(
      policy.warnings.some(
        (w) => w.includes('Virtual Machines') && w.includes('requires') && w.includes('Networking'),
      ),
    ).toBe(false);
    expect(policy.securityRisks.some((r) => r.includes('Missing required dependency'))).toBe(false);
  });

  it('warns about optional dependencies (storage, public IP) when not selected', () => {
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    const networkingService: ServiceSelection = {
      serviceId: 'azure-networking',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    // VM + Networking selected, but Storage (optional dep) is NOT
    const wizard = makeWizard({
      provider: 'azure',
      services: [vmService, networkingService],
    });
    const policy = generatePolicy(wizard);

    // Should warn about optional Storage Accounts dependency
    expect(policy.warnings.some((w) => w.includes('Storage Accounts'))).toBe(true);
    // But should NOT flag it as a security risk (it is optional)
    const storageRisk = policy.securityRisks.find((r) => r.includes('Storage Accounts'));
    expect(storageRisk).toBeUndefined();
  });

  it('warns when VMSS is selected without required networking and storage dependencies', () => {
    const vmssService: ServiceSelection = {
      serviceId: 'azure-compute-vmss',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: [],
      maxCapacity: 5,
    };
    const wizard = makeWizard({ provider: 'azure', services: [vmssService] });
    const policy = generatePolicy(wizard);

    // VMSS requires both Networking and Storage
    expect(
      policy.warnings.some(
        (w) => w.includes('Virtual Machine Scale Sets') && w.includes('Networking'),
      ),
    ).toBe(true);
    expect(
      policy.warnings.some(
        (w) => w.includes('Virtual Machine Scale Sets') && w.includes('Storage'),
      ),
    ).toBe(true);
    expect(policy.securityRisks.some((r) => r.includes('Missing required dependency'))).toBe(true);
  });

  it('does not produce dependency warnings when all required deps are included', () => {
    const vmService: ServiceSelection = {
      serviceId: 'azure-compute-vm',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: ['Standard_B1s'],
      allowedNames: ['VM-1'],
    };
    const networkingService: ServiceSelection = {
      serviceId: 'azure-networking',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const storageService: ServiceSelection = {
      serviceId: 'azure-storage',
      operations: ['create'],
      customResourceTypes: [],
      allowedSkus: [],
      allowedNames: [],
    };
    const wizard = makeWizard({
      provider: 'azure',
      services: [vmService, networkingService, storageService],
    });
    const policy = generatePolicy(wizard);

    // No required-dependency warnings
    expect(policy.securityRisks.some((r) => r.includes('Missing required dependency'))).toBe(false);
  });
});
