import { fetchLatestIndexedBlock } from "@/services/data/indexerService";
import { publicClient } from "@/lib/clients";
import { useBanner } from "@/contexts/BannerContext";
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

export function TransactionTrackingProvider({ children }: { children: React.ReactNode }) {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");
  const [trackedTransaction, setTrackedTransaction] = useState<TransactionInfo | null>(null);
  const eventTargetRef = useRef(new EventTarget());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const { banner } = useBanner();
  const bannerShownRef = useRef<{ [key: string]: boolean }>({});

  const trackTransaction = useCallback((txHash: string) => {
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
  }, [banner]);

  const onTransactionIndexed = useCallback((callback: () => void) => {
    const eventTarget = eventTargetRef.current;
    const handler = () => callback();

    eventTarget.addEventListener("indexed", handler);

    // Return cleanup function
    return () => {
      eventTarget.removeEventListener("indexed", handler);
    };
  }, []);

  // Fetch transaction receipt and check status
  useEffect(() => {
    if (!trackedTransaction?.hash || trackingStatus !== "pending") {
      return;
    }

    const fetchTransactionReceipt = async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: trackedTransaction.hash as `0x${string}`,
        });

        if (receipt) {
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
        } else {
          // Receipt not available yet, retry in 3 seconds
          timeoutRef.current = setTimeout(fetchTransactionReceipt, 3000);
        }
      } catch (error) {
        console.error("Failed to fetch transaction receipt:", error);
        // Retry after error in 5 seconds
        timeoutRef.current = setTimeout(fetchTransactionReceipt, 5000);
      }
    };

    const timeoutId = setTimeout(fetchTransactionReceipt, 1000);
    return () => clearTimeout(timeoutId);
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
  }, [trackedTransaction?.hash, trackingStatus, trackedTransaction?.blockNumber]);

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
