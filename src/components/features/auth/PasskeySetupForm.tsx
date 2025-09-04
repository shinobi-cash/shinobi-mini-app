/**
 * Passkey Setup Form
 * Complete form with account name input and passkey authentication setup
 * Handles account validation, passkey creation, and key storage
 */

import { useAuth } from "@/contexts/AuthContext";
import { storageManager } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import type { KeyGenerationResult } from "@/utils/crypto";
import { useAccountNameValidation } from "@/hooks/useAccountNameValidation";
import { AlertCircle, Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { performPasskeySetup } from "./helpers/authFlows";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";

interface PasskeySetupFormProps {
  generatedKeys: KeyGenerationResult | null;
  onSuccess: () => void;
}

export function PasskeySetupForm({ generatedKeys, onSuccess }: PasskeySetupFormProps) {
  const [accountName, setAccountName] = useState("");
  const { accountNameError, onAccountNameChange, setAccountNameError } = useAccountNameValidation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupError, setSetupError] = useState("");
  const { setKeys } = useAuth();

  // Auto-focus on account name input when component mounts
  useEffect(() => {
    const input = document.getElementById("account-name") as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  // Account name validation moved to shared util

  const handlePasskeySetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accountNameError || !accountName.trim() || !generatedKeys) {
      return;
    }

    setIsProcessing(true);

    try {
      await performPasskeySetup(accountName, generatedKeys);

      // Set keys in auth context for immediate use
      setKeys(generatedKeys);

      // Optionally initialize sync baseline for new account
      if (generatedKeys.publicKey) {
        try {
          await storageManager.initializeSyncBaseline(generatedKeys.publicKey);
        } catch (error) {
          console.warn("Failed to initialize sync baseline:", error);
          // Non-fatal
        }
      }

      showToast.auth.success("Account created");
      onSuccess();
    } catch (error) {
      console.error("Passkey setup failed:", error);
      if (error instanceof AuthError) {
        if (error.code === AuthErrorCode.PASSKEY_PRF_UNSUPPORTED) {
          setSetupError("Device not supported - passkeys with PRF extension required");
        } else if (error.code === AuthErrorCode.ACCOUNT_ALREADY_EXISTS) {
          setSetupError("Passkey already exists for this account");
        } else if (error.code === AuthErrorCode.PASSKEY_CANCELLED) {
          setSetupError("Setup was cancelled. Please try again.");
        } else {
          setSetupError(error.message || "Passkey setup failed. Please try again.");
        }
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
          onAccountNameChange(e.target.value);
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
