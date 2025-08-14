/**
 * Account Setup Flow Types
 * Defines the structure and flow for secure account creation
 */

export interface AccountSetupState {
  currentStep: SetupStep | null
  publicKey: string | null
  privateKey: string | null
  mnemonic: string[] | null
  isComplete: boolean
}

export type SetupStep = 
  | 'welcome'
  | 'generate-keys'
  | 'backup-mnemonic'
  | 'complete'

export interface SetupStepConfig {
  id: SetupStep
  title: string
  description: string
  canSkip: boolean
  requiresCompletion: boolean
}

export interface KeyGenerationResult {
  publicKey: string
  privateKey: string
  mnemonic: string[]
  address: string
}

export interface MessageSigningPayload {
  message: string
  timestamp: number
  domain: string
}