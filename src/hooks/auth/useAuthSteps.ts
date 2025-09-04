import type { KeyGenerationResult } from "@/utils/crypto";
import { useState } from "react";

export type AuthStep =
  | "choose"
  | "login-method"
  | "login-convenient"
  | "login-backup"
  | "create-keys"
  | "create-backup"
  | "setup-convenient";

interface UseAuthStepsOptions {
  onAuthComplete?: () => void;
}

export function useAuthSteps(options: UseAuthStepsOptions = {}) {
  const [currentStep, setCurrentStep] = useState<AuthStep>("choose");
  const [generatedKeys, setGeneratedKeys] = useState<KeyGenerationResult | null>(null);
  const [loginKey, setLoginKey] = useState<KeyGenerationResult | null>(null);

  const resetState = () => {
    setCurrentStep("choose");
    setGeneratedKeys(null);
    setLoginKey(null);
  };

  const canGoBack = () => {
    return [
      "login-method",
      "login-convenient",
      "login-backup",
      "create-keys",
      "create-backup",
      "setup-convenient",
    ].includes(currentStep);
  };

  const handleBack = () => {
    switch (currentStep) {
      case "login-method":
      case "create-keys":
        setCurrentStep("choose");
        break;
      case "login-convenient":
      case "login-backup":
        setCurrentStep("login-method");
        break;
      case "create-backup":
        setCurrentStep("create-keys");
        break;
      case "setup-convenient":
        if (loginKey) {
          setCurrentStep("login-backup");
        } else {
          setCurrentStep("create-backup");
        }
        break;
    }
  };

  // Step handlers
  const handleLoginChoice = () => setCurrentStep("login-method");
  const handleCreateChoice = () => setCurrentStep("create-keys");

  const handleLoginMethodChoice = (method: "convenient" | "backup") => {
    setCurrentStep(method === "convenient" ? "login-convenient" : "login-backup");
  };

  const handleKeyGenerationComplete = (keys: KeyGenerationResult) => {
    setGeneratedKeys(keys);
    setCurrentStep("create-backup");
  };

  const handleBackupComplete = () => {
    setCurrentStep("setup-convenient");
  };

  const handleRecoveryComplete = (keys: KeyGenerationResult) => {
    setLoginKey(keys);
    setCurrentStep("setup-convenient");
  };

  const handleConvenientAuthComplete = () => {
    resetState();
    options.onAuthComplete?.();
  };

  return {
    currentStep,
    generatedKeys,
    loginKey,
    resetState,
    canGoBack,
    handleBack,
    handleLoginChoice,
    handleCreateChoice,
    handleLoginMethodChoice,
    handleKeyGenerationComplete,
    handleBackupComplete,
    handleRecoveryComplete,
    handleConvenientAuthComplete,
  };
}
