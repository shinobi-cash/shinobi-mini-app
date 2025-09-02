/**
 * Passkey Setup Section - For Account Creation Flow
 * Takes provided keys and creates a new passkey for the account
 */

import { useAuth } from "@/contexts/AuthContext";
import { useBanner } from "@/contexts/BannerContext";
import { KDF } from "@/lib/auth/keyDerivation";
import { storageManager } from "@/lib/storage";
import { type KeyGenerationResult, createHash } from "@/utils/crypto";
import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";

interface PasskeySetupSectionProps {
  accountName: string;
  accountNameError?: string;
  generatedKeys: KeyGenerationResult | null;
  onSuccess: () => void;
}

export function PasskeySetupSection({
  accountName,
  accountNameError,
  generatedKeys,
  onSuccess,
}: PasskeySetupSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { setKeys } = useAuth();
  const { banner } = useBanner();

  const handlePasskeySetup = async () => {
    if (accountNameError || !accountName.trim() || !generatedKeys) {
      return;
    }

    // Check for existing passkey
    const hasPasskey = await storageManager.passkeyExists(accountName.trim());
    if (hasPasskey) {
      banner.error("Passkey already exists");
      return;
    }

    setIsProcessing(true);

    try {
      // Derive public key hash as user handle for WebAuthn
      const { publicKey } = generatedKeys;
      const userHandle = await createHash(publicKey);

      // Create passkey credential
      const { credentialId } = await KDF.createPasskeyCredential(accountName.trim(), userHandle);

      // Derive encryption key from the passkey
      const { symmetricKey } = await KDF.deriveKeyFromPasskey(accountName.trim(), credentialId);

      // Initialize session with the derived key
      await storageManager.initializeAccountSession(accountName.trim(), symmetricKey);

      // Store account data using the session
      const accountData = {
        accountName: accountName.trim(),
        mnemonic: generatedKeys.mnemonic,
        createdAt: Date.now(),
      };
      await storageManager.storeAccountData(accountData);

      // Store passkey metadata
      const passkeyData = {
        accountName: accountName.trim(),
        credentialId: credentialId,
        challenge: "", // Not needed with PRF
        publicKeyHash: userHandle,
        created: Date.now(),
      };
      await storageManager.storePasskeyData(passkeyData);

      // Store session info for restoration
      KDF.storeSessionInfo(accountName.trim(), "passkey", { credentialId });

      // Set keys in auth context
      setKeys(generatedKeys);

      banner.success("Account created");
      onSuccess();
    } catch (error) {
      console.error("Passkey setup failed:", error);
      if (error instanceof Error && error.message.includes("PRF")) {
        banner.error("Device not supported");
      } else {
        banner.error("Passkey setup failed");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handlePasskeySetup}
      disabled={isProcessing || !!accountNameError || !accountName.trim()}
      className="w-full"
      size="lg"
    >
      {isProcessing ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          Setting up Passkey...
        </>
      ) : (
        <>
          <Fingerprint className="w-4 h-4 mr-2" />
          Set up Passkey
        </>
      )}
    </Button>
  );
}
