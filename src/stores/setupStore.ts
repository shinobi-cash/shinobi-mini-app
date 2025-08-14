/**
 * Account Setup Flow Store
 * Manages the state for the account setup process
 */

import { create } from 'zustand'
// import removed: zustand/middleware (no persistence)
import { getEnvironmentType } from '@/utils/environment'
import type { SetupStep, KeyGenerationResult, SetupStepConfig } from '@/types/setup'

// End of Zustand store

export interface SetupStore {
  environmentType: 'farcaster' | 'standalone' | 'iframe' | 'web';
  alternativeAuthId: string | null;
  alternativeAuthSeed: string | null;
  currentStep: SetupStep | null;
  publicKey: string | null;
  privateKey: string | null;
  mnemonic: string[] | null;
  isComplete: boolean;
  setCurrentStep: (step: SetupStep | null) => void;
  setAlternativeAuth: (id: string, seed: string) => void;
  setKeys: (keys: KeyGenerationResult) => void;
  completeSetup: () => void;
  resetSetup: () => void;
  getCurrentStepConfig: () => SetupStepConfig;
  getProgress: () => number;
  canProceedToNext: () => boolean;
}
const SETUP_STEPS: SetupStepConfig[] = [
  {
    id: 'generate-keys',
    title: 'Generate Keys',
    description: 'Creating your cryptographic keys',
    canSkip: false,
    requiresCompletion: true,
  },
  {
    id: 'backup-mnemonic',
    title: 'Backup Recovery Phrase',
    description: 'Save your recovery words securely',
    canSkip: false,
    requiresCompletion: true,
  },
  // ...existing code...
];


const getInitialState = () => {
  const environmentType = getEnvironmentType()
  return {
    currentStep: null as SetupStep | null,
  // ...existing code...
    publicKey: null,
    privateKey: null,
    mnemonic: null,
    isComplete: false,
    environmentType,
    alternativeAuthId: null,
    alternativeAuthSeed: null,
  }
}

export const useSetupStore = create<SetupStore>()((set, get) => ({
  ...getInitialState(),

  setCurrentStep: (step: SetupStep | null) => {
    set({ currentStep: step })
  },

  setAlternativeAuth: (id: string, seed: string) => {
    set({ 
      alternativeAuthId: id,
      alternativeAuthSeed: seed
    })
  },

    setKeys: (keys: KeyGenerationResult) => {
      set({ 
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        mnemonic: keys.mnemonic,
      })
    },

    completeSetup: () => {
      set({ 
        isComplete: true,
        currentStep: null
      })
    },

    resetSetup: () => {
      set(getInitialState())
    },

    getCurrentStepConfig: (): SetupStepConfig => {
      const { currentStep } = get()
      return SETUP_STEPS.find(step => step.id === currentStep) || SETUP_STEPS[0]
    },

    getProgress: (): number => {
      const { currentStep } = get()
      const currentIndex = SETUP_STEPS.findIndex(step => step.id === currentStep)
      return Math.round(((currentIndex + 1) / SETUP_STEPS.length) * 100)
    },

  // getAuthMethod removed

    canProceedToNext: (): boolean => {
      const { currentStep, mnemonic } = get()
      switch (currentStep) {
        case 'generate-keys':
          return mnemonic !== null
        case 'backup-mnemonic':
          return true // User confirms they've backed up
        default:
          return false
      }
    },
  }))
// ...existing code...