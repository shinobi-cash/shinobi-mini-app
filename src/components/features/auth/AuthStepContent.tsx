import type { AuthStep } from "@/hooks/auth/useAuthSteps";
import type { KeyGenerationResult } from "@/utils/crypto";
import { isPasskeySupported } from "@/utils/environment";
import { Fingerprint, Lock } from "lucide-react";
import { Button } from "../../ui/button";
import { AccountLoginForm } from "./AccountLoginForm";
import AccountSetupForm from "./AccountSetupForm";
import { BackupMnemonicSection } from "./BackupMnemonicSection";
import { KeyGenerationSection } from "./KeyGenerationSection";
import { LoginWithBackupPhrase } from "./LoginWithBackupPhrase";
import { SyncingNotesSection } from "./SyncingNotesSection";

interface AuthStepContentProps {
  currentStep: AuthStep;
  generatedKeys: KeyGenerationResult | null;
  loginKey: KeyGenerationResult | null;
  onLoginChoice: () => void;
  onCreateChoice: () => void;
  onLoginMethodChoice: (method: "convenient" | "backup") => void;
  onKeyGenerationComplete: (keys: KeyGenerationResult) => void;
  onBackupComplete: () => void;
  onRecoveryComplete: (keys: KeyGenerationResult) => void;
  onAccountSetupComplete: () => void;
  onSyncingComplete: () => void;
}

export function AuthStepContent({
  currentStep,
  generatedKeys,
  loginKey,
  onLoginChoice,
  onCreateChoice,
  onLoginMethodChoice,
  onKeyGenerationComplete,
  onBackupComplete,
  onRecoveryComplete,
  onAccountSetupComplete,
  onSyncingComplete,
}: AuthStepContentProps) {
  const shouldShowPasskey = isPasskeySupported();

  switch (currentStep) {
    case "choose":
      return (
        <div className="space-y-2">
          <div className="flex gap-3">
            <Button
              variant="default"
              className="flex-1 h-12 text-base font-medium rounded-2xl"
              onClick={onLoginChoice}
              size="lg"
            >
              Log In
            </Button>

            <Button
              variant="outline"
              className="flex-1 h-12 text-base font-medium rounded-2xl border border-app"
              onClick={onCreateChoice}
              size="lg"
            >
              Create Account
            </Button>
          </div>
        </div>
      );

    case "login-method":
      return (
        <div className="space-y-2">
          <Button onClick={() => onLoginMethodChoice("convenient")} className="w-full" size="lg">
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

          <Button variant="outline" onClick={() => onLoginMethodChoice("backup")} className="w-full">
            Continue with Backup Phrase
          </Button>
        </div>
      );

    case "login-convenient":
      return <AccountLoginForm onSuccess={onAccountSetupComplete} />;

    case "login-backup":
      return <LoginWithBackupPhrase onRecoverAccountKey={onRecoveryComplete} />;

    case "create-keys":
      return <KeyGenerationSection onKeyGenerationComplete={onKeyGenerationComplete} />;

    case "create-backup":
      return <BackupMnemonicSection generatedKeys={generatedKeys} onBackupMnemonicComplete={onBackupComplete} />;

    case "setup-convenient":
      return (
        <AccountSetupForm generatedKeys={generatedKeys || loginKey} onAccountSetupComplete={onAccountSetupComplete} />
      );

    case "syncing-notes":
      return <SyncingNotesSection onSyncComplete={onSyncingComplete} />;

    default:
      return null;
  }
}
