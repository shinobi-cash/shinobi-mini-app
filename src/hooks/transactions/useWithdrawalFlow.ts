import { useAuth } from "@/contexts/AuthContext";
import { useBanner } from "@/contexts/BannerContext";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import type { Note } from "@/lib/storage/types";
import {
  type PreparedWithdrawal,
  type WithdrawalRequest,
  executePreparedWithdrawal,
  processWithdrawal,
  validateWithdrawalRequest,
} from "@/services/privacy/withdrawalService";
import { useCallback, useState } from "react";

export interface UseWithdrawalFlowProps {
  note: Note;
}

export function useWithdrawalFlow({ note }: UseWithdrawalFlowProps) {
  const { banner } = useBanner();
  const { accountKey } = useAuth();
  const { trackTransaction } = useTransactionTracking();

  // States for withdrawal flow
  const [showPreview, setShowPreview] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [preparedWithdrawal, setPreparedWithdrawal] = useState<PreparedWithdrawal | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Handle withdrawal preparation
  const handlePreviewWithdrawal = useCallback(
    async (withdrawAmount: string, recipientAddress: string) => {
      try {
        setIsPreparing(true);
        setPreparationError(null);

        // Create withdrawal request
        const withdrawalRequest: WithdrawalRequest = {
          note,
          withdrawAmount,
          recipientAddress,
          accountKey: accountKey!,
        };

        // Validate the request first
        validateWithdrawalRequest(withdrawalRequest);

        // Prepare the withdrawal using our service
        const prepared = await processWithdrawal(withdrawalRequest);

        // Set both states together to avoid race condition
        setPreparedWithdrawal(prepared);
        setShowPreview(true);
        setIsPreparing(false);
      } catch (error) {
        setIsPreparing(false);
        setPreparationError(error instanceof Error ? error.message : "Failed to prepare withdrawal");
        banner.error("Failed to prepare withdrawal");
      }
    },
    [note, accountKey, banner],
  );

  // Execute the withdrawal transaction
  const handleExecuteTransaction = useCallback(async () => {
    if (!preparedWithdrawal) {
      banner.error("No prepared withdrawal found");
      return;
    }

    try {
      setIsExecuting(true);

      const transactionHash = await executePreparedWithdrawal(preparedWithdrawal);

      // Track transaction for indexing status (replaces banner)
      trackTransaction(transactionHash);

      setShowPreview(false);
      setIsExecuting(false);
    } catch (error) {
      setIsExecuting(false);
      banner.error("Failed to execute withdrawal");
    }
  }, [preparedWithdrawal, banner, trackTransaction]);

  // Close preview drawer
  const closePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  // Reset withdrawal states when form values change
  const resetStates = useCallback(() => {
    setPreparedWithdrawal(null);
    setPreparationError(null);
    setShowPreview(false);
  }, []);

  // TypeScript assertion: This hook is used in auth-gated components
  if (!accountKey) {
    throw new Error("useWithdrawalFlow: Missing accountKey despite AuthenticationGate");
  }

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
