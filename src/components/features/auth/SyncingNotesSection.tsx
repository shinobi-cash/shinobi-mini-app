import { CONTRACTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { NoteDiscoveryService } from "@/lib/services/NoteDiscoveryService";
import { StorageProviderAdapter } from "@/lib/services/adapters/StorageProviderAdapter";
import {
  ArrowRight,
  CheckCircle,
  Coins,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../ui/button";

interface SyncingNotesSectionProps {
  onSyncComplete: () => void;
  actionContext?: {
    type: "deposit" | "my-notes" | "general";
    onNavigateToAction?: () => void;
  };
}

export function SyncingNotesSection({
  onSyncComplete,
  actionContext,
}: SyncingNotesSectionProps) {
  const { publicKey, accountKey } = useAuth();

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Create discovery service only once
  const discoveryService = useMemo(() => {
    const storageProvider = new StorageProviderAdapter();
    return new NoteDiscoveryService(storageProvider);
  }, []);

  const startSync = useCallback(async () => {
    if (!publicKey || !accountKey) return;

    setStatus("loading");
    setError(null);

    // cancel previous run
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      await discoveryService.discoverNotes(
        publicKey,
        CONTRACTS.ETH_PRIVACY_POOL,
        accountKey,
        { signal: abortRef.current.signal }
      );
      setStatus("success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // intentional cancel (cleanup/retry)
      }
      console.error("Sync error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to sync notes"
      );
      setStatus("error");
    }
  }, [publicKey, accountKey, discoveryService]);

  // Run sync once when keys available
  useEffect(() => {
    if (publicKey && accountKey && status === "idle") {
      startSync();
    }
  }, [publicKey, accountKey, status, startSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const handleRetry = () => {
    setStatus("idle"); // will trigger startSync via effect
  };

  // ----- UI states -----

  if (status === "success") {
    const baseContent = (
      <>
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-app-primary mb-2">
            Welcome to Shinobi!
          </h3>
          <p className="text-sm text-app-secondary">
            Your account is ready to use
          </p>
        </div>
      </>
    );

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

    return (
      <div className="text-center space-y-4">
        {baseContent}
        <Button onClick={onSyncComplete} className="w-full" size="lg">
          Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <RefreshCw className="w-16 h-16 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-app-primary mb-2">
            Sync Failed
          </h3>
          <p className="text-sm text-app-secondary mb-4">{error}</p>
        </div>
        <Button onClick={handleRetry} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // default: loading
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <Loader2 className="w-16 h-16 text-app-primary animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-app-primary mb-2">
          Syncing Your Notes
        </h3>
        <p className="text-sm text-app-secondary mb-2">
          Discovering your privacy notes from the blockchain...
        </p>
        <p className="text-xs text-app-tertiary mb-4">
          This may take a few minutes
        </p>
      </div>
    </div>
  );
}
