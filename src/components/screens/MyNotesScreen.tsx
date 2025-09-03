import { CONTRACTS } from "@/config/constants";
import { useBanner } from "@/contexts/BannerContext";
import { useNotes } from "@/hooks/useNoteDiscovery";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { useModalWithSelection } from "@/hooks/ui/useModalState";
import type { NoteChain } from "@/lib/storage/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NoteChainDetailDrawer } from "../features/profile/NoteChainDetailDrawer";
import { NotesSummaryCard } from "../features/profile/NotesSummaryCard";
import { NotesHistorySection } from "../features/profile/NotesHistorySection";
import { BackButton } from "../ui/back-button";
import { PoolDashboard } from "../features/pool/PoolDashboard";
import { useActivities } from "@/hooks/data/useActivities";
import { useNavigation } from "@/contexts/NavigationContext";

export const MyNotesScreen = () => {
  const { isAuthenticated, signOut } = useAuth();
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
  return <AuthenticatedNotes onSignOut={signOut} />;
};

const AuthenticatedNotes = ({ onSignOut }: { onSignOut: () => void }) => {
  const { publicKey, accountKey } = useAuth();

  // Only render the actual notes when auth values exist
  if (!publicKey || !accountKey) {
    return null;
  }

  return <NotesContent publicKey={publicKey} accountKey={accountKey} onSignOut={onSignOut} />;
};

const NotesContent = ({
  publicKey,
  accountKey,
  onSignOut,
}: {
  publicKey: string;
  accountKey: bigint;
  onSignOut: () => void;
}) => {
  const noteChainModal = useModalWithSelection<NoteChain>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const handleNoteChainClick = (noteChain: NoteChain) => {
    noteChainModal.openWith(noteChain);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refresh().finally(() => setIsRefreshing(false));
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton to="home" />
        <h1 className="text-lg font-semibold text-app-primary tracking-tight">My Notes</h1>
      </div>

      {/* Notes Overview */}
      <div className="space-y-4">
        <NotesSummaryCard
          unspentNotes={unspentNotes}
          totalNotes={noteChains.length}
          isRediscovering={isRefreshing}
          onRediscover={handleRefresh}
        />
      </div>

      {/* Notes History */}
      <div className="flex-1 flex flex-col min-h-0">
        <NotesHistorySection
          noteChains={noteChains}
          loading={loading}
          error={!!error}
          onNoteChainClick={handleNoteChainClick}
        />
      </div>

      {/* Note Chain Detail Drawer */}
      <NoteChainDetailDrawer
        noteChain={noteChainModal.selectedItem}
        open={noteChainModal.isOpen}
        onOpenChange={noteChainModal.setOpen}
      />
    </div>
  );
};

/**
 * Pool Dashboard for non-authenticated users
 * Shows the same Pool Dashboard as home screen
 */
const PoolDashboardForNonAuthenticated = () => {
  const { banner } = useBanner();
  const lastErrorRef = useRef<string | null>(null);

  const { activities, loading, error, fetchMore, hasNextPage, refetch, hasData } = useActivities({
    poolId: CONTRACTS.ETH_PRIVACY_POOL,
    limit: 10,
  });

  // Show banner error when we have data but error on refresh
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
