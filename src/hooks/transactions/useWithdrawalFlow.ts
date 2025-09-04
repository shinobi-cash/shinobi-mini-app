import { useAuth } from "@/contexts/AuthContext";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import type { Note } from "@/lib/storage/types";
import { showToast } from "@/lib/toast";
import {
  type PreparedWithdrawal,
  type WithdrawalRequest,
  executePreparedWithdrawal,
  processWithdrawal,
  validateWithdrawalRequest,
} from "@/services/privacy/withdrawalService";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseWithdrawalFlowProps {
  note: Note;
  onTransactionSuccess?: () => void;
}

export function useWithdrawalFlow({ note, onTransactionSuccess }: UseWithdrawalFlowProps) {
  const { accountKey } = useAuth();
  const { trackTransaction } = useTransactionTracking();

  // Safety: ensure hook used only when accountKey available
  if (!accountKey) {
    throw new Error("useWithdrawalFlow: Missing accountKey despite AuthenticationGate");
  }

  // Mounted guard to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // States for withdrawal flow
  const [showPreview, setShowPreview] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [preparedWithdrawal, setPreparedWithdrawal] = useState<PreparedWithdrawal | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Prepare withdrawal (preview)
  const handlePreviewWithdrawal = useCallback(
    async (withdrawAmount: string, recipientAddress: string) => {
      setIsPreparing(true);
      setPreparationError(null);

      try {
        const withdrawalRequest: WithdrawalRequest = {
          note,
          withdrawAmount,
          recipientAddress,
          accountKey,
        };

        // Validate request (may throw)
        validateWithdrawalRequest(withdrawalRequest);

        // Prepare via service
        const prepared = await processWithdrawal(withdrawalRequest);

        // Only update state if still mounted
        if (!mountedRef.current) return;
        setPreparedWithdrawal(prepared);
        setShowPreview(true);
      } catch (err) {
        if (mountedRef.current) {
          setPreparationError(err instanceof Error ? err.message : "Failed to prepare withdrawal");
          showToast.error("Failed to prepare withdrawal", { duration: 5000 });
        }
      } finally {
        if (mountedRef.current) setIsPreparing(false);
      }
    },
    [note, accountKey],
  );

  // Execute the prepared withdrawal
  const handleExecuteTransaction = useCallback(async () => {
    if (!preparedWithdrawal) {
      showToast.error("No prepared withdrawal found", { duration: 4000 });
      return;
    }

    if (!mountedRef.current) return;
    setIsExecuting(true);

    try {
      const transactionHash = await executePreparedWithdrawal(preparedWithdrawal);

      if (!mountedRef.current) return;

      // Track for indexing
      trackTransaction(transactionHash);

      // Close preview and call callback if still mounted
      setShowPreview(false);
      onTransactionSuccess?.();
    } catch (err) {
      if (mountedRef.current) {
        showToast.error("Failed to execute withdrawal", { duration: 5000 });
      }
    } finally {
      if (mountedRef.current) setIsExecuting(false);
    }
  }, [preparedWithdrawal, trackTransaction, onTransactionSuccess]);

  const closePreview = useCallback(() => {
    if (!mountedRef.current) return;
    setShowPreview(false);
  }, []);

  const resetStates = useCallback(() => {
    if (!mountedRef.current) return;
    setPreparedWithdrawal(null);
    setPreparationError(null);
    setShowPreview(false);
  }, []);

  // Reset internal states if the note changes
  useEffect(() => {
    resetStates();
  }, [note, resetStates]);

  return {
    // States
    showPreview,
    isPreparing,
    preparationError,
    preparedWithdrawal,
    isExecuting,

    // Actions
    handlePreviewWithdrawal,
    handleExecuteTransaction,
    closePreview,
    resetStates,
  };
}
