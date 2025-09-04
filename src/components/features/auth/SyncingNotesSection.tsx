/**
 * Syncing Notes Section
 * Displays progress while syncing user's privacy notes after authentication
 * Shows progress bar and status messages during note discovery process
 */

import { CONTRACTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { NoteDiscoveryService } from "@/lib/services/NoteDiscoveryService";
import { StorageProviderAdapter } from "@/lib/services/adapters/StorageProviderAdapter";
import { CheckCircle, Loader2, RefreshCw, ArrowRight, FileText, Coins } from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { Button } from "../../ui/button";

interface SyncingNotesSectionProps {
  onSyncComplete: () => void;
  // Optional context for better completion UX
  actionContext?: {
    type: "deposit" | "my-notes" | "general";
    onNavigateToAction?: () => void;
  };
}

interface SyncProgress {
  pagesProcessed: number;
  depositsChecked: number;
  depositsMatched: number;
  complete: boolean;
  error?: string;
}

export function SyncingNotesSection({ onSyncComplete, actionContext }: SyncingNotesSectionProps) {
  const { publicKey, accountKey } = useAuth();
  const [progress, setProgress] = useState<SyncProgress>({
    pagesProcessed: 0,
    depositsChecked: 0,
    depositsMatched: 0,
    complete: false,
  });
  const [isRunning, setIsRunning] = useState(false);

  // Create services only once to prevent infinite loops
  const discoveryService = useMemo(() => {
    const storageProvider = new StorageProviderAdapter();
    return new NoteDiscoveryService(storageProvider);
  }, []);

  const startSync = useCallback(async () => {
    if (!publicKey || !accountKey) return;
    if (isRunning || progress.complete) return; // Prevent multiple runs

    setIsRunning(true);
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
      setIsRunning(false);

    } catch (error) {
      console.error("Failed to sync notes:", error);
      setIsRunning(false);
      setProgress(prev => ({ 
        ...prev, 
        complete: false,
        error: error instanceof Error ? error.message : "Failed to sync notes"
      }));
      // Error is already shown in the UI inline
    }
  }, [publicKey, accountKey, discoveryService, isRunning, progress.complete]);

  // Start syncing on mount
  useEffect(() => {
    startSync();
  }, [startSync]);

  const handleRetry = () => {
    setIsRunning(false); // Reset running state 
    setProgress(prev => ({ ...prev, error: undefined, complete: false })); // Clear error
    startSync();
  };

  const handleSkip = () => {
    onSyncComplete();
  };

  if (progress.complete) {
    const getCompletionContent = () => {
      const baseContent = (
        <>
          <div className="flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-app-primary mb-2">Welcome to Shinobi!</h3>
            <p className="text-sm text-app-secondary">
              {progress.depositsMatched > 0 
                ? `Found ${progress.depositsMatched} privacy notes` 
                : "Your account is ready to use"}
            </p>
          </div>
        </>
      );

      // Context-aware completion options
      if (actionContext?.type === "deposit") {
        return (
          <div className="text-center space-y-4">
            {baseContent}
            <div className="space-y-2">
              <Button 
                onClick={actionContext.onNavigateToAction || onSyncComplete} 
                className="w-full" 
                size="lg"
              >
                <Coins className="w-4 h-4 mr-2" />
                Go to Deposit
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                onClick={onSyncComplete} 
                className="w-full"
              >
                Get Started
              </Button>
            </div>
          </div>
        );
      }

      if (actionContext?.type === "my-notes") {
        return (
          <div className="text-center space-y-4">
            {baseContent}
            <div className="space-y-2">
              <Button 
                onClick={actionContext.onNavigateToAction || onSyncComplete} 
                className="w-full" 
                size="lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                View My Notes
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                onClick={onSyncComplete} 
                className="w-full"
              >
                Get Started
              </Button>
            </div>
          </div>
        );
      }

      // Default: general account creation/login
      return (
        <div className="text-center space-y-4">
          {baseContent}
          <div className="space-y-2">
            <Button onClick={onSyncComplete} className="w-full" size="lg">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      );
    };

    return getCompletionContent();
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