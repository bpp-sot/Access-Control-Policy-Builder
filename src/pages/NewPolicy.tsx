import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WizardProvider, useWizard } from '@/lib/wizard-context';
import { saveProject, loadProject } from '@/lib/storage';
import { generatePolicy } from '@/lib/policy-generator';
import type { PolicyProject } from '@/types';
import {
  Step1Project,
  Step2Platform,
  Step3Purpose,
  Step4Deployment,
  Step5Region,
  Step6Services,
  Step7Operations,
  Step8Review,
} from '@/components/WizardSteps';

const STEPS = [
  { label: 'Project', component: Step1Project },
  { label: 'Platform', component: Step2Platform },
  { label: 'Purpose', component: Step3Purpose },
  { label: 'Deployment', component: Step4Deployment },
  { label: 'Region', component: Step5Region },
  { label: 'Services', component: Step6Services },
  { label: 'Operations', component: Step7Operations },
  { label: 'Review', component: Step8Review },
];

function WizardContent() {
  const { wizard, setWizard, projectId, reset } = useWizard();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const currentStep = wizard.currentStep;
  const StepComponent = STEPS[currentStep].component;

  const canProceed = () => {
    if (currentStep === 0) return wizard.project.projectName.trim().length > 0;
    if (currentStep === 1) return wizard.provider !== null;
    return true;
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setWizard((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setWizard((prev) => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const handleGenerate = () => {
    try {
      setError(null);
      const policy = generatePolicy(wizard);

      const project: PolicyProject = {
        id: projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wizard,
        generatedPolicy: policy,
      };
      saveProject(project);
      navigate(`/review/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate policy.');
    }
  };

  const handleSave = () => {
    const project: PolicyProject = {
      id: projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wizard,
    };
    saveProject(project);
    navigate('/projects');
  };

  return (
    <div className="wizard-container">
      <div className="flex items-center justify-between">
        <h2 className="section-title">New Access Control Policy</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            if (confirm('Reset the wizard? All current data will be lost.')) {
              reset();
            }
          }}
        >
          Reset
        </button>
      </div>

      {/* Progress indicator */}
      <div className="wizard-progress">
        {STEPS.map((step, idx) => (
          <div key={idx} className="flex items-center">
            <div
              className={`wizard-step ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
            >
              <div className="wizard-step-circle">{idx < currentStep ? '\u2713' : idx + 1}</div>
              <div className="wizard-step-label">{step.label}</div>
            </div>
            {idx < STEPS.length - 1 && <div className="wizard-step-connector" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <StepComponent />

      {error && (
        <div className="alert alert-danger">
          <span>{'\u{26A0}'}</span>
          <div>{error}</div>
        </div>
      )}

      {/* Actions */}
      <div className="wizard-actions">
        <button className="btn btn-secondary" onClick={prev} disabled={currentStep === 0}>
          {'\u2190'} Previous
        </button>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handleSave}>
            Save Draft
          </button>
          {currentStep < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={next} disabled={!canProceed()}>
              Next {'\u2192'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={!wizard.provider}
            >
              Generate Policy {'\u{1F680}'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewPolicy() {
  const params = useParams();
  const projectId = params.projectId;

  // If editing an existing project, load it into the wizard
  if (projectId) {
    const existing = loadProject(projectId);
    if (existing) {
      // We need to set the wizard state from the loaded project
      // This is handled by the WizardProvider initial state, but for loaded projects
      // we need a different approach — use a key to remount
      return (
        <WizardProvider key={projectId}>
          <LoadedWizard project={existing} />
        </WizardProvider>
      );
    }
  }

  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}

function LoadedWizard({ project }: { project: PolicyProject }) {
  // This component sets the wizard state from the loaded project
  // We use a trick: set the state on mount via the wizard context
  const { setWizard, setProjectId: _ } = useWizard();

  // Set wizard state from loaded project
  useState(() => {
    setWizard(() => project.wizard);
  });

  return <WizardContent />;
}
