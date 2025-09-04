import { CONTRACTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { publicClient } from "@/lib/clients";
import { NoteDiscoveryService } from "@/lib/services/NoteDiscoveryService";
import { StorageProviderAdapter } from "@/lib/services/adapters/StorageProviderAdapter";
import { showToast } from "@/lib/toast";
import { fetchLatestIndexedBlock } from "@/services/data/indexerService";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type TrackingStatus =
  | "idle"
  | "pending"
  | "waiting"
  | "synced"
  | "failed";

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

const TransactionTrackingContext =
  createContext<TransactionTrackingContextType | null>(null);

export function useTransactionTracking() {
  const context = useContext(TransactionTrackingContext);
  if (!context) {
    throw new Error(
      "useTransactionTracking must be used within TransactionTrackingProvider",
    );
  }
  return context;
}

// Create note discovery service instance outside provider
const storageProvider = new StorageProviderAdapter();
const discoveryService = new NoteDiscoveryService(storageProvider);

export function TransactionTrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [trackingStatus, setTrackingStatus] =
    useState<TrackingStatus>("idle");
  const [trackedTransaction, setTrackedTransaction] =
    useState<TransactionInfo | null>(null);
  const eventTargetRef = useRef(new EventTarget());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { publicKey, accountKey } = useAuth();

  /**
   * Clears tracking immediately and cancels timers
   */
  const clearTracking = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTrackedTransaction(null);
    setTrackingStatus("idle");
  }, []);

  /**
   * Starts auto-clear timer (default 5 minutes)
   */
  const scheduleAutoClear = useCallback(
    (ms: number = 5 * 60 * 1000) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        clearTracking();
      }, ms);
    },
    [clearTracking],
  );

  /**
   * Track a new transaction
   */
  const trackTransaction = useCallback(
    (txHash: string) => {
      clearTracking();

      const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
      showToast.success(`${shortHash} • Confirming transaction...`, {
        duration: 3000,
      });

      setTrackedTransaction({ hash: txHash, blockNumber: null });
      setTrackingStatus("pending");

      // Auto-clear if it gets stuck for >5 min
      scheduleAutoClear();
    },
    [clearTracking, scheduleAutoClear],
  );

  /**
   * Register a callback when transaction gets indexed
   */
  const onTransactionIndexed = useCallback((callback: () => void) => {
    const eventTarget = eventTargetRef.current;
    const handler = () => callback();
    eventTarget.addEventListener("indexed", handler);
    return () => {
      eventTarget.removeEventListener("indexed", handler);
    };
  }, []);

  /**
   * Wait for transaction receipt
   */
  useEffect(() => {
    if (!trackedTransaction?.hash || trackingStatus !== "pending") return;

    const waitForReceipt = async () => {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: trackedTransaction.hash as `0x${string}`,
          timeout: 60000, // 1 minute
        });

        const shortHash = `${trackedTransaction.hash.slice(0, 6)}...${trackedTransaction.hash.slice(-4)}`;

        if (receipt.status === "success") {
          showToast.success(
            `${shortHash} • Transaction successful! Indexing...`,
            { duration: 4000 },
          );
          setTrackedTransaction((prev) =>
            prev
              ? { ...prev, blockNumber: Number(receipt.blockNumber) }
              : null,
          );
          setTrackingStatus("waiting");
        } else {
          showToast.error(`${shortHash} • Transaction failed`, {
            duration: 5000,
          });
          setTrackingStatus("failed");
          scheduleAutoClear(5000);
        }
      } catch (error) {
        console.error("Failed to wait for transaction receipt:", error);
        const shortHash = `${trackedTransaction.hash.slice(0, 6)}...${trackedTransaction.hash.slice(-4)}`;
        showToast.error(`${shortHash} • Transaction timeout`, {
          duration: 5000,
        });
        setTrackingStatus("failed");
        scheduleAutoClear(5000);
      }
    };

    waitForReceipt();
  }, [trackedTransaction?.hash, trackingStatus, scheduleAutoClear]);

  /**
   * Poll until transaction is indexed
   */
  useEffect(() => {
    if (
      !trackedTransaction?.hash ||
      trackingStatus !== "waiting" ||
      trackedTransaction.blockNumber === null
    ) {
      return;
    }

    const checkTransactionIndexed = async () => {
      try {
        const indexedBlockInfo = await fetchLatestIndexedBlock();
        if (
          indexedBlockInfo &&
          trackedTransaction.blockNumber !== null &&
          Number.parseInt(indexedBlockInfo.blockNumber) >=
            trackedTransaction.blockNumber
        ) {
          showToast.success("Transaction indexed!", { duration: 3000 });
          setTrackingStatus("synced");

          if (publicKey && accountKey) {
            discoveryService
              .discoverNotes(
                publicKey,
                CONTRACTS.ETH_PRIVACY_POOL,
                accountKey,
              )
              .catch((err) =>
                console.warn("Auto-sync notes failed:", err),
              );
          }

          eventTargetRef.current.dispatchEvent(
            new CustomEvent("indexed"),
          );

          // Auto-clear after 10s
          scheduleAutoClear(10000);
        }
      } catch (error) {
        console.error("Failed to check transaction status:", error);
      }
    };

    checkTransactionIndexed();
    intervalRef.current = setInterval(checkTransactionIndexed, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    trackedTransaction?.hash,
    trackedTransaction?.blockNumber,
    trackingStatus,
    publicKey,
    accountKey,
    scheduleAutoClear,
  ]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clearTracking();
    };
  }, [clearTracking]);

  const contextValue = {
    trackTransaction,
    onTransactionIndexed,
    trackingStatus,
    trackedTxHash: trackedTransaction?.hash || null,
  };

  return (
    <TransactionTrackingContext.Provider value={contextValue}>
      {children}
    </TransactionTrackingContext.Provider>
  );
}
