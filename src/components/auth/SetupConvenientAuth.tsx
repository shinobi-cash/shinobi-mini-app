import { KeyGenerationResult } from '@/utils/crypto';
import { noteCache } from '@/lib/noteCache';
import { useState } from 'react'
import { Input } from '../ui/input';
import { AuthSection } from './AuthSection';


export default function SetupConvenientAuth({
  generatedKeys,
  onSetupConvenientAuthComplete
}: {
  generatedKeys: KeyGenerationResult | null,
  onSetupConvenientAuthComplete: () => void
}) {

  // Account setup state (moved to convenient auth step)
  const [accountName, setAccountName] = useState('')
  const [accountNameError, setAccountNameError] = useState('')
  

  // Account name validation (used in convenient auth step)
  const validateAccountName = async (name: string): Promise<string | null> => {
    if (!name.trim()) {
      return 'Account name is required';
    }
    if (name.length < 2) {
      return 'Account name must be at least 2 characters';
    }
    if (name.length > 30) {
      return 'Account name must be less than 30 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return 'Account name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    // Check if account already exists
    const exists = await noteCache.accountExists(name.trim());
    if (exists) {
      return 'An account with this name already exists';
    }
    return null;
  };
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
      <Input
        id="account-name"
        type="text"
        value={accountName}
        onChange={async (e) => {
          setAccountName(e.target.value);
          if (accountNameError) setAccountNameError('');
          if (e.target.value.trim()) {
            const error = await validateAccountName(e.target.value);
            setAccountNameError(error || '');
          }
        }}
        placeholder="Account Name"
        maxLength={30}
        autoComplete="off"
        aria-invalid={!!accountNameError}
        className="mt-3 mb-2"
      />
      {accountNameError && (
        <p className="text-red-600 text-xs mb-2">{accountNameError}</p>
      )}

      <AuthSection
        mode="setup"
        accountName={accountName}
        accountNameError={accountNameError}
        generatedKeys={generatedKeys}
        onSuccess={onSetupConvenientAuthComplete}
      />
    </div>
  );
}