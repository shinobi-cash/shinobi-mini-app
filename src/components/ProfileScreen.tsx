import { useAuth } from '../contexts/AuthContext'
import { useMemo } from 'react'
import { AuthenticationGate } from './shared/AuthenticationGate'

import { RefreshCw, UserX } from 'lucide-react'
import { Button } from './ui/button'
import { formatDate, formatEthAmount } from '@/utils/formatters';
import { CONTRACTS } from '@/config/constants'
import { Note } from '@/lib/noteCache'
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

  const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;

  // Use the refactored useNotes hook
  const { data: noteDiscovery, loading, error } = useNotes(publicKey!, poolAddress, accountKey!);

  // Memoize the flattened list of all notes for rendering, filtering out zero amount notes
  const allNotes = useMemo(() => {
    if (!noteDiscovery?.notes) return [];
    return noteDiscovery.notes.flat()
      .filter(note => Number(note.amount) > 0) // Filter out zero amount notes
      .sort((a, b) => {
        // Sort by timestamp descending (newest first)
        return Number(b.timestamp) - Number(a.timestamp);
      });
  }, [noteDiscovery]);



  const unspentNotes = allNotes.filter(note => note.status === 'unspent').length;

  return (
    <div className="h-full flex flex-col">
      <section className="flex flex-col gap-4 flex-1">
        {/* Summary Card */}
        <div className="px-2 pt-2 sm:px-4 sm:pt-4 flex-shrink-0">
          <div className="bg-app-surface rounded-2xl p-5 border border-app shadow-md relative">
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
          <div className="sticky top-0 z-10 bg-app-surface rounded-t-xl border-b border-app shadow-md">
            <h2 className="text-lg font-semibold py-3 text-app-secondary tracking-tight text-center">
              Transaction History
            </h2>
          </div>
          {/* Scrollable History Table */}
          <div className="bg-app-surface border border-app shadow-md overflow-hidden">
            <div className="overflow-y-auto max-h-[60vh]">
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
              ) : allNotes.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <span className="text-2xl mb-2 block">💰</span>
                    <p className="text-app-secondary mb-1">No transaction history yet</p>
                    <p className="text-sm text-app-tertiary">Make a deposit to create your first cash note</p>
                  </div>
                </div>
              ) : (
                <>
                  {allNotes.map((note) => (
                    <CashNoteCard 
                      key={`${note.depositIndex}-${note.changeIndex}`}
                      note={note}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

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
}

const CashNoteCard = ({ note }: CashNoteCardProps) => {
  const noteLabel = note.changeIndex === 0
    ? `Deposit #${note.depositIndex}`
    : `Change #${note.depositIndex}.${note.changeIndex}`;
  
  const isSpent = note.status === 'spent';

  return (
    <div className="bg-app-surface border-b border-app px-3 py-3 sm:px-4 sm:py-4 transition-all duration-150 hover:bg-app-surface-hover">
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
    </div>
  );
};