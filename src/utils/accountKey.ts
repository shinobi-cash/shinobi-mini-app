/**
 * Account Key Utilities
 * 
 * Centralizes all account key resolution and parsing logic to ensure consistency
 * across the entire application. This prevents the account key inconsistencies
 * that were causing bugs in cryptographic operations.
 */

import { restoreFromMnemonic } from './crypto';
import { parseUserKey } from './noteDerivation';

export interface AuthCredentials {
  mnemonic?: string[];
  privateKey?: string;
}

/**
 * Single source of truth for converting authentication credentials to account key.
 * Always returns a properly parsed bigint account key suitable for cryptographic operations.
 * 
 * @param credentials - Either mnemonic (as string array) or private key
 * @returns Parsed account key as bigint, ready for crypto operations
 * @throws Error if no valid credentials provided
 */
export function getAccountKey(credentials: AuthCredentials): bigint {
  // Prefer private key if available (more direct)
  if (credentials.privateKey) {
    return parseUserKey(credentials.privateKey);
  }
  
  // Fall back to mnemonic derivation
  if (credentials.mnemonic && credentials.mnemonic.length > 0) {
    const { privateKey } = restoreFromMnemonic(credentials.mnemonic);
    return parseUserKey(privateKey);
  }
  
  throw new Error('No valid authentication credentials available');
}

/**
 * Validates that a mnemonic array is properly formatted
 * 
 * @param mnemonic - Array of mnemonic words
 * @returns true if valid format (12 or 24 words)
 */
export function validateMnemonic(mnemonic: string[]): boolean {
  return mnemonic.length === 12;
}

/**
 * Safely parses user input string into mnemonic word array
 * 
 * @param input - Raw mnemonic string from user
 * @returns Validated mnemonic array
 * @throws Error if invalid format
 */
export function parseMnemonicInput(input: string): string[] {
  const words = input.trim().split(/\s+/);
  
  if (!validateMnemonic(words)) {
    throw new Error(`Invalid mnemonic: expected 12 or 24 words, got ${words.length}`);
  }
  
  return words;
}

/**
 * Converts mnemonic array back to space-separated string for display/storage
 * 
 * @param mnemonic - Mnemonic word array
 * @returns Space-separated string
 */
export function mnemonicToString(mnemonic: string[]): string {
  return mnemonic.join(' ');
}