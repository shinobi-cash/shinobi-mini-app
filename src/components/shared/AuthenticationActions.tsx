import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { LoadAccountDrawer } from '../LoadAccountDrawer';
import { CreateAccountDrawer } from '../CreateAccountDrawer';
import { restoreFromMnemonic, validateMnemonic } from '../../utils/crypto';

interface AuthenticationActionsProps {
  context?: 'profile' | 'deposit' | 'withdraw';
}

export const AuthenticationActions = ({ context: _ }: AuthenticationActionsProps) => {
  const { setKeys } = useAuth();
  const [showLoadAccount, setShowLoadAccount] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const handleLoad = (mnemonicWords: string[]) => {
    if (!mnemonicWords || mnemonicWords.length !== 12 || mnemonicWords.some(w => !w)) {
      setLoadError('Please enter all 12 words of your recovery phrase.');
      return;
    }

    // Validate mnemonic using proper crypto validation
    if (!validateMnemonic(mnemonicWords)) {
      setLoadError('Invalid recovery phrase. Please check your words and try again.');
      return;
    }

    try {
      setLoadError(undefined);
      const { publicKey, privateKey, address } = restoreFromMnemonic(mnemonicWords);
      setKeys({ publicKey, privateKey, mnemonic: mnemonicWords, address });
      setShowLoadAccount(false);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load account. Please try again.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <Button
        variant="default"
        className="w-full h-12 text-base font-medium rounded-2xl"
        onClick={(e) => {
          // Blur the button to remove focus before opening drawer
          e.currentTarget.blur();
          setShowCreateAccount(true);
        }}
        size="lg"
      >
        Create Account
      </Button>
      
      <Button
        variant="outline"
        className="w-full h-12 text-base font-medium rounded-2xl border border-app"
        onClick={(e) => {
          // Blur the button to remove focus before opening drawer
          e.currentTarget.blur();
          setShowLoadAccount(true);
        }}
        size="lg"
      >
        Load Account
      </Button>
      
      <LoadAccountDrawer 
        onLoad={handleLoad} 
        error={loadError}
        open={showLoadAccount}
        onOpenChange={setShowLoadAccount}
      />

      <CreateAccountDrawer 
        open={showCreateAccount}
        onOpenChange={setShowCreateAccount}
      />
    </div>
  );
};