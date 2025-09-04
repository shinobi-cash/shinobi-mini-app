import { CONTRACTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { useModalWithSelection } from "@/hooks/ui/useModalState";
import { useNotes } from "@/hooks/useNoteDiscovery";
import type { Note, NoteChain } from "@/lib/storage/types";
import { useEffect, useMemo, useState } from "react";
import { NoteChainDetailDrawer } from "../features/profile/NoteChainDetailDrawer";
import { NotesHistorySection } from "../features/profile/NotesHistorySection";
import { NotesSummaryCard } from "../features/profile/NotesSummaryCard";
import { WithdrawalForm } from "../features/withdrawal/WithdrawalForm";
import { BackButton } from "../ui/back-button";

export const MyNotesScreen = () => {
  const { isAuthenticated } = useAuth();
  const { setCurrentScreen } = useNavigation();

  // Redirect to home when user signs out
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentScreen("home");
    }
  }, [isAuthenticated, setCurrentScreen]);

  // Only render for authenticated users (redirect handles non-authenticated)
  if (!isAuthenticated) {
    return null;
  }

  return <AuthenticatedNotes />;
};

const AuthenticatedNotes = () => {
  const { publicKey, accountKey } = useAuth();

  // Only render the actual notes when auth values exist
  if (!publicKey || !accountKey) {
    return null;
  }

  return <NotesContent publicKey={publicKey} accountKey={accountKey} />;
};

const NotesContent = ({
  publicKey,
  accountKey,
}: {
  publicKey: string;
  accountKey: bigint;
}) => {
  const noteChainModal = useModalWithSelection<NoteChain>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [withdrawalNote, setWithdrawalNote] = useState<Note | null>(null);
  const [showingWithdrawalForm, setShowingWithdrawalForm] = useState(false);
  const { onTransactionIndexed } = useTransactionTracking();

  const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;

  // Use discovery with autoScan enabled for notes screen
  const {
    data: noteDiscovery,
    loading,
    error,
    progress,
    refresh,
  } = useNotes(publicKey, poolAddress, accountKey, { autoScan: true });

  // Memoize note chains, showing last note of each chain sorted by timestamp
  const noteChains = useMemo(() => {
    if (!noteDiscovery?.notes) return [];
    return noteDiscovery.notes.sort((a, b) => {
      // Sort by timestamp of last note (newest first)
      const lastNoteA = a[a.length - 1];
      const lastNoteB = b[b.length - 1];
      return Number(lastNoteB.timestamp) - Number(lastNoteA.timestamp);
    });
  }, [noteDiscovery]);

  // Auto-refresh when transaction gets indexed
  useEffect(() => {
    const cleanup = onTransactionIndexed(() => {
      refresh();
    });
    return cleanup;
  }, [onTransactionIndexed, refresh]);

  const unspentNotes = noteChains.filter((noteChain) => {
    const lastNote = noteChain[noteChain.length - 1];
    return lastNote.status === "unspent";
  }).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    refresh().finally(() => setIsRefreshing(false));
  };

  const startWithdrawal = (noteChain: NoteChain) => {
    const lastNote = noteChain[noteChain.length - 1];
    if (lastNote.status === "unspent") {
      setWithdrawalNote(lastNote);
      setShowingWithdrawalForm(true);
      noteChainModal.setOpen(false);
    }
  };

  const exitWithdrawal = () => {
    setShowingWithdrawalForm(false);
    setWithdrawalNote(null);
    refresh();
  };

  if (showingWithdrawalForm && withdrawalNote) {
    return (
      <div className="flex flex-col h-full gap-2 p-2">
        <div className="flex items-center gap-3">
          <BackButton onClick={exitWithdrawal} />
          <h1 className="text-lg font-semibold text-app-primary tracking-tight">Withdraw ETH</h1>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <WithdrawalForm
            asset={{ symbol: "ETH", name: "Ethereum", icon: "⚫" }}
            preSelectedNote={withdrawalNote}
            onTransactionSuccess={exitWithdrawal}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 p-2">
      <div className="flex items-center gap-3">
        <BackButton to="home" />
        <h1 className="text-lg font-semibold text-app-primary tracking-tight">My Notes</h1>
      </div>

      <div className="space-y-2">
        <NotesSummaryCard
          unspentNotes={unspentNotes}
          totalNotes={noteChains.length}
          isRediscovering={isRefreshing}
          onRediscover={handleRefresh}
          isScanning={!!progress && !progress.complete}
          scanProgress={progress || undefined}
          syncError={!!error}
          newNotesFound={noteDiscovery?.newNotesFound}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <NotesHistorySection
          noteChains={noteChains}
          loading={loading}
          error={!!error}
          onNoteChainClick={noteChainModal.openWith}
        />
      </div>

      <NoteChainDetailDrawer
        noteChain={noteChainModal.selectedItem}
        open={noteChainModal.isOpen}
        onOpenChange={noteChainModal.setOpen}
        onWithdrawClick={startWithdrawal}
      />
    </div>
  );
};
