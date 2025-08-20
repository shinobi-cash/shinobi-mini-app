import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { AuthenticationGate } from './shared/AuthenticationGate'

import { User, History, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { CONTRACTS } from '@/config/contracts';
import { useDepositDiscovery } from '../hooks/useDepositDiscovery';

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
  const { mnemonic, privateKey } = useAuth();
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
  const noteDiscovery = useDepositDiscovery();

  // Generate real cash note data with deposit information
  const generateAllNotesWithData = () => {
    if (noteDiscovery.totalNotes === 0) return [];
    
    const notes = [];
    for (let noteIndex = 0; noteIndex < noteDiscovery.totalNotes; noteIndex++) {
      // Find matching note data for this note index
      const note = noteDiscovery.unspentNotes.find(
        n => n.noteIndex === noteIndex
      );
      
      const noteWithStatus = {
        noteIndex,
        hasDeposit: !!note,
        depositData: note || null,
      };
      
      notes.push(noteWithStatus);
    }
    
    return notes;
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
            <div className="flex items-center gap-2">
              <p className="text-sm text-app-secondary">Your private cash notes</p>
              {noteDiscovery.isDiscovering && (
                <RefreshCw className="w-3 h-3 text-app-secondary animate-spin" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={noteDiscovery.refreshNotes}
              disabled={noteDiscovery.isDiscovering}
              className="w-8 h-8 p-0 rounded-full"
            >
              <RefreshCw className={`w-4 h-4 ${noteDiscovery.isDiscovering ? 'animate-spin' : ''}`} />
            </Button>
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
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
            isExpanded={expandedPools.has('eth')}
            onToggle={() => togglePool('eth')}
            noteDiscovery={noteDiscovery}
            generateAllNotesWithData={generateAllNotesWithData}
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
  isExpanded: boolean;
  onToggle: () => void;
  noteDiscovery: any; // Type from useDepositDiscovery hook
  generateAllNotesWithData: () => Array<{ noteIndex: number; hasDeposit: boolean; depositData: any | null }>;
}

const PoolAccordion = ({ 
  poolName, 
  isExpanded, 
  onToggle, 
  noteDiscovery,
  generateAllNotesWithData
}: PoolAccordionProps) => {
  
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
            <p className="text-xs text-app-secondary">
              {(() => {
                const totalNotes = noteDiscovery.totalNotes;
                return totalNotes > 0 ? `${totalNotes} cash note${totalNotes > 1 ? 's' : ''}` : 'No notes';
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-app-secondary">
            {(() => {
              const totalNotes = noteDiscovery.totalNotes;
              return totalNotes > 0 ? 'Ready' : 'Empty';
            })()}
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
          {(() => {
            if (noteDiscovery.isDiscovering) {
              return (
                <div className="text-center py-6 text-app-secondary">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading your cash notes...</p>
                </div>
              );
            }
            
            const allNotes = generateAllNotesWithData();
            
            if (allNotes.length === 0) {
              return (
                <div className="text-center py-6 text-app-secondary">
                  <span className="text-2xl mb-2 block">💰</span>
                  <p className="text-xs">No cash notes created yet</p>
                  <p className="text-xs mt-1">Make a deposit to create your first cash note</p>
                </div>
              );
            }
            
            return (
              <div className="space-y-3">
                {allNotes.map((note) => (
                  <CashNoteCard 
                    key={note.noteIndex}
                    noteIndex={note.noteIndex}
                    amount={note.depositData?.amount || '0.00'}
                    isDeposited={note.hasDeposit}
                    transactionHash={note.depositData?.transactionHash}
                    timestamp={note.depositData?.timestamp}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

interface CashNoteCardProps {
  noteIndex: number;
  amount: string;
  isDeposited: boolean;
  transactionHash?: string;
  timestamp?: string;
}

const CashNoteCard = ({ noteIndex, amount, isDeposited, transactionHash, timestamp }: CashNoteCardProps) => {
  return (
    <div className="rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span className="text-xs font-medium text-green-700 dark:text-green-400">#{noteIndex + 1}</span>
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
        {isDeposited && timestamp ? (
          <div className="space-y-1">
            <p>✅ Deposited on {new Date(timestamp).toLocaleDateString()}</p>
            {transactionHash && (
              <p className="font-mono text-xs truncate">
                {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
              </p>
            )}
          </div>
        ) : (
          <p>💡 This note can be used once for private transactions</p>
        )}
      </div>
    </div>
  );
};