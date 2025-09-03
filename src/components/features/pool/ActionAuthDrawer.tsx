/**
 * Action Auth Drawer
 * Handles complete end-to-end authentication flow for pool actions
 * Guides users through auth and wallet connection based on the specific action context
 */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useNavigation, type Asset } from "@/contexts/NavigationContext";
import { ChevronLeft, WalletIcon, ArrowRight, Fingerprint, Lock } from "lucide-react";
import { Button } from "../../ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "../../ui/drawer";
import { AuthSection } from "../auth/AuthSection";
import { KeyGenerationSection } from "../auth/KeyGenerationSection";
import { BackupMnemonicSection } from "../auth/BackupMnemonicSection";
import SetupConvenientAuth from "../auth/SetupConvenientAuth";
import { type KeyGenerationResult, restoreFromMnemonic, validateMnemonic } from "@/utils/crypto";
import { isPasskeySupported } from "@/utils/environment";

type AuthStep = 
  | "auth-choose"
  | "auth-login-method"
  | "auth-login-convenient"
  | "auth-login-backup"
  | "auth-create-keys"
  | "auth-create-backup"
  | "auth-setup-convenient"
  | "wallet"
  | "complete";

type ActionType = "deposit" | "withdraw" | "my-notes";

interface ActionAuthDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionType;
  asset: Asset;
}

