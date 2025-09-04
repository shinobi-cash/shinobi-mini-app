import { CONTRACTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useBanner } from "@/contexts/BannerContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useActivities } from "@/hooks/data/useActivities";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { useModalWithSelection } from "@/hooks/ui/useModalState";
import { useNotes } from "@/hooks/useNoteDiscovery";
import type { NoteChain, Note } from "@/lib/storage/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { PoolDashboard } from "../features/pool/PoolDashboard";
import { NoteChainDetailDrawer } from "../features/profile/NoteChainDetailDrawer";
import { NotesHistorySection } from "../features/profile/NotesHistorySection";
import { NotesSummaryCard } from "../features/profile/NotesSummaryCard";
import { WithdrawalForm } from "../features/withdrawal/WithdrawalForm";
import { BackButton } from "../ui/back-button";

export const MyNotesScreen = () => {
  const { isAuthenticated } = useAuth();
  const { setCurrentScreen } = useNavigation();

  // Redirect to home when user signs out (this handles the redirect automatically)
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentScreen("home");
    }
  }, [isAuthenticated, setCurrentScreen]);

  // Show Pool Dashboard for non-authenticated users (fallback while redirecting)
  if (!isAuthenticated) {
    return <PoolDashboardForNonAuthenticated />;
  }

  // Show authenticated notes for authenticated users
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
  const { banner } = useBanner();

  const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;

  // Use discovery with autoScan enabled for notes screen
  const {
    data: noteDiscovery,
    loading,
    error,
    progress,
    refresh,
  } = useNotes(publicKey, poolAddress, accountKey, { autoScan: true });

  // Track shown banners to prevent infinite loops
  const shownBannersRef = useRef({ scanning: false, error: false, lastProgressId: "", lastErrorId: "" });

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

  // Banner feedback for note discovery
  useEffect(() => {
    if (!progress) return;

    const progressId = `${progress.pagesProcessed}-${progress.complete}`;
    if (progressId === shownBannersRef.current.lastProgressId) return;

    if (progress.pagesProcessed === 1 && !shownBannersRef.current.scanning) {
      banner.info("Scanning blockchain for notes...");
      shownBannersRef.current.scanning = true;
    }

    if (progress.complete) {
      shownBannersRef.current.scanning = false;
      if (noteDiscovery && noteDiscovery.newNotesFound > 0) {
        banner.success(`Found ${noteDiscovery.newNotesFound} new notes`);
      }
    }

    shownBannersRef.current.lastProgressId = progressId;
  }, [progress, noteDiscovery, banner]);

  // Banner feedback for discovery errors
  useEffect(() => {
    const errorId = error ? error.message : "no-error";
    if (errorId === shownBannersRef.current.lastErrorId) return;

    if (error && !shownBannersRef.current.error) {
      banner.error("Note discovery failed");
      shownBannersRef.current.error = true;
    }

    if (!error) {
      shownBannersRef.current.error = false;
    }

    shownBannersRef.current.lastErrorId = errorId;
  }, [error, banner]);

  // TypeScript assertion: AuthenticationGate ensures these values exist
  if (!publicKey || !accountKey) {
    throw new Error("MyNotesScreen: Missing auth values despite AuthenticationGate");
  }

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

const PoolDashboardForNonAuthenticated = () => {
  const { banner } = useBanner();
  const lastErrorRef = useRef<string | null>(null);

  const { activities, loading, error, fetchMore, hasNextPage, refetch, hasData } = useActivities({
    poolId: CONTRACTS.ETH_PRIVACY_POOL,
    limit: 10,
  });

  useEffect(() => {
    const errorMessage = error?.message || null;
    if (errorMessage && hasData && errorMessage !== lastErrorRef.current) {
      banner.error("Failed to refresh activities", { duration: 5000 });
      lastErrorRef.current = errorMessage;
    } else if (!errorMessage) {
      lastErrorRef.current = null;
    }
  }, [error?.message, hasData, banner]);

  return (
    <PoolDashboard
      activities={activities || []}
      loading={loading}
      error={error && !hasData ? "Failed to load activities" : undefined}
      hasNextPage={hasNextPage}
      onFetchMore={async () => {
        await fetchMore?.();
      }}
      onRefresh={async () => {
        await refetch?.();
      }}
    />
  );
};
