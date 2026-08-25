import type {
  CloudProvider,
  GeneratedPolicy,
  GeneratedStatement,
  EvidenceReference,
  WizardState,
} from '@/types';
import azurePatterns from '@data/azure-patterns.json';
import awsPatterns from '@data/aws-patterns.json';
import serviceCatalogue from '@data/service-catalogue.json';
import type { AzurePattern, AwsPattern, ServiceCatalogueEntry } from '@/types';

const azurePatternList = azurePatterns.patterns as AzurePattern[];
const awsPatternList = awsPatterns.patterns as AwsPattern[];
const azureServices = serviceCatalogue.azureServices as ServiceCatalogueEntry[];
const awsServices = serviceCatalogue.awsServices as ServiceCatalogueEntry[];

function findAzurePattern(id: string): AzurePattern | undefined {
  return azurePatternList.find((p) => p.id === id);
}

function findAwsPattern(id: string): AwsPattern | undefined {
  return awsPatternList.find((p) => p.id === id);
}

function findAzureService(id: string): ServiceCatalogueEntry | undefined {
  return azureServices.find((s) => s.id === id);
}

function findAwsService(id: string): ServiceCatalogueEntry | undefined {
  return awsServices.find((s) => s.id === id);
}

function makeEvidence(
  classification: EvidenceReference['classification'],
  sourceTitle: string,
  sourcePath: string | null,
  sourceUrl: string | null,
  rationale: string,
  copiedOrParameterised: EvidenceReference['copiedOrParameterised'],
  confidence: EvidenceReference['confidence'],
): EvidenceReference {
  return {
    classification,
    sourceTitle,
    sourcePath,
    sourceUrl,
    rationale,
    copiedOrParameterised,
    confidence,
  };
}

function stmtId(prefix: string, n: number): string {
  return `${prefix}-stmt-${n}`;
}

// ─── Azure Policy Generator ──────────────────────────────────────────────

