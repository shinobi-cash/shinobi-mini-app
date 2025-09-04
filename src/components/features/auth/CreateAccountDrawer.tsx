import { isPasskeySupported } from "@/utils/environment";
import { ResponsiveModal } from "../../ui/responsive-modal";
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
      showBackButton={canGoBack()}
      onBack={handleBack}
      className="bg-app-background border-app"
    >
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
    </ResponsiveModal>
  );
};
