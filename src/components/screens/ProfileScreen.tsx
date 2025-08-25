import { useAuth } from '../../contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { AuthenticationGate } from '../shared/AuthenticationGate'
import { NoteChain } from "@/lib/storage/noteCache"
import { useNotes } from '@/hooks/data/useDepositDiscovery'
import { useTransactionTracking } from '@/hooks/transactions/useTransactionTracking'
import { useModalWithSelection } from '@/hooks/ui/useModalState'
import { CONTRACTS } from '@/config/constants'
import { ProfileSummaryCard } from '../features/profile/ProfileSummaryCard'
import { TransactionHistorySection } from '../features/profile/TransactionHistorySection'
import { NoteChainDetailDrawer } from '../features/profile/NoteChainDetailDrawer'

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
  const noteChainModal = useModalWithSelection<NoteChain>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { onTransactionIndexed } = useTransactionTracking();

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

  // Auto-refresh when transaction gets indexed
  useEffect(() => {
    const cleanup = onTransactionIndexed(() => {
      refresh()
    })
    return cleanup
  }, [onTransactionIndexed, refresh])

  const unspentNotes = noteChains.filter(noteChain => {
    const lastNote = noteChain[noteChain.length - 1];
    return lastNote.status === 'unspent';
  }).length;

  const handleNoteChainClick = (noteChain: NoteChain) => {
    noteChainModal.openWith(noteChain);
  };

  const handleRefresh = () => {
    setIsRefreshing(true)
    refresh().finally(() => setIsRefreshing(false))
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Summary Card */}
      <ProfileSummaryCard 
        unspentNotes={unspentNotes}
        totalNotes={noteChains.length}
        onSignOut={onSignOut}
      />

      {/* Transaction History */}
      <TransactionHistorySection 
        noteChains={noteChains}
        loading={loading}
        error={!!error}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onNoteChainClick={handleNoteChainClick}
      />

      {/* Note Chain Detail Drawer */}
      <NoteChainDetailDrawer
        noteChain={noteChainModal.selectedItem}
        open={noteChainModal.isOpen}
        onOpenChange={noteChainModal.setOpen}
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