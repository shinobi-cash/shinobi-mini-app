import { CONTRACTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useWithdrawal } from "@/hooks/withdrawal/useWithdrawal";
import type { Note } from "@/lib/storage/types";
import { calculateWithdrawalAmounts } from "@/services/privacy/withdrawalService";
import { formatEthAmount } from "@/utils/formatters";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useNoteSelection, useWithdrawalFormState } from "../../../hooks/withdrawal/useWithdrawalFormHooks"; // New custom hooks
import { Button } from "../../ui/button";
import { AddressInput } from "./AddressInput";
import { AmountInput } from "./AmountInput";
import { NoteSelector } from "./NoteSelector";
import { WithdrawalTimelineDrawer } from "./WithdrawalTimelineDrawer";

interface WithdrawalFormProps {
  asset: { symbol: string; name: string; icon: string };
  preSelectedNote?: Note | null;
  onTransactionSuccess?: () => void;
}

export function WithdrawalForm({ asset, preSelectedNote, onTransactionSuccess }: WithdrawalFormProps) {
  const { publicKey, accountKey } = useAuth();
  const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;

  // TypeScript assertion: AuthenticationGate ensures these values exist
  if (!publicKey || !accountKey) {
    throw new Error("WithdrawalForm: Missing auth values despite AuthenticationGate");
  }

  // Use custom hook to handle note discovery and selection logic
  const { availableNotes, selectedNote, setSelectedNote, isLoadingNotes } = useNoteSelection(
    publicKey,
    poolAddress,
    preSelectedNote,
  );

  // Use custom hook to manage form state and validation
  const { form, validationErrors, handleAmountChange, handleAddressChange, handleMaxClick, resetForm } =
    useWithdrawalFormState(selectedNote, asset);

  // Derived state from form values
  const withdrawAmountNum = Number.parseFloat(form.withdrawAmount) || 0;
  const isValidAmount = !validationErrors.amount && withdrawAmountNum > 0;
  const isValidAddress = !validationErrors.toAddress;

  // Withdrawal flow hook - only works when we have a selected note
  const withdrawalFlow = useWithdrawal({
    note: selectedNote || ({} as Note), // Use a more robust mock or null check
    onTransactionSuccess,
  });

  // Derived state for timeline drawer
  const withdrawalAmounts = useMemo(() => {
    return form.withdrawAmount ? calculateWithdrawalAmounts(form.withdrawAmount) : { executionFee: 0, youReceive: 0 };
  }, [form.withdrawAmount]);

  const { executionFee, youReceive } = withdrawalAmounts;
  const remainingBalance = useMemo(
    () => (selectedNote?.amount ? Number.parseFloat(formatEthAmount(selectedNote.amount)) - withdrawAmountNum : 0),
    [selectedNote, withdrawAmountNum],
  );

  const {
    isPreparing,
    isExecuting,
    showTimeline,
    steps,
    showPreviewMode,
    handlePreviewWithdrawal,
    handleExecuteTransaction,
    closeTimeline,
    handleShowPreview,
    resetStates,
  } = withdrawalFlow;

  // Reset states when selected note changes
  useEffect(() => {
    resetStates();
    resetForm();
  }, [resetStates, resetForm]);

  const handleSubmit = useCallback(() => {
    if (selectedNote && isValidAmount && isValidAddress) {
      handlePreviewWithdrawal(form.withdrawAmount, form.toAddress);
    }
  }, [selectedNote, isValidAmount, isValidAddress, handlePreviewWithdrawal, form.withdrawAmount, form.toAddress]);

  return (
    <div className="h-full flex flex-col px-4 py-4">
      {/* Note Selection */}
      <div className="mb-6">
        <label htmlFor="from-note" id="from-label" className="text-sm font-medium text-app-secondary mb-2 block">
          From
        </label>
        <NoteSelector
          availableNotes={availableNotes}
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          isLoadingNotes={isLoadingNotes}
          preSelectedNote={preSelectedNote}
          asset={asset}
        />
      </div>

      {/* To Address Input */}
      {selectedNote && (
        <div className="mb-4">
          <label htmlFor="to-address" className="text-sm font-medium text-app-secondary mb-2 block">
            To
          </label>
          <AddressInput value={form.toAddress} onChange={handleAddressChange} error={validationErrors.toAddress} />
        </div>
      )}

      {/* Amount Input */}
      {selectedNote && form.toAddress && !validationErrors.toAddress && (
        <div className="mb-4">
          <label htmlFor="amount" className="text-sm font-medium text-app-secondary mb-2 block">
            Amount
          </label>
          <AmountInput
            value={form.withdrawAmount}
            onChange={handleAmountChange}
            error={validationErrors.amount}
            selectedNote={selectedNote}
            asset={asset}
            onMaxClick={handleMaxClick}
          />
        </div>
      )}

      {/* Action Button */}
      <div className="mt-auto">
        <Button
          onClick={handleSubmit}
          disabled={!selectedNote || !isValidAmount || !isValidAddress || isPreparing || isExecuting}
          className="w-full h-11 rounded-xl text-sm font-medium"
          size="lg"
        >
          {isPreparing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Preparing Withdrawal...
            </>
          ) : isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Executing...
            </>
          ) : !selectedNote ? (
            "Select Note to Continue"
          ) : !form.toAddress || validationErrors.toAddress ? (
            "Continue"
          ) : (
            "Preview Withdrawal"
          )}
        </Button>
      </div>

      {/* Withdrawal Timeline Drawer */}
      {showTimeline && selectedNote && (
        <WithdrawalTimelineDrawer
          isOpen={showTimeline}
          onClose={closeTimeline}
          onConfirm={handleExecuteTransaction}
          note={selectedNote}
          withdrawAmount={form.withdrawAmount}
          recipientAddress={form.toAddress}
          executionFee={executionFee}
          youReceive={youReceive}
          remainingBalance={remainingBalance}
          isProcessing={isExecuting}
          steps={steps}
          currentStep={steps.findIndex((s) => s.status === "processing")} // Updated to find the actual current step
          showPreview={showPreviewMode}
          onShowPreview={handleShowPreview}
        />
      )}
    </div>
  );
}
