import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { useSetupStore } from '../stores/setupStore'
import { AuthenticationGate } from './shared/AuthenticationGate'

import { User, History } from 'lucide-react'
import { Button } from './ui/button'
import { poseidon2 } from 'poseidon-lite';
import BigNumber from 'bignumber.js';
import { SNARK_SCALAR_FIELD } from '@/config/snark';

export const ProfileScreen = () => {
  const { signOut } = useAuth()

  return (
    <AuthenticationGate 
      title="Welcome to Shinobi"
      description="Choose how you want to get started:"
      context="profile"
    >
      <AuthenticatedProfile onSignOut={signOut} />
    </AuthenticationGate>
  )
}


const AuthenticatedProfile = ({ onSignOut }: { onSignOut: () => void }) => {
  const { mnemonic, privateKey } = useSetupStore();
  const [pairs, setPairs] = useState<{ nullifier: string, secret: string }[]>([]);

  function deriveFieldElement(seed: string, index: number): string {
    const input = [
      BigNumber(seed).plus(index).toFixed(),
      '0'
    ];
    const hash = poseidon2(input);
    return new BigNumber(hash.toString()).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
  }

  // Generate nullifiers/secrets on mount or when keys change
  useEffect(() => {
    const seed = privateKey || (mnemonic ? mnemonic.join('') : '');
    if (!seed) return;
    const generated: { nullifier: string, secret: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const nullifier = deriveFieldElement(seed, i);
      const secret = deriveFieldElement(seed, i + 1000);
      generated.push({ nullifier, secret });
    }
    setPairs(generated);
  }, [mnemonic, privateKey]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 py-10">
      <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
        <User className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-center text-app-primary font-sans mb-2">Welcome, User!</h2>
      <div className="w-full max-w-xs flex flex-col gap-4">
        <Button
          onClick={() => {/* TODO: Show history modal/screen */}}
          variant="outline"
          className="w-full h-12 rounded-2xl text-base font-medium flex items-center gap-2"
          size="lg"
        >
          <History className="w-5 h-5" />
          View Transaction History
        </Button>
        <Button
          onClick={onSignOut}
          variant="destructive"
          className="w-full h-12 rounded-2xl text-base font-medium"
          size="lg"
        >
          Sign Out
        </Button>
      </div>
      <div className="w-full max-w-md mt-8 px-2 sm:px-0">
        <h3 className="text-lg font-bold mb-4 text-center">Your Deterministic Nullifiers &amp; Secrets</h3>
        <div className="flex flex-col gap-4">
          {pairs.map((pair, idx) => (
            <div key={idx} className="rounded-xl p-4  flex flex-col">
              <div className="font-semibold text-blue-700 dark:text-blue-300 mb-2 text-base">Pair {idx + 1}</div>
              <div className="text-xs break-all mb-1"><span className="font-bold">Nullifier:</span> {pair.nullifier}</div>
              <div className="text-xs break-all"><span className="font-bold">Secret:</span> {pair.secret}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-sm text-gray-500 text-center">
          These values are SNARK-compatible and can be regenerated from your key.<br />
          Backup your mnemonic/private key securely.
        </div>
      </div>
    </div>
  );
}