/**
 * Action Auth Drawer
 * Handles complete end-to-end authentication flow for pool actions
 * Guides users through auth and wallet connection based on the specific action context
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useNavigation, type Asset } from "@/contexts/NavigationContext";
import { ChevronLeft, WalletIcon, ArrowRight } from "lucide-react";
import { Button } from "../../ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "../../ui/drawer";
import { AuthStepContent } from "../auth/AuthStepContent";
import { useAuthSteps } from "@/hooks/auth/useAuthSteps";
import { isPasskeySupported } from "@/utils/environment";

type ActionStep = "auth" | "wallet" | "complete";

type ActionType = "deposit" | "withdraw" | "my-notes";

interface ActionAuthDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionType;
  asset: Asset;
}

export function ActionAuthDrawer({ open, onOpenChange, action, asset }: ActionAuthDrawerProps) {
  const [currentActionStep, setCurrentActionStep] = useState<ActionStep>("auth");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const shouldShowPasskey = isPasskeySupported();
  
  const { isAuthenticated } = useAuth();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { navigateToScreen } = useNavigation();

  // Use shared auth steps logic
  const authSteps = useAuthSteps({
    onAuthComplete: () => {
      // When auth completes, check if wallet is needed
      if (action === "deposit" && !isConnected) {
        setCurrentActionStep("wallet");
      } else {
        setCurrentActionStep("complete");
      }
    }
  });

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setCurrentActionStep("auth");
      authSteps.resetState();
    }
  }, [open, authSteps]);

  // Auto-progress when authentication or wallet requirements are met
  useEffect(() => {
    if (!open) return;

    if (isAuthenticated && currentActionStep === "auth") {
      // Auth complete, check if wallet is needed
      if (action === "deposit" && !isConnected) {
        setCurrentActionStep("wallet");
      } else {
        setCurrentActionStep("complete");
      }
    } else if (action === "deposit" && isAuthenticated && isConnected && currentActionStep === "wallet") {
      // Wallet connected during wallet step, move to complete
      setCurrentActionStep("complete");
    }

    if (currentActionStep === "complete") {
      // All steps complete, navigate to target screen
      onOpenChange(false);
      navigateToScreen(getTargetScreen(action), asset);
    }
  }, [open, isAuthenticated, isConnected, currentActionStep, action, asset, navigateToScreen, onOpenChange]);

  const getTargetScreen = (actionType: ActionType): "deposit" | "withdraw" | "my-notes" => {
    return actionType;
  };

  const canGoBack = () => {
    if (currentActionStep === "wallet") return true;
    return currentActionStep === "auth" && authSteps.canGoBack();
  };

  const handleBack = () => {
    if (currentActionStep === "wallet") {
      setCurrentActionStep("auth");
    } else if (currentActionStep === "auth") {
      authSteps.handleBack();
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

  const getActionTitle = () => {
    switch (action) {
      case "deposit": return `Deposit ${asset.symbol}`;
      case "withdraw": return `Withdraw ${asset.symbol}`;
      case "my-notes": return "My Notes";
      default: return "Get Started";
    }
  };

  const getTitle = () => {
    if (currentActionStep === "wallet") {
      return "Connect Wallet";
    }
    
    // For auth step, use context-aware titles
    switch (authSteps.currentStep) {
      case "choose": return getActionTitle();
      case "login-method": return "Login";
      case "login-convenient": return shouldShowPasskey ? "Passkey" : "Password";
      case "login-backup": return "Recovery";
      case "create-keys": return "Generate Keys";
      case "create-backup": return "Backup Phrase";
      case "setup-convenient": return shouldShowPasskey ? "Setup Passkey" : "Setup Password";
      default: return getActionTitle();
    }
  };

  const getDescription = () => {
    if (currentActionStep === "wallet") {
      return "Connect your wallet to fund privacy pool deposits";
    }

    // For auth step, use context-aware descriptions
    switch (authSteps.currentStep) {
      case "choose":
        switch (action) {
          case "deposit": return "Sign in to access deposit functionality";
          case "withdraw": return "Sign in to access your privacy notes";
          case "my-notes": return "Sign in to view your transaction history";
          default: return "Sign in to continue";
        }
      case "login-method": return "Choose login method";
      case "login-convenient": return shouldShowPasskey ? "Use biometric auth" : "Enter account and password";
      case "login-backup": return "Enter recovery phrase";
      case "create-keys": return "Generate keys locally";
      case "create-backup": return "Save your recovery phrase";
      case "setup-convenient": return shouldShowPasskey ? "Setup biometric access" : "Create secure password";
      default: return "";
    }
  };

  const renderStepContent = () => {
    if (currentActionStep === "auth") {
      return (
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
      );
    }

    if (currentActionStep === "wallet") {
      return (
        <div className="space-y-2">
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
    }

    return null;
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