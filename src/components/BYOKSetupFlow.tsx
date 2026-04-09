import { useState } from 'react';
import { useBYOK } from '../hooks/useBYOK';
import { SetupPathSelector, type SetupPath } from './SetupPathSelector';
import { SimpleAPISetup } from './SimpleAPISetup';
import { ManagedSetupFlow } from './ManagedSetupFlow';

interface BYOKSetupFlowProps {
  onComplete: () => void;
}

export function BYOKSetupFlow({ onComplete }: BYOKSetupFlowProps) {
  const { updateSetupPath } = useBYOK();
  const [currentStep, setCurrentStep] = useState<'path' | 'setup'>('path');
  const [selectedPath, setSelectedPath] = useState<SetupPath | null>(null);

  const handlePathSelected = (path: SetupPath) => {
    setSelectedPath(path);
    updateSetupPath(path);
    setCurrentStep('setup');
  };

  const handleBack = () => {
    setCurrentStep('path');
    setSelectedPath(null);
  };

  const handleSetupComplete = () => {
    onComplete();
  };

  const handleSkip = () => {
    onComplete();
  };

  if (currentStep === 'path') {
    return (
      <SetupPathSelector
        onPathSelected={handlePathSelected}
        onSkip={handleSkip}
      />
    );
  }

  if (currentStep === 'setup' && selectedPath === 'managed') {
    return (
      <ManagedSetupFlow
        onComplete={handleSetupComplete}
        onBack={handleBack}
      />
    );
  }

  if (currentStep === 'setup' && selectedPath === 'simple') {
    return (
      <SimpleAPISetup
        onComplete={handleSetupComplete}
        onBack={handleBack}
      />
    );
  }

  return null;
}
