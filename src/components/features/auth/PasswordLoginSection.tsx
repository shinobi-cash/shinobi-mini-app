/**
 * Password Login Section - For Existing Account Login Flow
 * Authenticates with password and loads account keys from storage
 */

import { useAuth } from "@/contexts/AuthContext";
import { KDF } from "@/lib/storage/services/KeyDerivationService";
import { storageManager } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import { restoreFromMnemonic } from "@/utils/crypto";
import { Eye, EyeOff, Lock } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

interface PasswordLoginSectionProps {
  onSuccess: () => void;
}

export function PasswordLoginSection({ onSuccess }: PasswordLoginSectionProps) {
  const [accountName, setAccountName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setKeys } = useAuth();
  // Auto-focus on account name input when component mounts
  useEffect(() => {
    const input = document.getElementById("username-password-login") as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim() || !accountName.trim()) {
      setError("Please enter both account name and password");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Derive encryption key from password
      const { symmetricKey } = await KDF.deriveKeyFromPassword(password, accountName.trim());

      // Initialize account-scoped session with derived key
      await storageManager.initializeAccountSession(accountName.trim(), symmetricKey);

      // Retrieve and restore account keys
      const accountData = await storageManager.getAccountData();
      if (!accountData) {
        throw new Error("Account not found or incorrect password");
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
      KDF.storeSessionInfo(accountName.trim(), "password");

      showToast.auth.success("Login");
      onSuccess();
    } catch (error) {
      console.error("Password login failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePasswordLogin} className="space-y-2">
      <Input
        id="username-password-login"
        type="text"
        value={accountName}
        onChange={(e) => {
          setAccountName(e.target.value);
          if (error) setError(null); // Clear error on input change
        }}
        placeholder="Account Name"
        autoComplete="username"
        className="mt-3 mb-2"
        disabled={isProcessing}
      />

      <div className="relative">
        <Input
          id="login-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null); // Clear error on input change
          }}
          className="pr-10"
          placeholder="Enter your password"
          required
          disabled={isProcessing}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          disabled={isProcessing}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-app-tertiary" />
          ) : (
            <Eye className="h-4 w-4 text-app-tertiary" />
          )}
        </button>
      </div>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <Button
        type="submit"
        disabled={isProcessing || !password.trim() || !accountName.trim()}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Logging in...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Login with Password
          </>
        )}
      </Button>
    </form>
  );
}
