import { isPasskeySupported } from "@/utils/environment";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "../../ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../../ui/drawer";
import { AuthStepContent } from "./AuthStepContent";
import { useAuthSteps } from "@/hooks/auth/useAuthSteps";

interface CreateAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAccountDrawer = ({ open, onOpenChange }: CreateAccountDrawerProps) => {
  const shouldShowPasskey = isPasskeySupported();
  
  // Use shared auth steps logic, start with create-keys
  const authSteps = useAuthSteps({
    onAuthComplete: () => {
      onOpenChange(false);
    }
  });

  // Override to start with create flow
  const currentStep = authSteps.currentStep === "choose" ? "create-keys" : authSteps.currentStep;

  const canGoBack = () => {
    return ["create-backup", "setup-convenient"].includes(currentStep);
  };

  const handleBack = () => {
    switch (currentStep) {
      case "create-backup":
        authSteps.handleBack(); // This will go to create-keys
        break;
      case "setup-convenient":
        authSteps.handleBack(); // This will go to create-backup
        break;
    }
  };

  const getTitle = () => {
    switch (currentStep) {
      case "create-keys": return "Generate Keys";
      case "create-backup": return "Backup Phrase";
      case "setup-convenient": return shouldShowPasskey ? "Setup Passkey" : "Setup Password";
      default: return "Create Account";
    }
  };

  const getDescription = () => {
    switch (currentStep) {
      case "create-keys": return "Generate keys locally";
      case "create-backup": return "Save your recovery phrase";
      case "setup-convenient": return shouldShowPasskey ? "Setup biometric access" : "Create secure password";
      default: return "Create new account";
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
              {canGoBack() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="h-8 w-8 p-0 hover:bg-app-surface-hover transition-colors duration-200"
                >
                  <ChevronLeft className="h-4 w-4 text-app-secondary" />
                </Button>
              )}
              <div className="flex-1">
                <DrawerTitle className="text-lg font-semibold text-app-primary tracking-tight text-left">
                  {getTitle()}
                </DrawerTitle>
                <DrawerDescription className="text-sm text-left text-app-secondary mt-1">
                  {getDescription()}
                </DrawerDescription>
              </div>
            </div>
            <DrawerClose className="h-8 w-8 flex items-center justify-center hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-4 w-4 text-app-secondary" />
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="p-2">
            <AuthStepContent
              currentStep={currentStep}
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
        </div>
      </DrawerContent>
    </Drawer>
  );
};