// Backup phrase recovery component
function LoginWithBackupPhrase({ onRecoverAccountKey }: { onRecoverAccountKey: (key: KeyGenerationResult) => void }) {
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);

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
      setWords(pastedWords);
    } else if (pastedWords.length === 1) {
      const updated = [...words];
      updated[idx] = pastedWords[0].trim();
      setWords(updated);
    }
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

    if (!validateMnemonic(words)) {
      setError("Invalid Backup phrase. Please check your words and try again.");
      return;
    }

    setIsProcessing(true);

    try {
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

export function ActionAuthDrawer({ open, onOpenChange, action, asset }: ActionAuthDrawerProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>("auth-choose");
  const [generatedKeys, setGeneratedKeys] = useState<KeyGenerationResult | null>(null);
  const [loginKey, setLoginKey] = useState<KeyGenerationResult | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const shouldShowPasskey = isPasskeySupported();
  
  const { isAuthenticated } = useAuth();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { navigateToScreen } = useNavigation();

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setCurrentStep("auth-choose");
      setGeneratedKeys(null);
      setLoginKey(null);
    }
  }, [open]);

  // Auto-progress when authentication or wallet requirements are met
  useEffect(() => {
    if (!open) return;

    if (isAuthenticated && (currentStep === "auth-choose" || currentStep.startsWith("auth-"))) {
      // Auth complete, check if wallet is needed
      if (action === "deposit" && !isConnected) {
        setCurrentStep("wallet");
      } else {
        setCurrentStep("complete");
      }
    } else if (action === "deposit" && isAuthenticated && isConnected && currentStep === "wallet") {
      // Wallet connected during wallet step, move to complete
      setCurrentStep("complete");
    }

    if (currentStep === "complete") {
      // All steps complete, navigate to target screen
      onOpenChange(false);
      navigateToScreen(getTargetScreen(action), asset);
    }
  }, [open, isAuthenticated, isConnected, currentStep, action, asset, navigateToScreen, onOpenChange]);

  const getTargetScreen = (actionType: ActionType): "deposit" | "withdraw" | "my-notes" => {
    return actionType;
  };

  const canGoBack = () => {
    return ["auth-login-method", "auth-login-convenient", "auth-login-backup", "auth-create-keys", "auth-create-backup", "auth-setup-convenient", "wallet"].includes(currentStep);
  };

  const handleBack = () => {
    switch (currentStep) {
      case "auth-login-method":
      case "auth-create-keys":
        setCurrentStep("auth-choose");
        break;
      case "auth-login-convenient":
      case "auth-login-backup":
        setCurrentStep("auth-login-method");
        break;
      case "auth-create-backup":
        setCurrentStep("auth-create-keys");
        break;
      case "auth-setup-convenient":
        if (loginKey) {
          setCurrentStep("auth-login-backup");
        } else {
          setCurrentStep("auth-create-backup");
        }
        break;
      case "wallet":
        setCurrentStep("auth-choose");
        break;
    }
  };

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true);
    openConnectModal?.();
  };

  // Reset wallet modal state when connection changes
  useEffect(() => {
    if (isConnected && isWalletModalOpen) {
      setIsWalletModalOpen(false);
    }
  }, [isConnected, isWalletModalOpen]);

  // Auth flow handlers
  const handleLoginChoice = () => {
    setCurrentStep("auth-login-method");
  };

  const handleCreateChoice = () => {
    setCurrentStep("auth-create-keys");
  };

  const handleLoginMethodChoice = (method: "convenient" | "backup") => {
    if (method === "convenient") {
      setCurrentStep("auth-login-convenient");
    } else {
      setCurrentStep("auth-login-backup");
    }
  };

  const handleKeyGenerationComplete = (keys: KeyGenerationResult) => {
    setGeneratedKeys(keys);
    setCurrentStep("auth-create-backup");
  };

  const handleBackupComplete = () => {
    setCurrentStep("auth-setup-convenient");
  };

  const handleRecoveryComplete = (keys: KeyGenerationResult) => {
    setLoginKey(keys);
    setCurrentStep("auth-setup-convenient");
  };

  const handleConvenientAuthComplete = () => {
    // Auth complete, reset and let auto-progress handle next steps
    setLoginKey(null);
    setGeneratedKeys(null);
  };

  const getActionTitle = () => {
    switch (action) {
      case "deposit": return `Deposit ${asset.symbol}`;
      case "withdraw": return `Withdraw ${asset.symbol}`;
      case "my-notes": return "My Notes";
      default: return "Get Started";
    }
  };

  const getTitle = () => {
    switch (currentStep) {
      case "auth-choose":
        return getActionTitle();
      case "auth-login-method":
        return "Login";
      case "auth-login-convenient":
        return shouldShowPasskey ? "Passkey" : "Password";
      case "auth-login-backup":
        return "Recovery";
      case "auth-create-keys":
        return "Generate Keys";
      case "auth-create-backup":
        return "Backup Phrase";
      case "auth-setup-convenient":
        return shouldShowPasskey ? "Setup Passkey" : "Setup Password";
      case "wallet":
        return "Connect Wallet";
      default:
        return getActionTitle();
    }
  };

  const getDescription = () => {
    switch (currentStep) {
      case "auth-choose":
        switch (action) {
          case "deposit": return "Sign in to access deposit functionality";
          case "withdraw": return "Sign in to access your privacy notes";
          case "my-notes": return "Sign in to view your transaction history";
          default: return "Sign in to continue";
        }
      case "auth-login-method":
        return "Choose login method";
      case "auth-login-convenient":
        return shouldShowPasskey ? "Use biometric auth" : "Enter account and password";
      case "auth-login-backup":
        return "Enter recovery phrase";
      case "auth-create-keys":
        return "Generate keys locally";
      case "auth-create-backup":
        return "Save your recovery phrase";
      case "auth-setup-convenient":
        return shouldShowPasskey ? "Setup biometric access" : "Create secure password";
      case "wallet":
        return "Connect your wallet to fund privacy pool deposits";
      default:
        return "";
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "auth-choose":
        return (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant="default"
                className="flex-1 h-12 text-base font-medium rounded-2xl"
                onClick={handleLoginChoice}
                size="lg"
              >
                Log In
              </Button>

              <Button
                variant="outline"
                className="flex-1 h-12 text-base font-medium rounded-2xl border border-app"
                onClick={handleCreateChoice}
                size="lg"
              >
                Create Account
              </Button>
            </div>
          </div>
        );

      case "auth-login-method":
        return (
          <div className="space-y-4">
            <Button onClick={() => handleLoginMethodChoice("convenient")} className="w-full" size="lg">
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

            <Button variant="outline" onClick={() => handleLoginMethodChoice("backup")} className="w-full">
              Continue with Backup Phrase
            </Button>
          </div>
        );

      case "auth-login-convenient":
        return <AuthSection mode="login" onSuccess={handleConvenientAuthComplete} />;

      case "auth-login-backup":
        return <LoginWithBackupPhrase onRecoverAccountKey={handleRecoveryComplete} />;

      case "auth-create-keys":
        return <KeyGenerationSection onKeyGenerationComplete={handleKeyGenerationComplete} />;

      case "auth-create-backup":
        return (
          <BackupMnemonicSection
            generatedKeys={generatedKeys}
            onBackupMnemonicComplete={handleBackupComplete}
          />
        );

      case "auth-setup-convenient":
        return (
          <SetupConvenientAuth
            generatedKeys={generatedKeys || loginKey}
            onSetupConvenientAuthComplete={handleConvenientAuthComplete}
          />
        );

      case "wallet":
        return (
          <div className="space-y-4">
            <Button
              variant="default"
              className="w-full h-12 text-base font-medium rounded-2xl"
              onClick={handleConnectWallet}
              size="lg"
            >
              <WalletIcon className="w-5 h-5 mr-2" />
              Connect Wallet
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Drawer 
      open={open} 
      onOpenChange={(newOpen) => {
        // Prevent closing when wallet modal is open
        if (!newOpen && isWalletModalOpen) {
          return;
        }
        onOpenChange(newOpen);
      }}
    >
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center gap-3">
            {canGoBack() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex-1">
              <DrawerTitle className="text-left">{getTitle()}</DrawerTitle>
              <DrawerDescription className="text-left">
                {getDescription()}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6">
          {renderStepContent()}
        </div>
      </DrawerContent>
    </Drawer>
  );
}