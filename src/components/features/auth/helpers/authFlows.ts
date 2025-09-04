import { storageManager } from "@/lib/storage";
import { KDF } from "@/lib/storage/services/KeyDerivationService";
import type { KeyGenerationResult } from "@/utils/crypto";
import { createHash, restoreFromMnemonic } from "@/utils/crypto";

export async function performPasskeyLogin(accountName: string) {
  const trimmed = accountName.trim();
  const passkeyData = await storageManager.getPasskeyData(trimmed);
  if (!passkeyData) {
    throw new Error(`No passkey found for account '${trimmed}'. Please create one first.`);
  }

  const { symmetricKey } = await KDF.deriveKeyFromPasskey(trimmed, passkeyData.credentialId);
  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  const accountData = await storageManager.getAccountData();
  if (!accountData) throw new Error("Account data not found");

  const { publicKey, privateKey, address } = restoreFromMnemonic(accountData.mnemonic);
  await KDF.storeSessionInfo(trimmed, "passkey", { credentialId: passkeyData.credentialId });
  return { publicKey, privateKey, address, mnemonic: accountData.mnemonic } as KeyGenerationResult;
}

export async function performPasswordLogin(accountName: string, password: string) {
  const trimmed = accountName.trim();
  const { symmetricKey } = await KDF.deriveKeyFromPassword(password, trimmed);
  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  const accountData = await storageManager.getAccountData();
  if (!accountData) {
    throw new Error("Account not found or incorrect password");
  }

  const { publicKey, privateKey, address } = restoreFromMnemonic(accountData.mnemonic);
  await KDF.storeSessionInfo(trimmed, "password");
  return { publicKey, privateKey, address, mnemonic: accountData.mnemonic } as KeyGenerationResult;
}

export async function performPasskeySetup(accountName: string, generatedKeys: KeyGenerationResult) {
  const trimmed = accountName.trim();
  const hasPasskey = await storageManager.passkeyExists(trimmed);
  if (hasPasskey) {
    throw new Error("Passkey already exists for this account");
  }

  const userHandle = await createHash(generatedKeys.publicKey);
  const { credentialId } = await KDF.createPasskeyCredential(trimmed, userHandle);
  const { symmetricKey } = await KDF.deriveKeyFromPasskey(trimmed, credentialId);

  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  await storageManager.storeAccountData({
    accountName: trimmed,
    mnemonic: generatedKeys.mnemonic,
    createdAt: Date.now(),
  });

  await storageManager.storePasskeyData({
    accountName: trimmed,
    credentialId,
    publicKeyHash: userHandle,
    created: Date.now(),
  });

  await KDF.storeSessionInfo(trimmed, "passkey", { credentialId });
}

export async function performPasswordSetup(accountName: string, generatedKeys: KeyGenerationResult, password: string) {
  const trimmed = accountName.trim();
  const { symmetricKey } = await KDF.deriveKeyFromPassword(password, trimmed);
  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  await storageManager.storeAccountData({
    accountName: trimmed,
    mnemonic: generatedKeys.mnemonic,
    createdAt: Date.now(),
  });

  await KDF.storeSessionInfo(trimmed, "password");
}
