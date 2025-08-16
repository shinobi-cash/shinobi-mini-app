/**
 * Account Setup Store
 * Manages account keys and setup state
 */

import { create } from 'zustand'
import { getEnvironmentType } from '@/utils/environment'
import type { KeyGenerationResult } from '@/types/setup'

export interface SetupStore {
  environmentType: 'farcaster' | 'standalone' | 'iframe' | 'web';
  alternativeAuthId: string | null;
  alternativeAuthSeed: string | null;
  publicKey: string | null;
  privateKey: string | null;
  mnemonic: string[] | null;
  isComplete: boolean;
  setAlternativeAuth: (id: string, seed: string) => void;
  setKeys: (keys: KeyGenerationResult) => void;
  completeSetup: () => void;
  resetSetup: () => void;
}

const getInitialState = () => {
  const environmentType = getEnvironmentType()
  return {
    publicKey: null,
    privateKey: null,
    mnemonic: null,
    isComplete: false,
    environmentType,
    alternativeAuthId: null,
    alternativeAuthSeed: null,
  }
}

export const useSetupStore = create<SetupStore>()((set) => ({
  ...getInitialState(),

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
      isComplete: true
    })
  },

  resetSetup: () => {
    set(getInitialState())
  },
}))