function generateAzurePolicy(wizard: WizardState): GeneratedPolicy {
  const statements: GeneratedStatement[] = [];
  const warnings: string[] = [];
  const unsupportedCombinations: string[] = [];
  const securityRisks: string[] = [];
  let n = 0;

  const services = wizard.services;
  const hasVMs = services.some((s) => s.serviceId === 'azure-compute-vm');
  const hasVMSS = services.some((s) => s.serviceId === 'azure-compute-vmss');
  const vmSelection = services.find((s) => s.serviceId === 'azure-compute-vm');
  const vmssSelection = services.find((s) => s.serviceId === 'azure-compute-vmss');

  // Collect all allowed resource types from selected services
  const allowedResourceTypes: string[] = [];
  for (const sel of services) {
    const svc = findAzureService(sel.serviceId);
    if (svc) {
      allowedResourceTypes.push(...svc.resourceTypes);
      allowedResourceTypes.push(...sel.customResourceTypes);
    }
  }

  // Check for services without official samples
  for (const sel of services) {
    const svc = findAzureService(sel.serviceId);
    if (svc && !svc.officialSampleAvailable) {
      warnings.push(
        `Service "${svc.name}" has no official Skillable sample. The generated policy for this service requires manual review.`,
      );
    }
  }

  // ── Dependency awareness ─────────────────────────────────────────────
  // Check whether selected services with dependencies have their required
  // supporting services also selected. Missing required dependencies will
  // cause Azure deployment failures even though the primary resource type
  // is permitted by the policy.
  // NOTE: Dependencies with autoIncluded=true are automatically whitelisted
  // by the generator (e.g. managed disks are part of the VM service's own
  // resourceTypes), so they are never "missing".
  const selectedServiceIds = new Set(services.map((s) => s.serviceId));
  for (const sel of services) {
    const svc = findAzureService(sel.serviceId);
    if (!svc?.dependencies) continue;

    const missingRequired = svc.dependencies.filter(
      (d) => d.required && !d.autoIncluded && !selectedServiceIds.has(d.serviceId),
    );
    const missingOptional = svc.dependencies.filter(
      (d) => !d.required && !d.autoIncluded && !selectedServiceIds.has(d.serviceId),
    );

    for (const dep of missingRequired) {
      warnings.push(
        `${svc.name} requires ${dep.serviceName} (${dep.resourceTypes.join(', ')}) as a supporting resource, but it is not selected. Azure deployment will likely fail without it. ${dep.reason}`,
      );
      securityRisks.push(
        `Missing required dependency: ${svc.name} needs ${dep.serviceName}. Deployment may fail.`,
      );
    }

    for (const dep of missingOptional) {
      warnings.push(
        `${svc.name} may require ${dep.serviceName} (${dep.resourceTypes.join(', ')}) depending on your lab requirements. It is not currently selected. ${dep.reason}`,
      );
    }
  }

  // Build the whitelist "anyOf" conditions
  const anyOfConditions: unknown[] = [];

  // VM-specific conditions
  if (hasVMs && vmSelection) {
    const vmAllOf: unknown[] = [{ field: 'type', equals: 'Microsoft.Compute/virtualMachines' }];

    if (vmSelection.allowedSkus.length > 0) {
      vmAllOf.push({
        field: 'Microsoft.Compute/virtualMachines/sku.name',
        in: vmSelection.allowedSkus,
      });
    }

    if (vmSelection.allowedNames.length > 0) {
      vmAllOf.push({
        field: 'name',
        in: vmSelection.allowedNames,
      });
    }

    // Region restriction for VMs
    if (wizard.region.approvedLocations.length > 0) {
      vmAllOf.push({
        field: 'location',
        in: wizard.region.approvedLocations,
      });
      if (wizard.region.globalResourcesRequired) {
        vmAllOf.push({
          field: 'location',
          notEquals: 'global',
        });
      }
    }

    anyOfConditions.push({ allOf: vmAllOf });

    // Evidence: VM whitelist pattern
    const pattern = findAzurePattern('azure-limit-vm-name-size-location');
    statements.push({
      id: stmtId('azure', ++n),
      description: `Allow virtual machines${vmSelection.allowedSkus.length > 0 ? ' with approved SKUs' : ''}${vmSelection.allowedNames.length > 0 ? ' with approved names' : ''}${wizard.region.approvedLocations.length > 0 ? ' in approved regions' : ''}`,
      plainEnglish: `Virtual machines are allowed${vmSelection.allowedSkus.length > 0 ? ` but only with these sizes: ${vmSelection.allowedSkus.join(', ')}` : ''}${vmSelection.allowedNames.length > 0 ? ` and only with these names: ${vmSelection.allowedNames.join(', ')}` : ''}${wizard.region.approvedLocations.length > 0 ? ` and only in these regions: ${wizard.region.approvedLocations.join(', ')}` : ''}. All other VMs are denied.`,
      evidence: makeEvidence(
        'A',
        pattern?.title ?? 'Azure VM whitelist samples',
        pattern?.sourcePath ?? null,
        pattern?.githubUrl ?? null,
        'VM whitelist pattern derived from official Skillable samples combining type, SKU, name, and location restrictions.',
        'parameterised',
        'high',
      ),
      jsonFragment: { allOf: vmAllOf },
      warnings:
        vmSelection.allowedSkus.length === 0
          ? [
              'No SKU restriction applied — VMs of any size can be created. This is a cost and abuse risk.',
            ]
          : [],
    });

    if (vmSelection.allowedSkus.length === 0) {
      securityRisks.push(
        'Virtual machines have no SKU restriction. Users can create expensive VM sizes. Add allowed SKUs to mitigate.',
      );
    }
    if (vmSelection.allowedNames.length === 0) {
      securityRisks.push(
        'Virtual machines have no name restriction. Users can create unlimited VMs. Add allowed names to mitigate.',
      );
    }

    // ── Whitelist VM supporting resource types ───────────────────────
    // Only resource types from autoIncluded dependencies are whitelisted
    // automatically (managed disks — Azure requires them for every VM).
    // Opt-in types (e.g. VM extensions) are only whitelisted if the user
    // has added them to vmSelection.customResourceTypes via the dependency
    // panel. This prevents over-permitting extensions for labs that don't
    // need them.
    // Operator: equals (not contains) is used for these supporting types
    // because they are precisely known and do not need substring matching.
    // This avoids unintentionally admitting child resource types.
    // Evidence: Classification C (native Azure documentation).
    const vmService = findAzureService('azure-compute-vm');
    if (vmService?.dependencies) {
      // Auto-included types (managed disks — required for every VM)
      const autoTypes = vmService.dependencies
        .filter((d) => d.autoIncluded)
        .flatMap((d) => d.resourceTypes);

      // Opt-in types from customResourceTypes (e.g. extensions)
      const optedInTypes = vmService.dependencies
        .filter((d) => !d.autoIncluded)
        .flatMap((d) => d.resourceTypes)
        .filter((rt) => vmSelection.customResourceTypes.includes(rt));

      // Auto-included: use equals for precision
      for (const rt of autoTypes) {
        anyOfConditions.push({ field: 'type', equals: rt });
      }
      if (autoTypes.length > 0) {
        statements.push({
          id: stmtId('azure', ++n),
          description: `Allow VM required supporting resources (managed disks)`,
          plainEnglish: `The following supporting resource types are automatically permitted because Azure requires them when deploying virtual machines: ${autoTypes.join(', ')}. Azure automatically creates an OS managed disk (Microsoft.Compute/disks) when provisioning a VM — without this, deployment will fail even though the VM type itself is allowed. Uses exact type matching (equals) to avoid admitting unintended child resource types.`,
          evidence: makeEvidence(
            'C',
            'Azure documentation — Managed Disks',
            null,
            'https://learn.microsoft.com/azure/virtual-machines/managed-disks-overview',
            'Azure automatically creates a managed disk for the OS disk when provisioning a standard VM. This is native Azure platform behaviour documented in the Azure Managed Disks overview, not a Skillable-specific rule. Without whitelisting Microsoft.Compute/disks, VM deployment will fail under the Access Control Policy.',
            'application-generated',
            'high',
          ),
          jsonFragment: autoTypes.map((rt) => ({ field: 'type', equals: rt })),
          warnings: [
            'Managed disks (Microsoft.Compute/disks) are whitelisted automatically because Azure requires them for VM OS disks. This is based on native Azure documentation (Classification C), not a Skillable sample. Uses exact type matching (equals).',
          ],
        });
      }

      // Opt-in: use equals for precision
      for (const rt of optedInTypes) {
        anyOfConditions.push({ field: 'type', equals: rt });
      }
      if (optedInTypes.length > 0) {
        statements.push({
          id: stmtId('azure', ++n),
          description: `Allow VM optional supporting resources (extensions)`,
          plainEnglish: `The following optional supporting resource types are permitted because you opted in via the dependency panel: ${optedInTypes.join(', ')}. VM extensions are not required for basic VM deployment — only opt in if the lab uses extensions (e.g. custom script, domain join, monitoring agent). Uses exact type matching (equals).`,
          evidence: makeEvidence(
            'C',
            'Azure documentation — Virtual Machine Extensions',
            null,
            'https://learn.microsoft.com/azure/virtual-machines/extensions/overview',
            'VM extensions are optional post-deployment configuration tools. Not required for basic VM deployment. Whitelisted only because the user explicitly opted in via the dependency panel.',
            'application-generated',
            'medium',
          ),
          jsonFragment: optedInTypes.map((rt) => ({ field: 'type', equals: rt })),
          warnings: [
            'VM extensions are whitelisted because you opted in. Extensions can execute arbitrary scripts on the VM — review whether they are needed for your lab.',
          ],
        });
      }
    }
  }

  // VMSS-specific conditions
  if (hasVMSS && vmssSelection) {
    const vmssAllOf: unknown[] = [
      { field: 'type', equals: 'Microsoft.Compute/virtualMachineScaleSets' },
    ];

    if (vmssSelection.allowedSkus.length > 0) {
      vmssAllOf.push({
        field: 'Microsoft.Compute/virtualMachineScaleSets/sku.name',
        in: vmssSelection.allowedSkus,
      });
    }

    if (vmssSelection.allowedNames.length > 0) {
      vmssAllOf.push({
        field: 'name',
        in: vmssSelection.allowedNames,
      });
    }

    if (vmssSelection.maxCapacity !== undefined && vmssSelection.maxCapacity > 0) {
      vmssAllOf.push({
        field: 'Microsoft.Compute/virtualMachineScaleSets/sku.capacity',
        lessOrEquals: vmssSelection.maxCapacity,
      });
    }

    if (wizard.region.approvedLocations.length > 0) {
      vmssAllOf.push({
        field: 'location',
        in: wizard.region.approvedLocations,
      });
      if (wizard.region.globalResourcesRequired) {
        vmssAllOf.push({
          field: 'location',
          notEquals: 'global',
        });
      }
    }

    anyOfConditions.push({ allOf: vmssAllOf });

    const pattern = findAzurePattern('azure-limit-vm-vmss-name-sku-region-capacity');
    statements.push({
      id: stmtId('azure', ++n),
      description: `Allow virtual machine scale sets with constraints`,
      plainEnglish: `Virtual machine scale sets are allowed${vmssSelection.allowedSkus.length > 0 ? ` with sizes: ${vmssSelection.allowedSkus.join(', ')}` : ''}${vmssSelection.allowedNames.length > 0 ? ` with names: ${vmssSelection.allowedNames.join(', ')}` : ''}${vmssSelection.maxCapacity ? ` with max capacity: ${vmssSelection.maxCapacity}` : ''}. All other scale sets are denied.`,
      evidence: makeEvidence(
        'A',
        pattern?.title ?? 'Azure VMSS whitelist samples',
        pattern?.sourcePath ?? null,
        pattern?.githubUrl ?? null,
        'VMSS whitelist pattern derived from official Skillable sample with capacity limits.',
        'parameterised',
        'high',
      ),
      jsonFragment: { allOf: vmssAllOf },
      warnings:
        vmssSelection.maxCapacity === undefined
          ? [
              'No capacity limit set — scale sets can scale without bound. Consider setting maxCapacity.',
            ]
          : [],
    });

    if (vmssSelection.maxCapacity === undefined) {
      securityRisks.push(
        'VM scale sets have no capacity limit. Users can scale to many instances. Set maxCapacity to mitigate.',
      );
    }

    // ── Whitelist VMSS supporting resource types ─────────────────────
    // VMSS instances require managed disks (Microsoft.Compute/disks) for
    // their OS disks, just like standalone VMs. Uses equals for precision.
    const vmssService = findAzureService('azure-compute-vmss');
    if (vmssService?.dependencies) {
      const vmssAutoTypes = vmssService.dependencies
        .filter((d) => d.autoIncluded)
        .flatMap((d) => d.resourceTypes);

      const vmssOptedInTypes = vmssService.dependencies
        .filter((d) => !d.autoIncluded)
        .flatMap((d) => d.resourceTypes)
        .filter((rt) => vmssSelection.customResourceTypes.includes(rt));

      for (const rt of vmssAutoTypes) {
        anyOfConditions.push({ field: 'type', equals: rt });
      }
      if (vmssAutoTypes.length > 0) {
        statements.push({
          id: stmtId('azure', ++n),
          description: `Allow VMSS required supporting resources (managed disks)`,
          plainEnglish: `The following supporting resource types are automatically permitted because Azure requires them when deploying virtual machine scale sets: ${vmssAutoTypes.join(', ')}. VMSS instances require managed disks for OS disks, same as standalone VMs. Uses exact type matching (equals).`,
          evidence: makeEvidence(
            'C',
            'Azure documentation — Managed Disks',
            null,
            'https://learn.microsoft.com/azure/virtual-machine-scale-sets/overview',
            'Azure automatically creates managed disks for VMSS instance OS disks. This is native Azure platform behaviour, not a Skillable-specific rule.',
            'application-generated',
            'high',
          ),
          jsonFragment: vmssAutoTypes.map((rt) => ({ field: 'type', equals: rt })),
          warnings: [
            'Managed disks are whitelisted automatically for VMSS. Based on native Azure documentation (Classification C). Uses exact type matching (equals).',
          ],
        });
      }

      for (const rt of vmssOptedInTypes) {
        anyOfConditions.push({ field: 'type', equals: rt });
      }
      if (vmssOptedInTypes.length > 0) {
        statements.push({
          id: stmtId('azure', ++n),
          description: `Allow VMSS optional supporting resources`,
          plainEnglish: `The following optional supporting resource types are permitted because you opted in: ${vmssOptedInTypes.join(', ')}. Uses exact type matching (equals).`,
          evidence: makeEvidence(
            'C',
            'Azure documentation — VM Scale Sets',
            null,
            'https://learn.microsoft.com/azure/virtual-machine-scale-sets/overview',
            'Optional supporting resources whitelisted because the user explicitly opted in via the dependency panel.',
            'application-generated',
            'medium',
          ),
          jsonFragment: vmssOptedInTypes.map((rt) => ({ field: 'type', equals: rt })),
          warnings: [],
        });
      }
    }
  }

  // Non-VM services: add by resource type
  for (const sel of services) {
    const svc = findAzureService(sel.serviceId);
    if (!svc) continue;
    if (svc.id === 'azure-compute-vm' || svc.id === 'azure-compute-vmss') continue;

    for (const rt of svc.resourceTypes) {
      anyOfConditions.push({ field: 'type', contains: rt });
    }

    for (const crt of sel.customResourceTypes) {
      anyOfConditions.push({ field: 'type', contains: crt });
    }

    const hasSample = svc.officialSampleAvailable;
    statements.push({
      id: stmtId('azure', ++n),
      description: `Allow ${svc.name} resources`,
      plainEnglish: `${svc.name} resources (${svc.resourceTypes.join(', ')}) are allowed. All other resource types in this category are denied.`,
      evidence: hasSample
        ? makeEvidence(
            'A',
            svc.officialSampleIds
              .map((id) => findAzurePattern(id)?.title)
              .filter(Boolean)
              .join(', ') || 'Azure samples',
            null,
            null,
            `Resource type whitelist for ${svc.name} derived from official Skillable samples that include these resource types.`,
            'parameterised',
            'high',
          )
        : makeEvidence(
            'G',
            'No official sample',
            null,
            null,
            `${svc.name} has no official Skillable sample. Resource type whitelist generated from service catalogue. Requires manual review.`,
            'application-generated',
            'low',
          ),
      jsonFragment: svc.resourceTypes.map((rt) => ({ field: 'type', contains: rt })),
      warnings: hasSample
        ? [
            `Uses "contains" operator for type matching (same as official Skillable samples). Note: "contains" is a substring match — it also permits child resource types (e.g. subnets under virtual networks, peerings). This is intentional to allow child resources needed for deployment, but verify that all admitted child types are acceptable for your lab.`,
          ]
        : [
            `No official Skillable sample for ${svc.name}. Manual review required.`,
            `Uses "contains" operator for type matching — a substring match that also permits child resource types. Verify that all admitted child types are acceptable.`,
          ],
    });

    if (!hasSample) {
      unsupportedCombinations.push(
        `${svc.name} has no official Skillable sample — generated rules are unverified.`,
      );
    }
  }

  // Region restriction (global, applies to all resources)
  if (wizard.region.approvedLocations.length > 0 && !hasVMs && !hasVMSS) {
    const regionPattern = findAzurePattern('azure-limit-locations');
    statements.push({
      id: stmtId('azure', ++n),
      description: `Restrict resource deployment to approved locations`,
      plainEnglish: `Resources can only be created in these Azure regions: ${wizard.region.approvedLocations.join(', ')}${wizard.region.globalResourcesRequired ? ' (plus global resources)' : ''}. Resources in other regions are denied.`,
      evidence: makeEvidence(
        'A',
        regionPattern?.title ?? 'Limit Resource Deployment Locations',
        regionPattern?.sourcePath ?? null,
        regionPattern?.githubUrl ?? null,
        'Region restriction pattern derived from official Skillable sample using notIn and notEquals on the location field.',
        'parameterised',
        'high',
      ),
      jsonFragment: {
        allOf: [
          { field: 'location', notIn: wizard.region.approvedLocations },
          ...(wizard.region.globalResourcesRequired
            ? [{ field: 'location', notEquals: 'global' }]
            : []),
        ],
      },
      warnings: [],
    });
  }

  // Background deployment warning
  if (wizard.deployment.method === 'background') {
    warnings.push(
      'Background deployment is enabled. The ACP will be active during deployment. Ensure the policy permits all operations performed by the resource template, or deployment may fail.',
    );
    securityRisks.push(
      'Background deployment means the ACP is active during template deployment. Template operations may be blocked by the policy.',
    );
  }

  // Build the final policy JSON using whitelist model
  const policyJson =
    anyOfConditions.length > 0
      ? {
          if: {
            not: {
              anyOf: anyOfConditions,
            },
          },
          then: {
            effect: 'Deny',
          },
        }
      : {
          if: {
            field: 'type',
            exists: true,
          },
          then: {
            effect: 'Deny',
          },
        };

  // If no services selected, block everything
  if (services.length === 0) {
    warnings.push('No services selected. The generated policy will block all resource creation.');
    statements.push({
      id: stmtId('azure', ++n),
      description: 'Block all resource creation',
      plainEnglish:
        'No services were selected, so all resource creation is blocked. This is the most restrictive policy possible.',
      evidence: makeEvidence(
        'E',
        'Application safety constraint',
        null,
        null,
        'No services selected — the application generates a deny-all policy as a safety default.',
        'application-generated',
        'high',
      ),
      jsonFragment: policyJson,
      warnings: [
        'This policy blocks all resource creation. Select services to allow specific resources.',
      ],
    });
  }

  // Whitelist model statement
  statements.push({
    id: stmtId('azure', ++n),
    description: 'Whitelist model with Deny effect',
    plainEnglish:
      'The policy uses a whitelist model: anything not explicitly listed in the allowed conditions is denied. This follows the Skillable best practice of using a "not" statement with "Deny" effect.',
    evidence: makeEvidence(
      'A',
      'Azure Access Control Policy Samples — Best Practices',
      'access-control-policies/Azure/readme.md',
      'https://github.com/LearnOnDemandSystems/labauthor/blob/master/access-control-policies/Azure/readme.md',
      'Skillable recommends encasing allowed resources in a "not" block with effect "Deny" for lab environments.',
      'combined',
      'high',
    ),
    jsonFragment: { if: { not: { anyOf: anyOfConditions } }, then: { effect: 'Deny' } },
    warnings: [],
  });

  return {
    provider: 'azure',
    policyJson,
    statements,
    warnings,
    unsupportedCombinations,
    securityRisks,
    evidenceSummary: countClassifications(statements),
  };
}

