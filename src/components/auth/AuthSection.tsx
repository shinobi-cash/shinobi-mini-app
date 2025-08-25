/**
 * Unified Authentication Section
 * Handles environment detection and renders appropriate auth method
 * Routes to setup vs login components based on mode
 */

import { KeyGenerationResult } from '@/utils/crypto';
import { PasskeySetupSection } from './PasskeySetupSection';
import { PasskeyLoginSection } from './PasskeyLoginSection';
import { PasswordSetupSection } from './PasswordSetupSection';
import { PasswordLoginSection } from './PasswordLoginSection';
import { isPasskeySupported } from '@/utils/environment';

interface AuthSectionSetupProps {
  mode: 'setup';
  accountName: string;
  accountNameError?: string;
  generatedKeys: KeyGenerationResult | null;
  onSuccess: () => void;
}

interface AuthSectionLoginProps {
  mode: 'login';
  onSuccess: () => void;
}

type AuthSectionProps = AuthSectionSetupProps | AuthSectionLoginProps;

// Use centralized environment detection

export function AuthSection(props: AuthSectionProps) {
  // Determine which auth method to show based on environment
  const shouldShowPasskey = isPasskeySupported();

  if (props.mode === 'setup') {
    // Setup flow - requires account name and generated keys
    const { accountName, accountNameError, generatedKeys, onSuccess } = props;
    
    if (shouldShowPasskey) {
      return (
        <PasskeySetupSection
          accountName={accountName}
          accountNameError={accountNameError}
          generatedKeys={generatedKeys}
          onSuccess={onSuccess}
        />
      );
    } else {
      return (
        <PasswordSetupSection
          accountName={accountName}
          accountNameError={accountNameError}
          generatedKeys={generatedKeys}
          onSuccess={onSuccess}
        />
      );
    }
  } else {
    // Login flow - only needs success callback
    const { onSuccess } = props;
    
    if (shouldShowPasskey) {
      return (
        <PasskeyLoginSection
          onSuccess={onSuccess}
        />
      );
    } else {
      return (
        <PasswordLoginSection
          onSuccess={onSuccess}
        />
      );
    }
  }
}