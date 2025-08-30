/**
 * Cryptographic Utilities for Account Setup
 * Handles passkey creation, message signing, and key generation
 */

import { isPasskeySupported } from "./environment";

import * as bip39 from "bip39";
import { ethers } from "ethers";

export interface KeyGenerationResult {
  publicKey: string;
  privateKey: string;
  mnemonic: string[];
  address: string;
}

/**
 * Generate a deterministic message for signing
 * This message must ALWAYS be the same to ensure deterministic key generation
 */
export function generateSigningMessage(): string {
  const domain = "shinobi.privacy.app";
  // CRITICAL: This message must be deterministic (no timestamps, no random values)
  // to ensure the same passkey always generates the same mnemonic
  return `Welcome to Shinobi Privacy App!

This signature will be used to deterministically generate your secure account keys.

Domain: ${domain}
Version: v1.0.0
Purpose: Account Key Generation

IMPORTANT: This signature will always produce the same cryptographic keys when signed with your passkey. Never share this signature with anyone.

By signing this message, you authorize the creation of your privacy-preserving account with deterministic key recovery.`;
}

/**
 * Create a new passkey credential
 */
// The createPasskey function has been removed.

/**
 * Alternative authentication method for Farcaster and other iframe environments
 * Creates a random session account for demo/trial purposes
 */
export async function createRandomSessionAuth(): Promise<{
  id: string;
  randomSeed: string;
  timestamp: number;
}> {
  try {
    // Generate completely random entropy for this session
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const timestamp = Date.now();

    // Convert to hex for the seed
    const randomSeed = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create session ID
    const sessionId = `session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: sessionId,
      randomSeed,
      timestamp,
    };
  } catch (error) {
    console.error("Failed to create random session auth:", error);
    throw new Error("Failed to generate secure random data. Please try again.");
  }
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
 * Sign a message using the passkey
 */
export async function signWithPasskey(credentialId: string, message: string): Promise<string> {
  if (!isPasskeySupported() || !navigator?.credentials?.get) {
    throw new Error("WebAuthn not supported in this browser");
  }

  const challenge = new TextEncoder().encode(message);

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: base64URLToArrayBuffer(credentialId),
          type: "public-key",
        },
      ],
      timeout: 60000,
      userVerification: "required",
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error("Failed to get assertion from passkey");
  }

  const response = assertion.response as AuthenticatorAssertionResponse;

  // Convert signature to hex string
  const signature = new Uint8Array(response.signature);
  return Array.from(signature)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate deterministic ECDSA key pair and mnemonic from passkey signature
 * This function MUST be deterministic - same signature always produces same keys
 */
export function generateKeysFromSignature(signature: string): KeyGenerationResult {
  // Use signature as the sole source of entropy for deterministic generation
  const signatureBytes = hexToBytes(signature);

  // Use 16 bytes for 12-word mnemonic generation (128 bits)
  let entropy: Uint8Array;

  if (signatureBytes.length >= 16) {
    // Use first 16 bytes if signature is long enough
    entropy = signatureBytes.slice(0, 16);
  } else {
    // Pad with deterministic values if signature is shorter
    entropy = new Uint8Array(16);
    entropy.set(signatureBytes, 0);

    // Fill remaining bytes with a deterministic pattern based on signature
    for (let i = signatureBytes.length; i < 16; i++) {
      entropy[i] = signatureBytes[i % signatureBytes.length] ^ (i % 256);
    }
  }

  // Generate deterministic mnemonic from entropy - use Buffer.from() with polyfill
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

/**
 * Secure storage utilities
 */
export function encryptData(data: string, password: string): string {
  // Simple XOR encryption for demo - replace with proper encryption in production
  const key = new TextEncoder().encode(password);
  const dataBytes = new TextEncoder().encode(data);
  const encrypted = new Uint8Array(dataBytes.length);

  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ key[i % key.length];
  }

  return btoa(String.fromCharCode(...encrypted));
}

export function decryptData(encryptedData: string, password: string): string {
  // Simple XOR decryption - replace with proper decryption in production
  const key = new TextEncoder().encode(password);
  const encrypted = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );

  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }

  return new TextDecoder().decode(decrypted);
}

// Helper functions
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function base64URLToArrayBuffer(base64URL: string): ArrayBuffer {
  const base64 = base64URL.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binaryString = atob(base64 + padding);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Generate secure random bytes
 */
export function generateSecureRandom(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
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
