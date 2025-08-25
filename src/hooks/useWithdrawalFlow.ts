import { useState, useCallback } from 'react';
import { useBanner } from '@/contexts/BannerContext';
import { useTransactionTracking } from '@/hooks/useTransactionTracking';
import { useAuth } from '@/contexts/AuthContext';
import {
  executePreparedWithdrawal,
  validateWithdrawalRequest,
  processWithdrawal,
  type WithdrawalRequest,
  type PreparedWithdrawal,
} from '@/services/withdrawalService';
import { Note } from '@/lib/noteCache';

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
  const handlePreviewWithdrawal = useCallback(async (
    withdrawAmount: string,
    recipientAddress: string
  ) => {
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
      console.log('🚀 Preparing withdrawal...');
      const prepared = await processWithdrawal(withdrawalRequest);
      
      // Set both states together to avoid race condition
      setPreparedWithdrawal(prepared);
      setShowPreview(true);
      setIsPreparing(false);
      
      console.log('✅ Withdrawal prepared successfully');
      console.log('📋 Setting showPreview to true, prepared data:', !!prepared);
      
    } catch (error) {
      console.error('❌ Failed to prepare withdrawal:', error);
      setIsPreparing(false);
      setPreparationError(error instanceof Error ? error.message : 'Failed to prepare withdrawal');
      banner.error('Failed to prepare withdrawal');
    }
  }, [note, accountKey, banner]);

  // Execute the withdrawal transaction
  const handleExecuteTransaction = useCallback(async () => {
    if (!preparedWithdrawal) {
      banner.error('No prepared withdrawal found');
      return;
    }

    try {
      setIsExecuting(true);
      
      console.log('🚀 Executing withdrawal transaction...');
      const transactionHash = await executePreparedWithdrawal(preparedWithdrawal);
      
      console.log('✅ Withdrawal executed successfully:', transactionHash);
      
      // Track transaction for indexing status (replaces banner)
      trackTransaction(transactionHash);
      
      setShowPreview(false);
      setIsExecuting(false);
      
    } catch (error) {
      console.error('❌ Failed to execute withdrawal:', error);
      setIsExecuting(false);
      banner.error('Failed to execute withdrawal');
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
    resetStates
  };
}