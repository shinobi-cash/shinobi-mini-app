/**
 * Cryptographic Utilities for Account Setup
 * Handles passkey creation, message signing, and key generation
 */

import * as bip39 from "bip39";
import { ethers } from "ethers";

export interface KeyGenerationResult {
  publicKey: string;
  privateKey: string;
  mnemonic: string[];
  address: string;
}


/**
 * Generate deterministic keys directly from random seed
 * This bypasses the passkey signing step for Farcaster environments
 */
export function generateKeysFromRandomSeed(randomSeed: string): KeyGenerationResult {
  // Use random seed as entropy for deterministic generation
  const seedBytes = hexToBytes(randomSeed);

  // Use 16 bytes for 12-word mnemonic generation (128 bits)
  let entropy: Uint8Array;

  if (seedBytes.length >= 16) {
    entropy = seedBytes.slice(0, 16);
  } else {
    // Pad if needed (shouldn't happen with 32-byte random seed)
    entropy = new Uint8Array(16);
    entropy.set(seedBytes, 0);

    for (let i = seedBytes.length; i < 16; i++) {
      entropy[i] = seedBytes[i % seedBytes.length] ^ (i % 256);
    }
  }

  // Generate mnemonic from random entropy - use Buffer.from() with polyfill
  const mnemonic = bip39.entropyToMnemonic(Buffer.from(entropy));

  // Validate the mnemonic
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Generated invalid mnemonic phrase");
  }

  // Generate HD wallet from mnemonic
  const wallet = ethers.Wallet.fromPhrase(mnemonic);

  return {
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
    mnemonic: mnemonic.split(" "),
    address: wallet.address,
  };
}

/**
 * Validate mnemonic phrase
 */
export function validateMnemonic(mnemonic: string[]): boolean {
  return bip39.validateMnemonic(mnemonic.join(" "));
}

/**
 * Restore wallet from mnemonic
 */
export function restoreFromMnemonic(mnemonic: string[]): KeyGenerationResult {
  const mnemonicPhrase = mnemonic.join(" ");

  if (!bip39.validateMnemonic(mnemonicPhrase)) {
    throw new Error("Invalid mnemonic phrase");
  }

  const wallet = ethers.Wallet.fromPhrase(mnemonicPhrase);

  return {
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
    mnemonic,
    address: wallet.address,
  };
}

// Helper functions
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Create privacy-preserving hash for indexing
 */
export async function createHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
