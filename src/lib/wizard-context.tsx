import { createContext, useContext, useState, type ReactNode } from 'react';
import type { WizardState, PolicyProject } from '@/types';
import { createEmptyWizardState, generateId } from './storage';

const WizardContext = createContext<
  | {
      wizard: WizardState;
      setWizard: (updater: (prev: WizardState) => WizardState) => void;
      projectId: string;
      setProjectId: (id: string) => void;
      reset: () => void;
    }
  | undefined
>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [wizard, setWizardState] = useState<WizardState>(createEmptyWizardState);
  const [projectId, setProjectId] = useState<string>(generateId());

  const setWizard = (updater: (prev: WizardState) => WizardState) => {
    setWizardState((prev) => updater(prev));
  };

  const reset = () => {
    setWizardState(createEmptyWizardState());
    setProjectId(generateId());
  };

  return (
    <WizardContext.Provider value={{ wizard, setWizard, projectId, setProjectId, reset }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}

export type { PolicyProject };
