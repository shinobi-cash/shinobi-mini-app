/**
 * Syncing Notes Section
 * Displays progress while syncing user's privacy notes after authentication
 * Shows progress bar and status messages during note discovery process
 */

import { CONTRACTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useBanner } from "@/contexts/BannerContext";
import { NoteDiscoveryService } from "@/lib/services/NoteDiscoveryService";
import { StorageProviderAdapter } from "@/lib/services/adapters/StorageProviderAdapter";
import { CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../../ui/button";

interface SyncingNotesSectionProps {
  onSyncComplete: () => void;
}

interface SyncProgress {
  pagesProcessed: number;
  depositsChecked: number;
  depositsMatched: number;
  complete: boolean;
  error?: string;
}

export function SyncingNotesSection({ onSyncComplete }: SyncingNotesSectionProps) {
  const { publicKey, accountKey } = useAuth();
  const { banner } = useBanner();
  const [progress, setProgress] = useState<SyncProgress>({
    pagesProcessed: 0,
    depositsChecked: 0,
    depositsMatched: 0,
    complete: false,
  });

  const storageProvider = new StorageProviderAdapter();
  const discoveryService = new NoteDiscoveryService(storageProvider);

  const startSync = useCallback(async () => {
    if (!publicKey || !accountKey) return;

    setProgress({
      pagesProcessed: 0,
      depositsChecked: 0,
      depositsMatched: 0,
      complete: false,
    });

    try {
      await discoveryService.discoverNotes(publicKey, CONTRACTS.ETH_PRIVACY_POOL, accountKey, {
        onProgress: (discoveryProgress) => {
          setProgress({
            pagesProcessed: discoveryProgress.pagesProcessed,
            depositsChecked: discoveryProgress.depositsChecked,
            depositsMatched: discoveryProgress.depositsMatched,
            complete: discoveryProgress.complete,
          });
        },
      });

      setProgress(prev => ({ ...prev, complete: true }));
      
      // Wait a moment to show completion before proceeding
      setTimeout(() => {
        banner.success("Notes synced successfully");
        onSyncComplete();
      }, 1000);

    } catch (error) {
      console.error("Failed to sync notes:", error);
      setProgress(prev => ({ 
        ...prev, 
        complete: false,
        error: error instanceof Error ? error.message : "Failed to sync notes"
      }));
      banner.error("Failed to sync notes");
    }
  }, [publicKey, accountKey, discoveryService, onSyncComplete, banner]);

  // Start syncing on mount
  useEffect(() => {
    startSync();
  }, [startSync]);

  const handleRetry = () => {
    startSync();
  };

  const handleSkip = () => {
    banner.info("Skipped note syncing");
    onSyncComplete();
  };

  if (progress.complete) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-app-primary mb-2">Sync Complete!</h3>
          <p className="text-sm text-app-secondary">
            Found {progress.depositsMatched} privacy notes
          </p>
        </div>
      </div>
    );
  }

  if (progress.error) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <RefreshCw className="w-16 h-16 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-app-primary mb-2">Sync Failed</h3>
          <p className="text-sm text-app-secondary mb-4">{progress.error}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex-1"
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleRetry}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <Loader2 className="w-16 h-16 text-app-primary animate-spin" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-app-primary mb-2">Syncing Your Notes</h3>
        <p className="text-sm text-app-secondary mb-2">
          Discovering your privacy notes from the blockchain...
        </p>
        <p className="text-xs text-app-tertiary mb-4">
          This may take a few minutes
        </p>
      </div>

      {/* Progress Stats */}
      <div className="bg-app-surface rounded-xl p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-app-secondary">Pages processed</span>
          <span className="text-app-primary font-medium">{progress.pagesProcessed}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-app-secondary">Deposits checked</span>
          <span className="text-app-primary font-medium">{progress.depositsChecked}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-app-secondary">Notes found</span>
          <span className="text-green-600 font-medium">{progress.depositsMatched}</span>
        </div>
      </div>

      {/* Skip option for impatient users */}
      <Button
        variant="ghost"
        onClick={handleSkip}
        className="text-app-tertiary hover:text-app-secondary"
        size="sm"
      >
        Skip syncing for now
      </Button>
    </div>
  );
}