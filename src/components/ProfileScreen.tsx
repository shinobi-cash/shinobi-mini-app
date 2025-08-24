import { useAuth } from '../contexts/AuthContext'
import { useMemo, useState } from 'react'
import { AuthenticationGate } from './shared/AuthenticationGate'

import { RefreshCw, UserX, X, ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription,
  DrawerClose 
} from './ui/drawer'
import { formatDate, formatEthAmount, formatTimestamp, formatHash } from '@/utils/formatters';
import { NETWORK } from '@/config/constants';
import { CONTRACTS } from '@/config/constants'
import { Note, NoteChain } from '@/lib/noteCache'
import { useNotes } from '@/hooks/useDepositDiscovery'

export const ProfileScreen = () => {
  const { signOut } = useAuth()

  return (
    <AuthenticationGate 
      title="Account Required"
      description="Create or load your account to access privacy features"
      context="profile"
    >
      <AuthenticatedProfile onSignOut={signOut} />
    </AuthenticationGate>
  )
}

const AuthenticatedProfile = ({ onSignOut }: { onSignOut: () => void }) => {
  const { publicKey, accountKey } = useAuth();
  const [selectedNoteChain, setSelectedNoteChain] = useState<NoteChain | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;

  // Use the refactored useNotes hook with 10 minute cache to prevent excessive refetching
  const { data: noteDiscovery, loading, error, refresh } = useNotes(publicKey!, poolAddress, accountKey!, 10 * 60 * 1000);

  // Memoize note chains, showing last note of each chain sorted by timestamp
  const noteChains = useMemo(() => {
    if (!noteDiscovery?.notes) return [];
    return noteDiscovery.notes
      .sort((a, b) => {
        // Sort by timestamp of last note (newest first)
        const lastNoteA = a[a.length - 1];
        const lastNoteB = b[b.length - 1];
        return Number(lastNoteB.timestamp) - Number(lastNoteA.timestamp);
      });
  }, [noteDiscovery]);



  const unspentNotes = noteChains.filter(noteChain => {
    const lastNote = noteChain[noteChain.length - 1];
    return lastNote.status === 'unspent';
  }).length;

  const handleNoteChainClick = (noteChain: NoteChain) => {
    setSelectedNoteChain(noteChain);
    setDrawerOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <section className="flex flex-col gap-2 flex-1">
        {/* Summary Card */}
        <div className="flex-shrink-0">
          <div className="bg-app-surface p-5 border-t border-b border-app shadow-md relative">
            {/* Sign Out Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              title="Sign out of account"
              className="absolute top-3 right-3 w-8 h-8 p-0 rounded-full text-app-tertiary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <UserX className="w-4 h-4" />
            </Button>
            
            <div className="text-center">
              <h3 className="text-base font-semibold text-app-secondary mb-2">Privacy Notes</h3>
              <p className="text-3xl font-bold text-app-primary tabular-nums mb-2">
                {unspentNotes}
              </p>
              <p className="text-base text-app-tertiary">
                available to withdraw
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          <div className="flex-shrink-0 bg-app-surface border-b border-app shadow-md">
            <div className="flex items-center justify-between py-3 px-4">
              <h2 className="text-lg font-semibold text-app-secondary tracking-tight flex-1 text-center">
                Transaction History
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={loading}
                className="h-8 w-8 p-0 text-app-secondary hover:text-app-primary"
                title="Refresh transaction history"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          {/* Scrollable History Table */}
          <div className="flex-1 flex flex-col bg-app-surface border-t border-b border-app shadow-md overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-app-secondary" />
                    <p className="text-app-secondary">Loading your transaction history...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-app-secondary mb-1">Failed to load history</p>
                    <p className="text-sm text-app-tertiary">Check your connection and try again</p>
                  </div>
                </div>
              ) : noteChains.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <span className="text-2xl mb-2 block">💰</span>
                    <p className="text-app-secondary mb-1">No transaction history yet</p>
                    <p className="text-sm text-app-tertiary">Make a deposit to create your first cash note</p>
                  </div>
                </div>
              ) : (
                <>
                  {noteChains.map((noteChain, index) => {
                    const lastNote = noteChain[noteChain.length - 1];
                    return (
                      <CashNoteCard 
                        key={`chain-${index}-${lastNote.depositIndex}-${lastNote.changeIndex}`}
                        note={lastNote}
                        chainLength={noteChain.length}
                        onClick={() => handleNoteChainClick(noteChain)}
                      />
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Note Chain Detail Drawer */}
      <NoteChainDetailDrawer
        noteChain={selectedNoteChain}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Empty State for no account keys */}
      {(!accountKey || !publicKey) && (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="text-lg font-medium text-app-primary mb-2">No Account Keys</h3>
          <p className="text-sm text-app-secondary">Create or import an account to generate cash notes</p>
        </div>
      )}

    </div>
  );
}


interface CashNoteCardProps {
  note: Note;
  chainLength?: number;
  onClick?: () => void;
}

const CashNoteCard = ({ note, chainLength, onClick }: CashNoteCardProps) => {
  // Show user-friendly labels based on chain progression
  const noteLabel = chainLength === 1 
    ? "Transaction Balance"  // Simple case: only one note in chain
    : note.changeIndex === 0 
      ? "Original Deposit" 
      : "Current Balance";
  
  const isSpent = note.status === 'spent';

  return (
    <button
      className="w-full bg-app-surface border-b border-app px-3 py-3 sm:px-4 sm:py-4 transition-all duration-150 hover:bg-app-surface-hover text-left group"
      onClick={onClick}
    >
      {/* Note Details */}
      <div className="flex-1 flex justify-between gap-2">
        {/* Left side: Type and amount */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-app-primary tracking-tight capitalize text-base sm:text-lg truncate">
            {noteLabel}
          </div>
          <div className="text-sm sm:text-base text-app-secondary font-medium tabular-nums">
            {formatEthAmount(note.amount)} ETH
          </div>
        </div>

        {/* Right side: Status and timestamp */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${
              isSpent 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              <div className={`w-1 h-1 rounded-full ${
                isSpent ? 'bg-red-500' : 'bg-green-500'
              }`} />
              {isSpent ? 'Spent' : 'Unspent'}
            </div>
            <div className="text-xs sm:text-sm text-app-tertiary font-medium whitespace-nowrap">
              {formatDate(note.timestamp)}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

// Note Chain Detail Drawer Component
interface NoteChainDetailDrawerProps {
  noteChain: NoteChain | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NoteChainDetailDrawer = ({ noteChain, open, onOpenChange }: NoteChainDetailDrawerProps) => {
  if (!noteChain) return null;

  const lastNote = noteChain[noteChain.length - 1];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-app-background border-app max-h-[85vh]">
        <DrawerHeader className="pb-0 px-4 py-1">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold text-app-primary tracking-tight">
              Transaction Timeline
            </DrawerTitle>
            <DrawerClose className="rounded-full h-7 w-7 flex items-center justify-center bg-app-surface hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-3.5 w-3.5 text-app-secondary" />
            </DrawerClose>
          </div>
          <DrawerDescription className="text-sm text-app-secondary">
            Money flow visualization for this transaction chain
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Current Status Summary */}
          <div className="bg-app-surface rounded-xl p-4 border border-app shadow-sm mb-6">
            <div className="text-center">
              <p className="text-sm font-medium text-app-secondary mb-1">Current Status</p>
              <p className="text-2xl font-bold text-app-primary tabular-nums mb-2">
                {formatEthAmount(lastNote.amount)} ETH
              </p>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                lastNote.status === 'spent' 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                <div className={`w-1 h-1 rounded-full ${
                  lastNote.status === 'spent' ? 'bg-red-500' : 'bg-green-500'
                }`} />
                {lastNote.status === 'spent' ? 'Fully Spent' : 'Available'}
              </div>
            </div>
          </div>

          {/* Activity Table */}
          <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-app">
              <h3 className="text-sm font-semibold text-app-primary">Transaction Details</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {noteChain.map((note, index) => {
                const isFirst = index === 0;
                const isLast = index === noteChain.length - 1;
                
                return (
                  <div key={`${note.depositIndex}-${note.changeIndex}`} className="bg-app-surface border-b border-app px-3 py-3 sm:px-4 sm:py-4 hover:bg-app-surface-hover transition-all duration-150">
                    <div className="flex items-center justify-between gap-2">
                      {/* Left side: Type and amount */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-app-primary tracking-tight text-base sm:text-lg truncate">
                          {isFirst ? 'Deposit' : isLast ? 'Current Balance' : 'Balance'}
                        </div>
                        <div className="text-sm sm:text-base text-app-secondary font-medium tabular-nums">
                          {formatEthAmount(note.amount)} ETH
                        </div>
                      </div>

                      {/* Right side: Status and timestamp */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-right">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${
                            note.status === 'spent' 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            <div className={`w-1 h-1 rounded-full ${
                              note.status === 'spent' ? 'bg-red-500' : 'bg-green-500'
                            }`} />
                            {note.status === 'spent' ? 'Spent' : 'Unspent'}
                          </div>
                          <div className="text-xs sm:text-sm text-app-tertiary font-medium whitespace-nowrap">
                            {formatTimestamp(note.timestamp)}
                          </div>
                          <a
                            href={`${NETWORK.EXPLORER_URL}/tx/${note.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-1"
                          >
                            {formatHash(note.transactionHash)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};