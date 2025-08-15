import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { useSetupStore } from '../stores/setupStore'
import { AuthenticationGate } from './shared/AuthenticationGate'

import { User, History, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { poseidon2 } from 'poseidon-lite';
import BigNumber from 'bignumber.js';
import { SNARK_SCALAR_FIELD } from '@/config/snark';
import { CONTRACTS } from '@/config/contracts';
import { keccak256, toBytes } from 'viem';
import { restoreFromMnemonic } from '@/utils/crypto';

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
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());

  /**
   * Derive nullifier using Option C approach: hash-based domain separation
   */
  function deriveNullifier(accountKey: string, poolAddress: string, index: number): string {
    const nullifierSeed = createDomainSeed(accountKey, "nullifier");
    return deriveFieldElement(nullifierSeed, poolAddress, index);
  }

  /**
   * Derive secret using Option C approach: hash-based domain separation
   */
  function deriveSecret(accountKey: string, poolAddress: string, index: number): string {
    const secretSeed = createDomainSeed(accountKey, "secret");
    return deriveFieldElement(secretSeed, poolAddress, index);
  }

  /**
   * Create domain-separated seed by hashing accountKey + domain
   */
  function createDomainSeed(accountKey: string, domain: string): string {
    const combined = accountKey + domain;
    const hash = keccak256(toBytes(combined));
    const hashBigNumber = new BigNumber(hash);
    return hashBigNumber.mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
  }

  /**
   * Derive a field element from seed, pool address, and index
   */
  function deriveFieldElement(seed: string, poolAddress: string, index: number): string {
    const combined = poolAddress + index.toString();
    const hash = keccak256(toBytes(combined));
    const combinedValue = new BigNumber(hash).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();

    const poseidonHash = poseidon2([seed, combinedValue]);
    return new BigNumber(poseidonHash.toString()).mod(new BigNumber(SNARK_SCALAR_FIELD)).toFixed();
  }

  // Get the actual private key, either directly or derived from mnemonic
  const getAccountKey = (): string | null => {
    if (privateKey) {
      return privateKey;
    } else if (mnemonic) {
      try {
        const restoredKeys = restoreFromMnemonic(mnemonic);
        return restoredKeys.privateKey;
      } catch (error) {
        console.error('Failed to restore private key from mnemonic:', error);
        return null;
      }
    }
    return null;
  };

  // Generate single note for ETH pool
  const generateNote = (accountKey: string) => {
    if (!accountKey) return null;
    
    try {
      const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;
      const index = 0; // Single note for now
      
      const nullifier = deriveNullifier(accountKey, poolAddress, index);
      const secret = deriveSecret(accountKey, poolAddress, index);
      
      return { nullifier, secret };
    } catch (error) {
      console.error('Error generating note:', error);
      return null;
    }
  };

  const togglePool = (poolId: string) => {
    const newExpanded = new Set(expandedPools);
    if (newExpanded.has(poolId)) {
      newExpanded.delete(poolId);
    } else {
      newExpanded.add(poolId);
    }
    setExpandedPools(newExpanded);
  };

  return (
    <div className="h-full flex flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-app-primary">Wallet</h1>
            <p className="text-sm text-app-secondary">Your private cash notes</p>
          </div>
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Pools Section */}
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-app-primary">Privacy Pools</h2>
          <p className="text-sm text-app-secondary">Your available cash notes by pool</p>
        </div>
        
        {/* Pool Accordion */}
        <div className="space-y-3">
          <PoolAccordion
            poolId="eth"
            poolName="ETH Pool"
            poolAddress={CONTRACTS.ETH_PRIVACY_POOL}
            accountKey={getAccountKey() || ''}
            isExpanded={expandedPools.has('eth')}
            onToggle={() => togglePool('eth')}
            generateNote={generateNote}
          />
        </div>

        {/* Empty State */}
        {!privateKey && !mnemonic && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-lg font-medium text-app-primary mb-2">No Account Keys</h3>
            <p className="text-sm text-app-secondary">Create or import an account to generate cash notes</p>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="space-y-3 mt-6">
        <Button
          onClick={() => {/* TODO: Show history modal/screen */}}
          variant="outline"
          className="w-full h-12 rounded-2xl text-base font-medium flex items-center gap-2"
          size="lg"
        >
          <History className="w-5 h-5" />
          Transaction History
        </Button>
        <Button
          onClick={onSignOut}
          variant="outline"
          className="w-full h-12 rounded-2xl text-base font-medium text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/20"
          size="lg"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}

interface PoolAccordionProps {
  poolId: string;
  poolName: string;
  poolAddress: string;
  accountKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  generateNote: (accountKey: string) => { nullifier: string; secret: string } | null;
}

const PoolAccordion = ({ 
  poolName, 
  accountKey, 
  isExpanded, 
  onToggle, 
  generateNote 
}: PoolAccordionProps) => {
  const note = accountKey ? generateNote(accountKey) : null;
  
  return (
    <div className="bg-app-card rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Pool Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <span className="text-lg">⚫</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-app-primary">{poolName}</p>
            <p className="text-xs text-app-secondary">{note ? '1 cash note' : 'No notes'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-app-secondary">
            {note ? 'Ready' : 'Empty'}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-app-secondary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-app-secondary" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
          {note ? (
            <CashNoteCard 
              nullifier={note.nullifier}
              secret={note.secret}
              amount="0.01" // Placeholder
              isDeposited={false} // Placeholder
            />
          ) : (
            <div className="text-center py-6 text-app-secondary">
              <span className="text-2xl mb-2 block">💰</span>
              <p className="text-xs">No cash notes available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CashNoteCardProps {
  nullifier: string;
  secret: string;
  amount: string;
  isDeposited: boolean;
}

const CashNoteCard = ({ amount, isDeposited }: CashNoteCardProps) => {
  return (
    <div className="rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span className="text-xs font-medium text-green-700 dark:text-green-400">#1</span>
          </div>
          <span className="text-sm font-medium text-app-primary">Cash Note</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-app-primary">{amount} ETH</p>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isDeposited 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            <div className={`w-1 h-1 rounded-full ${
              isDeposited ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            {isDeposited ? 'Deposited' : 'Unused'}
          </div>
        </div>
      </div>
      <div className="text-xs text-app-secondary">
        <p>💡 This note can be used once for private transactions</p>
      </div>
    </div>
  );
};