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
}

export interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
