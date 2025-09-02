import type { KeyGenerationResult } from "@/utils/crypto";
import { isPasskeySupported } from "@/utils/environment";
import { ChevronLeft, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../../ui/drawer";
import { BackupMnemonicSection } from "./BackupMnemonicSection";
import { KeyGenerationSection } from "./KeyGenerationSection";
import SetupConvenientAuth from "./SetupConvenientAuth";

type CreateAccountStep = "KeyGeneration" | "BackupMnemonic" | "SetupConvenientAuth";

interface CreateAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAccountDrawer = ({ open, onOpenChange }: CreateAccountDrawerProps) => {
  const [currentStep, setCurrentStep] = useState<CreateAccountStep>("KeyGeneration");
  const [generatedKeys, setGeneratedKeys] = useState<KeyGenerationResult | null>(null);
  const shouldShowPasskey = isPasskeySupported();

  const onKeyGenerationComplete = (keys: KeyGenerationResult) => {
    setGeneratedKeys(keys);
    setCurrentStep("BackupMnemonic");
  };

  const onBackupMnemonicComplete = () => {
    setCurrentStep("SetupConvenientAuth");
  };

  const onSetupConvenientAuthComplete = () => {
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setCurrentStep("KeyGeneration");
    setGeneratedKeys(null);
  };

  const handleBack = () => {
    switch (currentStep) {
      case "BackupMnemonic":
        setCurrentStep("KeyGeneration");
        break;
      case "SetupConvenientAuth":
        setCurrentStep("BackupMnemonic");
        break;
      default:
        setCurrentStep("KeyGeneration");
    }
  };

  const canGoBack = currentStep !== "KeyGeneration";

  const renderContent = () => {
    switch (currentStep) {
      case "KeyGeneration":
        return <KeyGenerationSection onKeyGenerationComplete={onKeyGenerationComplete} />;
      case "BackupMnemonic":
        return (
          <BackupMnemonicSection generatedKeys={generatedKeys} onBackupMnemonicComplete={onBackupMnemonicComplete} />
        );
      case "SetupConvenientAuth":
        return (
          <SetupConvenientAuth
            generatedKeys={generatedKeys}
            onSetupConvenientAuthComplete={onSetupConvenientAuthComplete}
          />
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (currentStep) {
      case "KeyGeneration":
        return "Generate Keys";
      case "BackupMnemonic":
        return "Backup Phrase";
      case "SetupConvenientAuth":
        return shouldShowPasskey ? "Setup Passkey" : "Setup Password";
      default:
        return "Create Account";
    }
  };

  const getDescription = () => {
    switch (currentStep) {
      case "KeyGeneration":
        return "Generate keys locally";
      case "BackupMnemonic":
        return "Save your recovery phrase";
      case "SetupConvenientAuth":
        return shouldShowPasskey ? "Setup biometric access" : "Create secure password";
      default:
        return "Create new account";
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
          <div className="p-2">{renderContent()}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
