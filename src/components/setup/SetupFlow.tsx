/**
 * Account Setup Flow Container
 * Manages the overall setup process and navigation
 */

import { useSetupStore } from '@/stores/setupStore'
import { SetupProgress } from './SetupProgress'
// ...existing code...
import { GenerateKeysStep } from './steps/GenerateKeysStep'
import { BackupMnemonicStep } from './steps/BackupMnemonicStep'
// ...existing code...

export function SetupFlow() {
  const { currentStep, environmentType } = useSetupStore()
  const isFarcaster = environmentType === 'farcaster' || environmentType === 'iframe'

  // On first render, if Farcaster/iframe and no alternativeAuthSeed, create it and advance
  let stepContent = null;
  if (isFarcaster) {
    switch (currentStep) {
      case 'generate-keys':
  stepContent = <GenerateKeysStep />;
        break;
      case 'backup-mnemonic':
        stepContent = <BackupMnemonicStep />;
        break;
      case 'complete':
  // ...existing code...
      default:
        stepContent = null;
    }
  } else {
    switch (currentStep) {
  // ...existing code...
      case 'generate-keys':
        stepContent = <GenerateKeysStep />;
        break;
      case 'backup-mnemonic':
        stepContent = <BackupMnemonicStep />;
        break;
      case 'complete':
  // ...existing code...
      default:
        stepContent = null;
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Mobile-first Progress Bar */}
      <SetupProgress />
      
      {/* Mobile-first Step Content - Takes remaining space */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {stepContent}
      </div>
    </div>
  )
}