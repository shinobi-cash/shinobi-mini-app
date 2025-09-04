/**
 * Unified Authentication Section
 * Handles environment detection and renders appropriate auth method
 * Routes to setup vs login components based on mode
 */

import { isPasskeySupported } from "@/utils/environment";
import { PasskeyLoginSection } from "./PasskeyLoginSection";
import { PasswordLoginSection } from "./PasswordLoginSection";

interface AuthSectionLoginProps {
  mode: "login";
  onSuccess: () => void;
}
type AuthSectionProps = AuthSectionLoginProps;

// Use centralized environment detection

export function AuthSection(props: AuthSectionProps) {
  // Determine which auth method to show based on environment
  const shouldShowPasskey = isPasskeySupported();

  // Login flow - only needs success callback
  const { onSuccess } = props;

  if (shouldShowPasskey) {
    return <PasskeyLoginSection onSuccess={onSuccess} />;
  }
  return <PasswordLoginSection onSuccess={onSuccess} />;
}
