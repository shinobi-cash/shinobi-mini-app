/**
 * Authentication Drawer - Environment-specific secure access
 * Shows passkey authentication in non-iframe environments
 * Shows password authentication in iframe/Farcaster environments
 * Follows mobile-first drawer design patterns
 */

import { type KeyGenerationResult, restoreFromMnemonic, validateMnemonic } from "@/utils/crypto";
import { isPasskeySupported } from "@/utils/environment";
import { ChevronLeft, Fingerprint, Lock, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../../ui/drawer";
import { AuthSection } from "./AuthSection";
import SetupConvenientAuth from "./SetupConvenientAuth";
import { storageManager } from "@/lib/storage";

interface LogInDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionInitialized: () => void;
}

type AuthStep = "ChooseLoginMethod" | "LoginWithConvenientAuth" | "LoginWithBackupPhrase" | "SetupConvenientAuth";

function LoginWithBackupPhrase({ onRecoverAccountKey }: { onRecoverAccountKey: (key: KeyGenerationResult) => void }) {
  // State for recovery
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-focus on first input when component mounts
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);
  const handlePaste = (e: React.ClipboardEvent, idx: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text/plain");
    const pastedWords = pastedText.trim().split(/\s+/);

    if (pastedWords.length === 12) {
      // Full seed phrase pasted - populate all fields
      setWords(pastedWords);
    } else if (pastedWords.length === 1) {
      // Single word pasted - just update current field
      const updated = [...words];
      updated[idx] = pastedWords[0].trim();
      setWords(updated);
    }
    // For other lengths, ignore the paste to prevent partial corruption
  };

  const handleChange = (idx: number, value: string) => {
    const updated = [...words];
    updated[idx] = value.trim();
    setWords(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!words.every((w) => w.trim())) {
      setError("Please enter all 12 words of your Login with Backup Phrase.");
      return;
    }

    // Validate mnemonic words using proper crypto validation
    if (!validateMnemonic(words)) {
      setError("Invalid Backup phrase. Please check your words and try again.");
      return;
    }

    setIsProcessing(true);

    try {
      // Restore account from mnemonic
      const restoredKey = restoreFromMnemonic(words);
      onRecoverAccountKey(restoredKey);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to recover account. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Word Grid */}
      <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {words.map((word, idx) => (
                <div key={`word-field-${idx}-${word}`} className="flex flex-col">
                  <label htmlFor={`word-${idx}`} className="text-xs font-medium text-app-secondary text-center mb-1">
                    {idx + 1}
                  </label>
                  <input
                    id={`word-${idx}`}
                    ref={idx === 0 ? firstInputRef : undefined}
                    type="text"
                    className="p-2 rounded-lg border border-app text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-app-background"
                    placeholder="word"
                    value={word}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onPaste={(e) => handlePaste(e, idx)}
                    disabled={isProcessing}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={isProcessing || !words.every((w) => w)}>
              {isProcessing ? "Processing..." : "Load Account"}
            </Button>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
          </form>
        </div>
    </div>
  );
}

// Use centralized environment detection

export function LogInDrawer({ open, onOpenChange }: LogInDrawerProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>("ChooseLoginMethod");
  const [shouldShowPasskey] = useState(isPasskeySupported());
  const [loginKey, setLoginKey] = useState<KeyGenerationResult | null>(null);
  const [, setAvailableAccounts] = useState<string[]>([]);

  // Load available accounts when drawer opens
  useEffect(() => {
    if (open) {
      const loadAccounts = async () => {
        try {
          const accounts = await storageManager.listAccountNames();
          setAvailableAccounts(accounts);
        } catch (error) {
          console.error("Failed to load accounts:", error);
        }
      };
      loadAccounts();
    }
  }, [open]);

  const onRecoverAccountKey = (key: KeyGenerationResult) => {
    setLoginKey(key);
    setCurrentStep("SetupConvenientAuth");
  };

  const onSetupConvenientAuthComplete = () => {
    resetState();
    onOpenChange(false);
  };

  const onLoginWithConvenientAuthComplete = () => {
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setCurrentStep("ChooseLoginMethod");
    setLoginKey(null);
  };

  const handleBack = () => {
    switch (currentStep) {
      case "LoginWithConvenientAuth":
      case "LoginWithBackupPhrase":
        setCurrentStep("ChooseLoginMethod");
        break;
      case "SetupConvenientAuth":
        setCurrentStep("LoginWithBackupPhrase");
        break;
      default:
        setCurrentStep("ChooseLoginMethod");
    }
  };

  const canGoBack = currentStep !== "ChooseLoginMethod";

  const renderContent = () => {
    switch (currentStep) {
      case "ChooseLoginMethod":
        return (
          <div className="space-y-4">
            {/* Always show password/passkey option */}
            <Button onClick={() => setCurrentStep("LoginWithConvenientAuth")} className="w-full" size="lg">
              {shouldShowPasskey ? (
                <>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Continue with Passkey
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Continue with Password
                </>
              )}
            </Button>

            {/* Always show backup phrase option */}
            <Button variant="outline" onClick={() => setCurrentStep("LoginWithBackupPhrase")} className="w-full">
              Continue with Backup Phrase
            </Button>
          </div>
        );

      case "LoginWithConvenientAuth":
        return <AuthSection mode={"login"} onSuccess={onLoginWithConvenientAuthComplete} />;

      case "LoginWithBackupPhrase":
        return <LoginWithBackupPhrase onRecoverAccountKey={onRecoverAccountKey} />;

      case "SetupConvenientAuth":
        return (
          <SetupConvenientAuth generatedKeys={loginKey} onSetupConvenientAuthComplete={onSetupConvenientAuthComplete} />
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (currentStep) {
      case "ChooseLoginMethod":
        return "Login";
      case "LoginWithConvenientAuth":
        return shouldShowPasskey ? "Passkey" : "Password";
      case "LoginWithBackupPhrase":
        return "Recovery";
      case "SetupConvenientAuth":
        return shouldShowPasskey ? "Setup Passkey" : "Setup Password";
      default:
        return "Auth";
    }
  };

  const getDescription = () => {
    switch (currentStep) {
      case "ChooseLoginMethod":
        return "Choose login method";
      case "LoginWithConvenientAuth":
        return shouldShowPasskey ? "Use biometric auth" : "Enter account and password";
      case "LoginWithBackupPhrase":
        return "Enter recovery phrase";
      case "SetupConvenientAuth":
        return shouldShowPasskey ? "Setup biometric access" : "Create secure password";
      default:
        return "";
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          resetState();
        }
        onOpenChange(newOpen);
      }}
    >
      <DrawerContent className="bg-app-background border-app max-h-[85vh]">
        {/* iOS-style drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-app-tertiary/30" />

        <DrawerHeader className="pb-0 px-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canGoBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="h-8 w-8 p-0 hover:bg-app-surface-hover transition-colors duration-200"
                >
                  <ChevronLeft className="h-4 w-4 text-app-secondary" />
                </Button>
              )}
              <DrawerTitle className="text-lg font-semibold text-app-primary tracking-tight text-left">
                {getTitle()}
              </DrawerTitle>
            </div>
            <DrawerClose className="h-8 w-8 flex items-center justify-center hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-4 w-4 text-app-secondary" />
            </DrawerClose>
          </div>
          <DrawerDescription className="text-sm text-left text-app-secondary">{getDescription()}</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="p-2">{renderContent()}</div>

          <div className="text-center mt-4">
            <p className="text-xs text-app-tertiary">🔐 Your data is encrypted locally and never leaves your device</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
