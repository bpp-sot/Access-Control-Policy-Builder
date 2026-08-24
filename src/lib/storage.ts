import type { PolicyProject, WizardState } from '@/types';

const STORAGE_PREFIX = 'skillable-acp-project-';
const INDEX_KEY = 'skillable-acp-project-index';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getProjectIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveProject(project: PolicyProject): void {
  const updated = { ...project, updatedAt: new Date().toISOString() };
  localStorage.setItem(`${STORAGE_PREFIX}${project.id}`, JSON.stringify(updated));
  const index = getProjectIndex();
  if (!index.includes(project.id)) {
    index.push(project.id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }
}

export function loadProject(id: string): PolicyProject | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    return raw ? (JSON.parse(raw) as PolicyProject) : null;
  } catch {
    return null;
  }
}

export function loadAllProjects(): PolicyProject[] {
  return getProjectIndex()
    .map((id) => loadProject(id))
    .filter((p): p is PolicyProject => p !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteProject(id: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
  const index = getProjectIndex().filter((i) => i !== id);
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function createEmptyWizardState(): WizardState {
  return {
    currentStep: 0,
    project: {
      projectName: '',
      labProfileName: '',
      labProfileNumber: '',
      author: '',
      version: '1.0.0',
      description: '',
      programme: '',
      module: '',
      intendedAudience: '',
      labDuration: '60',
      status: 'development',
    },
    provider: null,
    purpose: {
      outcomes: [],
      tasks: [],
      supportingResources: '',
      resourcesCreatedByLearner: '',
      resourcesPreDeployed: '',
      resourcesModifiedByLearner: '',
      resourcesReadOnly: '',
      resourcesMustBeDeleted: '',
    },
    deployment: {
      method: 'none',
      lifecycleActions: false,
      validationScripts: false,
      cleanupScripts: false,
      deploymentFailureBehaviour: '',
      labSaveEnabled: true,
    },
    region: {
      approvedLocations: [],
      primaryLocation: '',
      globalResourcesRequired: false,
    },
    services: [],
    customJson: '',
  };
}

export function exportProjectAsJson(project: PolicyProject): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectFromJson(json: string): PolicyProject {
  const parsed = JSON.parse(json) as PolicyProject;
  if (!parsed.id || !parsed.wizard) {
    throw new Error('Invalid project file: missing required fields (id, wizard).');
  }
  return parsed;
}
