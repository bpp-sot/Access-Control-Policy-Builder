// Core type definitions for the Skillable Access Control Policy Builder

export type CloudProvider = 'azure' | 'aws';

export type EvidenceClassification = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type ConfidenceStatus = 'high' | 'medium' | 'low';

export type DeploymentMethod =
  'none' | 'pre-entry' | 'background' | 'arm-template' | 'bicep' | 'cloudformation' | 'other';

export type LabStatus = 'development' | 'production';

export interface ProjectMetadata {
  projectName: string;
  labProfileName: string;
  labProfileNumber: string;
  author: string;
  version: string;
  description: string;
  programme: string;
  module: string;
  intendedAudience: string;
  labDuration: string;
  status: LabStatus;
}

export interface LearningOutcome {
  id: string;
  outcome: string;
}

export interface LearnerTask {
  id: string;
  task: string;
}

export interface LearningPurpose {
  outcomes: LearningOutcome[];
  tasks: LearnerTask[];
  supportingResources: string;
  resourcesCreatedByLearner: string;
  resourcesPreDeployed: string;
  resourcesModifiedByLearner: string;
  resourcesReadOnly: string;
  resourcesMustBeDeleted: string;
}

export interface DeploymentBehaviour {
  method: DeploymentMethod;
  lifecycleActions: boolean;
  validationScripts: boolean;
  cleanupScripts: boolean;
  deploymentFailureBehaviour: string;
  labSaveEnabled: boolean;
}

export interface RegionConfig {
  approvedLocations: string[];
  primaryLocation: string;
  globalResourcesRequired: boolean;
}

export interface ServiceSelection {
  serviceId: string;
  operations: string[];
  customResourceTypes: string[];
  allowedSkus: string[];
  allowedNames: string[];
  maxCapacity?: number;
}

export interface WizardState {
  currentStep: number;
  project: ProjectMetadata;
  provider: CloudProvider | null;
  purpose: LearningPurpose;
  deployment: DeploymentBehaviour;
  region: RegionConfig;
  services: ServiceSelection[];
  customJson: string;
}

export interface EvidenceReference {
  classification: EvidenceClassification;
  sourceTitle: string;
  sourcePath: string | null;
  sourceUrl: string | null;
  rationale: string;
  copiedOrParameterised: 'copied' | 'parameterised' | 'combined' | 'application-generated';
  confidence: ConfidenceStatus;
}

export interface GeneratedStatement {
  id: string;
  description: string;
  plainEnglish: string;
  evidence: EvidenceReference;
  jsonFragment: unknown;
  warnings: string[];
}

export interface GeneratedPolicy {
  provider: CloudProvider;
  policyJson: unknown;
  statements: GeneratedStatement[];
  warnings: string[];
  unsupportedCombinations: string[];
  securityRisks: string[];
  evidenceSummary: {
    classificationA: number;
    classificationB: number;
    classificationC: number;
    classificationD: number;
    classificationE: number;
    classificationF: number;
    classificationG: number;
  };
}

export interface SecurityReviewItem {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  recommendation: string;
  evidence?: EvidenceReference;
}

export interface SecurityReview {
  projectName: string;
  labProfileNumber: string;
  provider: CloudProvider;
  generatedAt: string;
  sourceVersion: string;
  items: SecurityReviewItem[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

export interface PolicyProject {
  id: string;
  createdAt: string;
  updatedAt: string;
  wizard: WizardState;
  generatedPolicy?: GeneratedPolicy;
}

export interface SourceManifest {
  sourceRepository: {
    name: string;
    url: string;
    cloneUrl: string;
    branch: string;
    commitSha: string;
    syncDate: string;
    licenseFound: boolean;
    licenseNote: string;
  };
  azureExamplesImported: number;
  awsExamplesImported: number;
  totalExamplesImported: number;
  filesParsedSuccessfully: number;
  filesFailedToParse: string[];
  manualMappings: Array<{
    description: string;
    evidenceClassification: EvidenceClassification;
    note: string;
  }>;
  evidenceSources: Record<EvidenceClassification, string>;
}

export interface AzurePattern {
  id: string;
  title: string;
  reusablePattern: string;
  purpose: string;
  sourcePath: string;
  sourceReadmePath: string | null;
  githubUrl: string;
  evidenceClassification: EvidenceClassification;
  servicesRepresented: string[];
  resourceTypesRepresented: string[];
  regionsOrLocationsMentioned: string[];
  sizesOrSkusMentioned: string[];
  wildcardUse: string[];
  policyJson: unknown;
  structureNotes: string;
  applicableWhen: string;
}

export interface AwsPattern {
  id: string;
  title: string;
  reusablePattern: string;
  purpose: string;
  sourcePath: string;
  sourceReadmePath: string | null;
  githubUrl: string;
  evidenceClassification: EvidenceClassification;
  servicesRepresented: string[];
  resourceTypesRepresented: string[];
  regionsOrLocationsMentioned: string[];
  sizesOrSkusMentioned: string[];
  wildcardUse: string[];
  policyJson: unknown;
  structureNotes: string;
  applicableWhen: string;
}

export interface ServiceDependency {
  serviceId: string;
  serviceName: string;
  resourceTypes: string[];
  reason: string;
  required: boolean;
  /**
   * When true, this dependency is automatically whitelisted by the policy
   * generator when the parent service is selected (e.g. managed disks are
   * part of the VM service's own resourceTypes). No separate service
   * selection is needed. The dependency panel shows it as "auto-included".
   */
  autoIncluded?: boolean;
  /**
   * Evidence classification for the dependency claim.
   * A = Official Skillable sample.
   * C = Native Azure documentation.
   * D = Native AWS documentation.
   * E = Application safety constraint.
   * Defaults to A if omitted.
   */
  evidenceClassification?: EvidenceClassification;
  /**
   * AWS IAM actions required by this dependency. Used by the AWS generator
   * so EC2 launch-wizard discovery and supporting resources can be granted
   * without relying on a separate service's operation mapping.
   */
  iamActions?: string[];
}

export interface ServiceCatalogueEntry {
  id: string;
  name: string;
  category: string;
  resourceTypes: string[];
  iamActionPrefix?: string;
  officialSampleAvailable: boolean;
  officialSampleIds: string[];
  riskCategory: string;
  costSensitivity: string;
  identitySensitivity: string;
  networkExposureSensitivity: string;
  notes: string;
  dependencies?: ServiceDependency[];
}

export interface OperationDef {
  id: string;
  label: string;
  description: string;
  /**
   * Maps an operation ID to AWS IAM actions for a specific service.
   * Keyed by service id (e.g. "aws-ec2"). Each entry is a list of
   * specific IAM actions (e.g. ["ec2:DescribeInstances"]).
   * If a service is not listed for an operation, the operation falls
   * back to the wildcard prefix.
   */
  awsActions?: Record<string, string[]>;
}

export interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