// ─── AWS IAM Policy Generator ────────────────────────────────────────────

function generateAwsPolicy(wizard: WizardState): GeneratedPolicy {
  const statements: GeneratedStatement[] = [];
  const warnings: string[] = [];
  const unsupportedCombinations: string[] = [];
  const securityRisks: string[] = [];
  let n = 0;

  const services = wizard.services;
  const iamStatements: unknown[] = [];

  // Check for services without official samples
  for (const sel of services) {
    const svc = findAwsService(sel.serviceId);
    if (svc && !svc.officialSampleAvailable) {
      warnings.push(
        `Service "${svc.name}" has no official Skillable sample. The generated policy for this service requires manual review.`,
      );
    }
  }

  // Generate Allow statements for each selected service
  for (const sel of services) {
    const svc = findAwsService(sel.serviceId);
    if (!svc || !svc.iamActionPrefix) continue;

    const actionPrefix = svc.iamActionPrefix;
    const allowAction = `${actionPrefix}*`;

    iamStatements.push({
      Action: allowAction,
      Resource: '*',
      Effect: 'Allow',
    });

    const hasSample = svc.officialSampleAvailable;
    statements.push({
      id: stmtId('aws', ++n),
      description: `Allow ${svc.name} actions`,
      plainEnglish: `All ${svc.name} actions (${allowAction}) are allowed on all resources. This follows the official Skillable sample pattern of allowing service-level access.`,
      evidence: hasSample
        ? makeEvidence(
            'A',
            svc.officialSampleIds
              .map((id) => findAwsPattern(id)?.title)
              .filter(Boolean)
              .join(', ') || 'AWS samples',
            null,
            null,
            `Allow statement for ${svc.name} derived from official Skillable samples using wildcard action pattern.`,
            'parameterised',
            'high',
          )
        : makeEvidence(
            'G',
            'No official sample',
            null,
            null,
            `${svc.name} has no official Skillable sample. Allow statement generated from service catalogue. Requires manual review.`,
            'application-generated',
            'low',
          ),
      jsonFragment: { Action: allowAction, Resource: '*', Effect: 'Allow' },
      warnings: [
        `Uses wildcard action ${allowAction} — this grants all ${svc.name} permissions. Consider narrowing to specific actions.`,
        ...(hasSample
          ? []
          : [`No official Skillable sample for ${svc.name}. Manual review required.`]),
      ],
    });

    securityRisks.push(
      `${svc.name} uses wildcard action ${allowAction} on Resource "*". This is broad — consider restricting to specific actions and resources.`,
    );

    if (!hasSample) {
      unsupportedCombinations.push(
        `${svc.name} has no official Skillable sample — generated rules are unverified.`,
      );
    }

    // EC2 instance type restriction
    if (svc.id === 'aws-ec2' && sel.allowedSkus.length > 0) {
      iamStatements.push({
        Action: 'ec2:RunInstances',
        Resource: 'arn:aws:ec2:*:*:instance/*',
        Effect: 'Deny',
        Condition: {
          StringNotEquals: {
            'ec2:InstanceType': sel.allowedSkus,
          },
        },
      });

      const pattern = findAwsPattern('aws-limit-vm-sizes');
      statements.push({
        id: stmtId('aws', ++n),
        description: `Deny EC2 instance creation for unapproved instance types`,
        plainEnglish: `EC2 instance creation (RunInstances) is denied for any instance type not in the approved list: ${sel.allowedSkus.join(', ')}. Only these instance types can be launched.`,
        evidence: makeEvidence(
          'A',
          pattern?.title ?? 'Limit to Specific VM Sizes',
          pattern?.sourcePath ?? null,
          pattern?.githubUrl ?? null,
          'Instance type restriction derived from official Skillable sample using StringNotEquals condition on ec2:InstanceType.',
          'parameterised',
          'high',
        ),
        jsonFragment: {
          Action: 'ec2:RunInstances',
          Resource: 'arn:aws:ec2:*:*:instance/*',
          Effect: 'Deny',
          Condition: { StringNotEquals: { 'ec2:InstanceType': sel.allowedSkus } },
        },
        warnings: [],
      });
    } else if (svc.id === 'aws-ec2' && sel.allowedSkus.length === 0) {
      securityRisks.push(
        'EC2 has no instance type restriction. Users can launch expensive instance types. Add allowed instance types to mitigate.',
      );
      warnings.push(
        'EC2 is selected but no instance types are restricted. Users can launch any instance type, including high-cost ones.',
      );
    }
  }

  // Region restriction for AWS (using condition)
  if (wizard.region.approvedLocations.length > 0) {
    warnings.push(
      `AWS region restriction requested (${wizard.region.approvedLocations.join(', ')}). AWS IAM policies do not natively restrict regions in the same way Azure Policy restricts locations. Region control is typically handled at the VPC/subnet level or via service control policies (SCPs). This requires manual review.`,
    );
    unsupportedCombinations.push(
      'AWS IAM identity-based policies do not have a direct equivalent to Azure Policy location restrictions. Consider using AWS SCPs or VPC-level controls. Manual review required.',
    );
  }

  // Background deployment warning
  if (wizard.deployment.method === 'background') {
    warnings.push(
      'Background deployment is enabled. The ACP will be active during deployment. Ensure the policy permits all operations performed by the CloudFormation stack or resource template, or deployment may fail.',
    );
    securityRisks.push(
      'Background deployment means the ACP is active during template deployment. CloudFormation operations may be blocked by the policy.',
    );
  }

  // No services selected
  if (services.length === 0) {
    warnings.push('No services selected. The generated policy will deny all actions.');
    iamStatements.push({
      Action: '*',
      Resource: '*',
      Effect: 'Deny',
    });
    statements.push({
      id: stmtId('aws', ++n),
      description: 'Deny all actions',
      plainEnglish:
        'No services were selected, so all actions on all resources are denied. This is the most restrictive policy possible.',
      evidence: makeEvidence(
        'E',
        'Application safety constraint',
        null,
        null,
        'No services selected — the application generates a deny-all policy as a safety default.',
        'application-generated',
        'high',
      ),
      jsonFragment: { Action: '*', Resource: '*', Effect: 'Deny' },
      warnings: ['This policy denies all actions. Select services to allow specific actions.'],
    });
  }

  const policyJson = {
    Version: '2012-10-17',
    Statement: iamStatements,
  };

  return {
    provider: 'aws',
    policyJson,
    statements,
    warnings,
    unsupportedCombinations,
    securityRisks,
    evidenceSummary: countClassifications(statements),
  };
}

function countClassifications(
  statements: GeneratedStatement[],
): GeneratedPolicy['evidenceSummary'] {
  const summary = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  for (const s of statements) {
    summary[s.evidence.classification]++;
  }
  return {
    classificationA: summary.A,
    classificationB: summary.B,
    classificationC: summary.C,
    classificationD: summary.D,
    classificationE: summary.E,
    classificationF: summary.F,
    classificationG: summary.G,
  };
}

export function generatePolicy(wizard: WizardState): GeneratedPolicy {
  if (!wizard.provider) {
    throw new Error('Cannot generate policy: no cloud provider selected.');
  }

  if (wizard.provider === 'azure') {
    return generateAzurePolicy(wizard);
  }
  return generateAwsPolicy(wizard);
}

export function getProviderLabel(provider: CloudProvider): string {
  return provider === 'azure' ? 'Microsoft Azure' : 'Amazon Web Services';
}

export function getProviderPolicyModel(provider: CloudProvider): string {
  return provider === 'azure' ? 'Azure Policy' : 'IAM Managed Identity-Based Policy';
}
