/**
 * Authentication Drawer - Environment-specific secure access
 * Shows passkey authentication in non-iframe environments
 * Shows password authentication in iframe/Farcaster environments
 * Follows mobile-first drawer design patterns
 */

import { isPasskeySupported } from "@/utils/environment";
import { ChevronLeft, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../../ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../../ui/drawer";
import { AuthStepContent } from "./AuthStepContent";
import { useAuthSteps } from "@/hooks/auth/useAuthSteps";
import { storageManager } from "@/lib/storage";

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
    }
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
      case "choose": return "Login";
      case "login-method": return "Login";
      case "login-convenient": return shouldShowPasskey ? "Passkey" : "Password";
      case "login-backup": return "Recovery";
      case "create-keys": return "Generate Keys";
      case "create-backup": return "Backup Phrase";
      case "setup-convenient": return shouldShowPasskey ? "Setup Passkey" : "Setup Password";
      default: return "Auth";
    }
  };

  const getDescription = () => {
    switch (authSteps.currentStep) {
      case "choose": return "Choose login method";
      case "login-method": return "Choose login method";
      case "login-convenient": return shouldShowPasskey ? "Use biometric auth" : "Enter account and password";
      case "login-backup": return "Enter recovery phrase";
      case "create-keys": return "Generate keys locally";
      case "create-backup": return "Save your recovery phrase";
      case "setup-convenient": return shouldShowPasskey ? "Setup biometric access" : "Create secure password";
      default: return "";
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          authSteps.resetState();
        }
        onOpenChange(newOpen);
      }}
    >
      <DrawerContent className="bg-app-background border-app">
        {/* iOS-style drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-app-tertiary/30" />

        <DrawerHeader className="pb-0 px-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {authSteps.canGoBack() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={authSteps.handleBack}
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
          <div className="p-2">
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
            />
          </div>

          <div className="text-center mt-4">
            <p className="text-xs text-app-tertiary">🔐 Your data is encrypted locally and never leaves your device</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
