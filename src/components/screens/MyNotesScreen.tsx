import { CONTRACTS } from "@/config/constants";
import { useBanner } from "@/contexts/BannerContext";
import { useNotes } from "@/hooks/useNoteDiscovery";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { useModalWithSelection } from "@/hooks/ui/useModalState";
import type { NoteChain } from "@/lib/storage/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NoteChainDetailDrawer } from "../features/profile/NoteChainDetailDrawer";
import { ProfileSummaryCard } from "../features/profile/ProfileSummaryCard";
import { NotesHistorySection } from "../features/profile/NotesHistorySection";
import { AuthenticationGate } from "../shared/AuthenticationGate";
import { BackButton } from "../ui/back-button";

export const MyNotesScreen = () => {
  const { signOut } = useAuth();

  return (
    <AuthenticationGate
      title="Account Required"
      description="Create or load your account to access privacy features"
      context="my-notes"
    >
      <AuthenticatedProfile onSignOut={signOut} />
    </AuthenticationGate>
  );
};

const AuthenticatedProfile = ({ onSignOut }: { onSignOut: () => void }) => {
  const { publicKey, accountKey } = useAuth();

  // Only render the actual profile when auth values exist
  if (!publicKey || !accountKey) {
    return null;
  }

  return <ProfileContent publicKey={publicKey} accountKey={accountKey} onSignOut={onSignOut} />;
};

const ProfileContent = ({
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

  // Use discovery with autoScan enabled for profile screen
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
    throw new Error("ProfileScreen: Missing auth values despite AuthenticationGate");
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
        <ProfileSummaryCard unspentNotes={unspentNotes} totalNotes={noteChains.length} onSignOut={onSignOut} />
      </div>

      {/* Notes History */}
      <div className="flex-1 flex flex-col min-h-0">
        <NotesHistorySection
          noteChains={noteChains}
          loading={loading}
          error={!!error}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
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
