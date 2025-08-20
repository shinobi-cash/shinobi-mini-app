import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { LoadAccountDrawer } from '../LoadAccountDrawer';
import { CreateAccountDrawer } from '../CreateAccountDrawer';

interface AuthenticationActionsProps {
  context?: 'profile' | 'deposit' | 'withdraw';
}

export const AuthenticationActions = ({ context: _ }: AuthenticationActionsProps) => {
  const { setKeys } = useAuth();
  const [showLoadAccount, setShowLoadAccount] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  // Reuse the same logic from ProfileScreen
  function deriveKeysFromMnemonic(mnemonic: string[]): { publicKey: string, privateKey: string, address: string } {
    // For demo: join words, hash, and mock keys
    const seed = mnemonic.join('-');
    return {
      publicKey: 'pub_' + seed.slice(0, 16),
      privateKey: 'priv_' + seed.slice(0, 16),
      address: '0x' + seed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40)
    };
  }

  const handleLoad = (mnemonicWords: string[]) => {
    if (!mnemonicWords || mnemonicWords.length !== 12 || mnemonicWords.some(w => !w)) {
      setLoadError('Please enter all 12 words of your recovery phrase.');
      return;
    }
    setLoadError(undefined);
    const { publicKey, privateKey, address } = deriveKeysFromMnemonic(mnemonicWords);
    setKeys({ publicKey, privateKey, mnemonic: mnemonicWords, address });
    setShowLoadAccount(false);
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