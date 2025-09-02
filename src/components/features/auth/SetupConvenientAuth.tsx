/**
 * Setup Convenient Authentication
 * Environment-aware authentication setup router
 * Renders PasskeySetupForm or PasswordSetupForm based on device capabilities
 */

import type { KeyGenerationResult } from "@/utils/crypto";
import { isPasskeySupported } from "@/utils/environment";
import { PasskeySetupForm } from "./PasskeySetupForm";
import { PasswordSetupForm } from "./PasswordSetupForm";

export default function SetupConvenientAuth({
  generatedKeys,
  onSetupConvenientAuthComplete,
}: {
  generatedKeys: KeyGenerationResult | null;
  onSetupConvenientAuthComplete: () => void;
}) {
  const shouldShowPasskey = isPasskeySupported();

  if (shouldShowPasskey) {
    return <PasskeySetupForm generatedKeys={generatedKeys} onSuccess={onSetupConvenientAuthComplete} />;
  }

  return <PasswordSetupForm generatedKeys={generatedKeys} onSuccess={onSetupConvenientAuthComplete} />;
}
