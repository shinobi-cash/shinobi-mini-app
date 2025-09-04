/**
 * Password Setup Form
 * Complete form with account name input and password authentication setup
 * Handles account validation, password creation, and encrypted key storage
 */

import { useAuth } from "@/contexts/AuthContext";
import { storageManager } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import type { KeyGenerationResult } from "@/utils/crypto";
import { validateAccountName } from "@/utils/validation";
import { AlertCircle, Eye, EyeOff, Lock } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { performPasswordSetup } from "./helpers/authFlows";

interface PasswordSetupFormProps {
  generatedKeys: KeyGenerationResult | null;
  onSuccess: () => void;
}

export function PasswordSetupForm({ generatedKeys, onSuccess }: PasswordSetupFormProps) {
  const [accountName, setAccountName] = useState("");
  const [accountNameError, setAccountNameError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordError, setPasswordError] = useState("");
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

  // Account name validation moved to shared util

  const validatePassword = (pass: string) => {
    if (pass.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(pass)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(pass)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(pass)) {
      return "Password must contain at least one number";
    }
    return "";
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accountNameError || !accountName.trim() || !generatedKeys) {
      return;
    }

    const passError = validatePassword(password);
    if (passError) {
      setPasswordError(passError);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      // Check for existing account (this also initializes the database)
      const existingAccount = await storageManager.getAccountDataByName(accountName.trim());
      if (existingAccount) {
        setSetupError("Account already exists");
        return;
      }
    } catch (error) {
      console.error("Failed to check existing account:", error);
      setSetupError("Database error");
      return;
    }

    setIsProcessing(true);

    try {
      await performPasswordSetup(accountName, generatedKeys, password);

      // Set keys in auth context
      setKeys(generatedKeys);

      // Initialize sync baseline for new account to avoid scanning historical blockchain data
      if (generatedKeys.publicKey) {
        try {
          await storageManager.initializeSyncBaseline(generatedKeys.publicKey);
        } catch (error) {
          console.warn("Failed to initialize sync baseline:", error);
          // Don't block account creation if this fails
        }
      }

      showToast.auth.success("Account created");
      onSuccess();
    } catch (error) {
      console.error("Password setup failed:", error);
      setSetupError("Setup failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePasswordSetup} className="space-y-3">
      <div>
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
        {accountNameError && <p className="text-red-600 text-xs mt-1">{accountNameError}</p>}
      </div>

      <div className="relative">
        <Input
          id="setup-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError("");
            if (setupError) setSetupError("");
          }}
          className="pr-10"
          placeholder="Enter password"
          required
          disabled={isProcessing}
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

      <div className="relative">
        <Input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (passwordError) setPasswordError("");
          }}
          placeholder="Confirm your password"
          required
          disabled={isProcessing}
        />
      </div>

      {passwordError && <p className="text-red-600 text-xs">{passwordError}</p>}

      {/* Setup Status Messages */}
      {setupError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{setupError}</p>
        </div>
      )}

      <div className="text-xs text-app-tertiary space-y-1">
        <p>Password requirements:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>At least 8 characters</li>
          <li>One uppercase and lowercase letter</li>
          <li>One number</li>
        </ul>
      </div>

      <Button
        type="submit"
        disabled={isProcessing || !!accountNameError || !accountName.trim() || !password || !confirmPassword}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Setting up Password...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Set up Password Access
          </>
        )}
      </Button>
    </form>
  );
}
