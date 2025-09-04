/**
 * Passkey Setup Form
 * Complete form with account name input and passkey authentication setup
 * Handles account validation, passkey creation, and key storage
 */

import { useAuth } from "@/contexts/AuthContext";
import { KDF } from "@/lib/auth/keyDerivation";
import { storageManager } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import { type KeyGenerationResult, createHash } from "@/utils/crypto";
import { AlertCircle, Fingerprint } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

interface PasskeySetupFormProps {
  generatedKeys: KeyGenerationResult | null;
  onSuccess: () => void;
}

export function PasskeySetupForm({ generatedKeys, onSuccess }: PasskeySetupFormProps) {
  const [accountName, setAccountName] = useState("");
  const [accountNameError, setAccountNameError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupError, setSetupError] = useState("");
  const { setKeys } = useAuth();
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus on account name input when component mounts
  useEffect(() => {
    const input = document.getElementById("account-name") as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Account name validation - exact same logic as SetupConvenientAuth
  const validateAccountName = async (name: string): Promise<string | null> => {
    if (!name.trim()) {
      return "Account name is required";
    }
    if (name.length < 2) {
      return "Account name must be at least 2 characters";
    }
    if (name.length > 30) {
      return "Account name must be less than 30 characters";
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return "Account name can only contain letters, numbers, spaces, hyphens, and underscores";
    }
    // Check if account already exists
    const exists = await storageManager.accountExists(name.trim());
    if (exists) {
      return "An account with this name already exists";
    }
    return null;
  };

  const handlePasskeySetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accountNameError || !accountName.trim() || !generatedKeys) {
      return;
    }

    // Check for existing passkey
    const hasPasskey = await storageManager.passkeyExists(accountName.trim());
    if (hasPasskey) {
      setSetupError("Passkey already exists for this account");
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

      showToast.auth.success("Account created");
      onSuccess();
    } catch (error) {
      console.error("Passkey setup failed:", error);
      if (error instanceof Error && error.message.includes("PRF")) {
        setSetupError("Device not supported - passkeys with PRF extension required");
      } else {
        setSetupError("Passkey setup failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePasskeySetup} className="space-y-2">
      <Input
        id="account-name"
        type="text"
        value={accountName}
        onChange={(e) => {
          setAccountName(e.target.value);
          if (accountNameError) setAccountNameError("");
          if (setupError) setSetupError("");

          // Debounce the validation to avoid excessive database calls
          if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current);
          }

          if (e.target.value.trim()) {
            validationTimeoutRef.current = setTimeout(async () => {
              try {
                const error = await validateAccountName(e.target.value);
                setAccountNameError(error || "");
              } catch (err) {
                console.warn("Account validation failed:", err);
                // Don't set an error - just skip validation if DB is not ready
              }
            }, 500); // Wait 500ms after user stops typing
          }
        }}
        placeholder="Account Name"
        maxLength={30}
        autoComplete="off"
        aria-invalid={!!accountNameError}
      />
      {accountNameError && <p className="text-red-600 text-xs">{accountNameError}</p>}

      {/* Setup Status Messages */}
      {setupError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{setupError}</p>
        </div>
      )}

      <Button
        type="submit"
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
    </form>
  );
}
