/**
 * Passkey Login Section - For Existing Account Login Flow
 * Authenticates with existing passkey and loads account keys from storage
 */

import { useAuth } from "@/contexts/AuthContext";
import { showToast } from "@/lib/toast";
import { KDF } from "@/lib/auth/keyDerivation";
import { storageManager } from "@/lib/storage";
import { restoreFromMnemonic } from "@/utils/crypto";
import { Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

interface PasskeyLoginSectionProps {
  onSuccess: () => void;
}

export function PasskeyLoginSection({ onSuccess }: PasskeyLoginSectionProps) {
  const [accountName, setAccountName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setKeys } = useAuth();
  // Auto-focus on account name input when component mounts
  useEffect(() => {
    const input = document.getElementById("username-login") as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  const handlePasskeyLogin = async () => {
    if (!accountName.trim()) {
      setError("Please enter an account name");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Get passkey data for this account
      const passkeyData = await storageManager.getPasskeyData(accountName.trim());
      if (!passkeyData) {
        throw new Error(`No passkey found for account '${accountName.trim()}'. Please create one first.`);
      }

      // Derive encryption key from passkey
      const { symmetricKey } = await KDF.deriveKeyFromPasskey(accountName.trim(), passkeyData.credentialId);

      // Initialize account-scoped session
      await storageManager.initializeAccountSession(accountName.trim(), symmetricKey);

      // Retrieve and restore account keys
      const accountData = await storageManager.getAccountData();
      if (!accountData) {
        throw new Error("Account data not found");
      }

      // Derive all keys from the stored mnemonic
      const { publicKey, privateKey, address } = restoreFromMnemonic(accountData.mnemonic);
      setKeys({
        publicKey,
        privateKey,
        mnemonic: accountData.mnemonic,
        address,
      });

      // Store session info for future restoration
      KDF.storeSessionInfo(accountName.trim(), "passkey", { credentialId: passkeyData.credentialId });

      showToast.auth.success("Passkey login");
      onSuccess();
    } catch (error) {
      console.error("Passkey login failed:", error);
      let errorMessage = "Authentication failed. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("PRF")) {
          errorMessage =
            "Your device does not support advanced passkey features. Please use password authentication instead.";
        } else if (error.message.includes("No passkey found")) {
          errorMessage = error.message;
        } else if (error.message.includes("canceled") || error.message.includes("not allowed")) {
          errorMessage = "Authentication was cancelled. Please try again.";
        }
      }

      setError(errorMessage);
      showToast.auth.error("Passkey login");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        id="username-login"
        type="text"
        value={accountName}
        onChange={(e) => {
          setAccountName(e.target.value);
          if (error) setError(null); // Clear error on input change
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && accountName.trim() && !isProcessing) {
            handlePasskeyLogin();
          }
        }}
        placeholder="Account Name"
        autoComplete="username webauthn"
        className="mt-3 mb-2"
        disabled={isProcessing}
      />

      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

      <Button onClick={handlePasskeyLogin} disabled={isProcessing || !accountName.trim()} className="w-full" size="lg">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Authenticating...
          </>
        ) : (
          <>
            <Fingerprint className="w-4 h-4 mr-2" />
            Login with Passkey
          </>
        )}
      </Button>
    </div>
  );
}
