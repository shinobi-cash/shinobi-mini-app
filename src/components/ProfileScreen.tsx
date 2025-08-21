import { useAuth } from '../contexts/AuthContext'
import { useState, useMemo } from 'react'
import { AuthenticationGate } from './shared/AuthenticationGate'

import { User, History, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { formatDate } from '@/utils/formatters';
import { CONTRACTS } from '@/config/constants'
import { Note } from '@/lib/noteCache'
import { useNotes } from '@/hooks/useDepositDiscovery'

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
  const { publicKey, accountKey } = useAuth();
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());

  const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;

  // Use the refactored useNotes hook
  const { data: noteDiscovery, loading, error } = useNotes(publicKey!, poolAddress, accountKey!);

  // Memoize the flattened list of all notes for rendering
  const allNotes = useMemo(() => {
    if (!noteDiscovery?.notes) return [];
    return noteDiscovery.notes.flat().sort((a, b) => {
      if (a.depositIndex === b.depositIndex) {
        return a.changeIndex - b.changeIndex;
      }
      return a.depositIndex - b.depositIndex;
    });
  }, [noteDiscovery]);

  const togglePool = (poolId: string) => {
    const newExpanded = new Set(expandedPools);
    if (newExpanded.has(poolId)) {
      newExpanded.delete(poolId);
    } else {
      newExpanded.add(poolId);
    }
    setExpandedPools(newExpanded);
  };

  const handleRefresh = () => {
    // A simple way to trigger a re-render and re-fetch, as useNotes doesn't expose a refresh method.
    // In a more complex app, the hook could return a refresh function.
    window.location.reload(); 
  }

  return (
    <div className="h-full flex flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-app-primary">Wallet</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-app-secondary">Your private cash notes</p>
              {loading && (
                <RefreshCw className="w-3 h-3 text-app-secondary animate-spin" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="w-8 h-8 p-0 rounded-full"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
            isExpanded={expandedPools.has('eth')}
            onToggle={() => togglePool('eth')}
            notes={allNotes}
            loading={loading}
            error={error}
          />
        </div>

        {/* Empty State */}
        {(!accountKey || !publicKey) && (
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
  isExpanded: boolean;
  onToggle: () => void;
  notes: Note[];
  loading: boolean;
  error: Error | null;
}

const PoolAccordion = ({ 
  poolName, 
  isExpanded, 
  onToggle, 
  notes,
  loading,
}: PoolAccordionProps) => {
  const totalNotes = notes.length;
  
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
              {totalNotes > 0 ? `${totalNotes} cash note${totalNotes > 1 ? 's' : ''}` : 'No notes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-app-secondary">
            {totalNotes > 0 ? 'Ready' : 'Empty'}
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
          {loading ? (
            <div className="text-center py-6 text-app-secondary">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading your cash notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-6 text-app-secondary">
              <span className="text-2xl mb-2 block">💰</span>
              <p className="text-xs">No cash notes created yet</p>
              <p className="text-xs mt-1">Make a deposit to create your first cash note</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <CashNoteCard 
                  key={`${note.depositIndex}-${note.changeIndex}`}
                  note={note}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CashNoteCardProps {
  note: Note;
}

const CashNoteCard = ({ note }: CashNoteCardProps) => {
  const noteLabel = note.changeIndex === 0
    ? `Deposit Note #${note.depositIndex}`
    : `Change Note #${note.depositIndex}.${note.changeIndex}`;
  
  const isSpent = note.status === 'spent';

  return (
    <div className="rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              {note.changeIndex === 0 ? 'D' : 'C'}
            </span>
          </div>
          <span className="text-sm font-medium text-app-primary">{noteLabel}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-app-primary">{note.amount} ETH</p>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isSpent 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}>
            <div className={`w-1 h-1 rounded-full ${
              isSpent ? 'bg-red-500' : 'bg-green-500'
            }`} />
            {isSpent ? 'Spent' : 'Unspent'}
          </div>
        </div>
      </div>
      <div className="text-xs text-app-secondary">
        {note.transactionHash ? (
          <div className="space-y-1">
            <p>✅ Created on {formatDate(note.timestamp)}</p>
            {note.transactionHash && (
              <p className="font-mono text-xs truncate">
                {note.transactionHash.slice(0, 10)}...{note.transactionHash.slice(-8)}
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