import { CONTRACTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useBanner } from "@/contexts/BannerContext";
import { publicClient } from "@/lib/clients";
import { NoteDiscoveryService } from "@/lib/services/NoteDiscoveryService";
import { StorageProviderAdapter } from "@/lib/services/adapters/StorageProviderAdapter";
import { fetchLatestIndexedBlock } from "@/services/data/indexerService";
import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type TrackingStatus = "idle" | "pending" | "waiting" | "synced" | "failed";

interface TransactionInfo {
  hash: string;
  blockNumber: number | null;
}

interface TransactionTrackingContextType {
  trackTransaction: (txHash: string) => void;
  onTransactionIndexed: (callback: () => void) => () => void;
  trackingStatus: TrackingStatus;
  trackedTxHash: string | null;
}

const TransactionTrackingContext = createContext<TransactionTrackingContextType | null>(null);

export function useTransactionTracking() {
  const context = useContext(TransactionTrackingContext);
  if (!context) {
    throw new Error("useTransactionTracking must be used within TransactionTrackingProvider");
  }
  return context;
}

// Create note discovery service instance outside provider
const storageProvider = new StorageProviderAdapter();
const discoveryService = new NoteDiscoveryService(storageProvider);

export function TransactionTrackingProvider({ children }: { children: React.ReactNode }) {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");
  const [trackedTransaction, setTrackedTransaction] = useState<TransactionInfo | null>(null);
  const eventTargetRef = useRef(new EventTarget());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const { banner } = useBanner();
  const bannerShownRef = useRef<{ [key: string]: boolean }>({});
  const { publicKey, accountKey } = useAuth();

  const trackTransaction = useCallback(
    (txHash: string) => {
      // Clear any existing tracking
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Reset banner tracking
      bannerShownRef.current = {};

      const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
      banner.info(`${shortHash} • Confirming transaction...`);

      setTrackedTransaction({ hash: txHash, blockNumber: null });
      setTrackingStatus("pending");

      // Auto-clear tracking after 5 minutes
      timeoutRef.current = setTimeout(
        () => {
          setTrackedTransaction(null);
          setTrackingStatus("idle");
        },
        5 * 60 * 1000,
      );
    },
    [banner],
  );

  const onTransactionIndexed = useCallback((callback: () => void) => {
    const eventTarget = eventTargetRef.current;
    const handler = () => callback();

    eventTarget.addEventListener("indexed", handler);

    // Return cleanup function
    return () => {
      eventTarget.removeEventListener("indexed", handler);
    };
  }, []);

  // Wait for transaction receipt and check status
  useEffect(() => {
    if (!trackedTransaction?.hash || trackingStatus !== "pending") {
      return;
    }

    const waitForReceipt = async () => {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: trackedTransaction.hash as `0x${string}`,
          timeout: 60000, // 1 minute timeout
        });

        // Check if transaction was successful
        if (receipt.status === "success") {
          const shortHash = `${trackedTransaction.hash.slice(0, 6)}...${trackedTransaction.hash.slice(-4)}`;
          banner.success(`${shortHash} • Transaction successful! indexing...`, { confetti: true });
          setTrackedTransaction((prev) => (prev ? { ...prev, blockNumber: Number(receipt.blockNumber) } : null));
          setTrackingStatus("waiting");
        } else {
          // Transaction failed
          const shortHash = `${trackedTransaction.hash.slice(0, 6)}...${trackedTransaction.hash.slice(-4)}`;
          banner.error(`${shortHash} • Transaction failed`);
          setTrackingStatus("failed");
          // Clear tracking on failure
          setTimeout(() => {
            setTrackedTransaction(null);
            setTrackingStatus("idle");
          }, 5000);
        }
      } catch (error) {
        console.error("Failed to wait for transaction receipt:", error);
        const shortHash = `${trackedTransaction.hash.slice(0, 6)}...${trackedTransaction.hash.slice(-4)}`;
        banner.error(`${shortHash} • Transaction timeout`);
        setTrackingStatus("failed");
        setTimeout(() => {
          setTrackedTransaction(null);
          setTrackingStatus("idle");
        }, 5000);
      }
    };

    waitForReceipt();
  }, [trackedTransaction?.hash, trackingStatus]);

  // Check if transaction is indexed
  useEffect(() => {
    if (!trackedTransaction?.hash || trackingStatus !== "waiting" || trackedTransaction.blockNumber === null) {
      return;
    }

    const checkTransactionIndexed = async () => {
      try {
        const indexedBlockInfo = await fetchLatestIndexedBlock();
        if (
          indexedBlockInfo &&
          trackedTransaction.blockNumber !== null &&
          Number.parseInt(indexedBlockInfo.blockNumber) >= trackedTransaction.blockNumber
        ) {
          banner.success("Transaction indexed!");
          setTrackingStatus("synced");

          // Sync notes globally when transaction is indexed
          if (publicKey && accountKey) {
            console.log("Auto-syncing notes after transaction indexed...");
            discoveryService
              .discoverNotes(publicKey, CONTRACTS.ETH_PRIVACY_POOL, accountKey)
              .then(() => console.log("Auto-sync notes completed"))
              .catch((err) => console.warn("Auto-sync notes failed:", err));
          } else {
            console.warn("Cannot auto-sync: missing publicKey or accountKey");
          }

          // Emit the indexed event
          eventTargetRef.current.dispatchEvent(new CustomEvent("indexed"));

          // Clear after 10 seconds
          timeoutRef.current = setTimeout(() => {
            setTrackedTransaction(null);
            setTrackingStatus("idle");
          }, 10000);
        }
      } catch (error) {
        console.error("Failed to check transaction status:", error);
      }
    };

    // Check immediately, then every 5 seconds
    checkTransactionIndexed();
    intervalRef.current = setInterval(checkTransactionIndexed, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trackedTransaction?.hash, trackingStatus, trackedTransaction?.blockNumber, publicKey, accountKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const contextValue = {
    trackTransaction,
    onTransactionIndexed,
    trackingStatus,
    trackedTxHash: trackedTransaction?.hash || null,
  };

  return <TransactionTrackingContext.Provider value={contextValue}>{children}</TransactionTrackingContext.Provider>;
}
