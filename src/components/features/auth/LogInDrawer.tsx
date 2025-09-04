/**
 * Authentication Drawer - Environment-specific secure access
 * Shows passkey authentication in non-iframe environments
 * Shows password authentication in iframe/Farcaster environments
 * Follows mobile-first drawer design patterns
 */

import { useAuthSteps } from "@/hooks/auth/useAuthSteps";
import { storageManager } from "@/lib/storage";
import { isPasskeySupported } from "@/utils/environment";
import { useEffect } from "react";
import { ResponsiveModal } from "../../ui/responsive-modal";
import { AuthStepContent } from "./AuthStepContent";

interface LogInDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionInitialized: () => void;
}

export function LogInDrawer({ open, onOpenChange, onSessionInitialized }: LogInDrawerProps) {
  const shouldShowPasskey = isPasskeySupported();

  // Use shared auth steps logic
  const authSteps = useAuthSteps({
    onAuthComplete: () => {
      onSessionInitialized();
    },
  });

  // Load available accounts when drawer opens
  useEffect(() => {
    if (open) {
      const loadAccounts = async () => {
        try {
          await storageManager.listAccountNames();
        } catch (error) {
          console.error("Failed to load accounts:", error);
        }
      };
      loadAccounts();
    }
  }, [open]);

  const getTitle = () => {
    switch (authSteps.currentStep) {
      case "choose":
        return "Login";
      case "login-method":
        return "Login";
      case "login-convenient":
        return shouldShowPasskey ? "Passkey" : "Password";
      case "login-backup":
        return "Recovery";
      case "create-keys":
        return "Generate Keys";
      case "create-backup":
        return "Backup Phrase";
      case "setup-convenient":
        return shouldShowPasskey ? "Setup Passkey" : "Setup Password";
      case "syncing-notes":
        return "Syncing Notes";
      default:
        return "Auth";
    }
  };

  const getDescription = () => {
    switch (authSteps.currentStep) {
      case "choose":
        return "Choose login method";
      case "login-method":
        return "Choose login method";
      case "login-convenient":
        return shouldShowPasskey ? "Use biometric auth" : "Enter account and password";
      case "login-backup":
        return "Enter recovery phrase";
      case "create-keys":
        return "Generate keys locally";
      case "create-backup":
        return "Save your recovery phrase";
      case "setup-convenient":
        return shouldShowPasskey ? "Setup biometric access" : "Create secure password";
      case "syncing-notes":
        return "Finding your privacy notes";
      default:
        return "";
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          authSteps.resetState();
        }
        onOpenChange(newOpen);
      }}
      title={getTitle()}
      description={getDescription()}
      showBackButton={authSteps.canGoBack()}
      onBack={authSteps.handleBack}
      className="bg-app-background border-app"
    >
      <AuthStepContent
        currentStep={authSteps.currentStep}
        generatedKeys={authSteps.generatedKeys}
        loginKey={authSteps.loginKey}
        onLoginChoice={authSteps.handleLoginChoice}
        onCreateChoice={authSteps.handleCreateChoice}
        onLoginMethodChoice={authSteps.handleLoginMethodChoice}
        onKeyGenerationComplete={authSteps.handleKeyGenerationComplete}
        onBackupComplete={authSteps.handleBackupComplete}
        onRecoveryComplete={authSteps.handleRecoveryComplete}
        onConvenientAuthComplete={authSteps.handleConvenientAuthComplete}
        onSyncingComplete={authSteps.handleSyncingComplete}
      />

      <div className="text-center mt-4">
        <p className="text-xs text-app-tertiary">🔐 Your data is encrypted locally and never leaves your device</p>
      </div>
    </ResponsiveModal>
  );
}
