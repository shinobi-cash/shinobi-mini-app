import { CONTRACTS } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useCachedNotes } from "@/hooks/useCachedNotes";
import { useWithdrawalFlow } from "@/hooks/transactions/useWithdrawalFlow";
import type { Note } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { calculateWithdrawalAmounts } from "@/services/privacy/withdrawalService";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { Loader2, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAddress, parseEther } from "viem";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { TransactionPreviewDrawer } from "./TransactionPreviewDrawer";
import { ChevronDown, ChevronUp, X } from "lucide-react";

interface WithdrawalFormProps {
  asset: { symbol: string; name: string; icon: string };
}

export function WithdrawalForm({ asset }: WithdrawalFormProps) {
  const { publicKey, accountKey } = useAuth();
  const poolAddress = CONTRACTS.ETH_PRIVACY_POOL;

  // Get available notes
  const { data: noteDiscovery, loading: isLoadingNotes } = useCachedNotes(publicKey || "", poolAddress);

  // Form state
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isNoteDropdownOpen, setIsNoteDropdownOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAmountError, setWithdrawAmountError] = useState<string>("");
  const [toAddress, setToAddress] = useState("");
  const [toError, setToError] = useState<string>("");

  // TypeScript assertion: AuthenticationGate ensures these values exist
  if (!publicKey || !accountKey) {
    throw new Error("WithdrawalForm: Missing auth values despite AuthenticationGate");
  }

  // Get available unspent notes
  const availableNotes = useMemo(() => {
    return (noteDiscovery?.notes || [])
      .map((noteChain) => {
        const lastNote = noteChain[noteChain.length - 1];
        return lastNote.status === "unspent" ? lastNote : null;
      })
      .filter(Boolean) as Note[];
  }, [noteDiscovery]);

  // Auto-select first note when available
  useEffect(() => {
    if (availableNotes.length > 0 && !selectedNote) {
      setSelectedNote(availableNotes[0]);
    }
  }, [availableNotes, selectedNote]);

  // Helper function for note labels
  const getNoteLabel = (note: Note) => {
    return note.changeIndex === 0 
      ? `Deposit #${note.depositIndex}` 
      : `Change #${note.depositIndex}.${note.changeIndex}`;
  };

  // Form utilities
  const availableBalance = selectedNote ? Number.parseFloat(formatEthAmount(selectedNote.amount)) : 0;
  const withdrawAmountNum = Number.parseFloat(withdrawAmount) || 0;

  // ---- Validation ----
  const validateAmount = useCallback(
    (value: string): string => {
      if (!selectedNote) return "Please select a note first";
      if (value.length === 0) return "";
      if (!value.trim()) return "Please enter an amount";
      try {
        const parsed = parseEther(value);
        if (parsed <= 0n) return "Amount must be positive";
        const num = Number.parseFloat(value);
        if (num > availableBalance) {
          return `Amount cannot exceed ${formatEthAmount(selectedNote.amount)} ${asset.symbol}`;
        }
        return "";
      } catch {
        return "Please enter a valid amount";
      }
    },
    [availableBalance, selectedNote, asset.symbol],
  );

  const validateAddress = useCallback((value: string): string => {
    if (value.length === 0) return "";
    if (!value.trim()) return "Please enter a to address";
    if (!isAddress(value)) return "Please enter a valid Ethereum address";
    return "";
  }, []);

  // ---- Handlers ----
  const handleAmountChange = useCallback(
    (value: string) => {
      setWithdrawAmount(value);
      setWithdrawAmountError(validateAmount(value));
    },
    [validateAmount],
  );

  const handleAddressChange = useCallback(
    (value: string) => {
      setToAddress(value);
      setToError(validateAddress(value));
    },
    [validateAddress],
  );


  const handleMaxClick = useCallback(() => {
    if (!selectedNote) return;
    const maxValue = availableBalance.toString();
    setWithdrawAmount(maxValue);
    setWithdrawAmountError(validateAmount(maxValue));
  }, [availableBalance, validateAmount, selectedNote]);

  // Derived state
  const isValidAmount = !withdrawAmountError && withdrawAmountNum > 0 && selectedNote;
  const isValidAddress = !toError && toAddress.trim().length > 0;

  // Withdrawal flow hook - only works when we have a selected note
  // We'll use a dummy note object when no note is selected to avoid conditional hook calls
  const dummyNote: Note = {
    poolAddress: CONTRACTS.ETH_PRIVACY_POOL,
    depositIndex: 0,
    changeIndex: 0,
    amount: "0",
    transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    blockNumber: "0",
    timestamp: "0",
    status: "unspent",
    label: "dummy",
  };
  
  const withdrawalFlow = useWithdrawalFlow({ note: selectedNote || dummyNote });

  const withdrawalAmounts = useMemo(() => {
    return withdrawAmount ? calculateWithdrawalAmounts(withdrawAmount) : { executionFee: 0, youReceive: 0 };
  }, [withdrawAmount]);

  const { executionFee, youReceive } = withdrawalAmounts;
  const remainingBalance = useMemo(() => availableBalance - withdrawAmountNum, [availableBalance, withdrawAmountNum]);

  const {
    showPreview,
    isPreparing,
    isExecuting,
    handlePreviewWithdrawal,
    handleExecuteTransaction,
    closePreview,
    resetStates,
  } = withdrawalFlow;

  useEffect(() => {
    resetStates();
  }, [resetStates, withdrawAmount, toAddress, selectedNote]);

  // Re-validate amount when selected note changes
  useEffect(() => {
    if (withdrawAmount && selectedNote) {
      setWithdrawAmountError(validateAmount(withdrawAmount));
    }
  }, [selectedNote, withdrawAmount, validateAmount]);

  // Loading state
  if (isLoadingNotes) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-app-primary mb-1">Loading Notes</h3>
        <p className="text-sm text-app-secondary">Loading your available notes...</p>
      </div>
    );
  }

  // No notes state
  if (availableNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Wallet className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-app-primary mb-1">No Available Notes</h3>
        <p className="text-sm text-app-secondary text-center max-w-xs leading-relaxed">
          Make a deposit first to create privacy notes that you can withdraw from.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-4 py-4">
      {/* Note Selection */}
      <div className="mb-6">
        <div className="relative">
          <label className="text-sm font-medium text-app-secondary mb-2 block">From</label>
          
          {/* Dropdown Trigger */}
          <Button
            variant="outline"
            onClick={() => setIsNoteDropdownOpen(!isNoteDropdownOpen)}
            className="w-full h-16 p-4 justify-between text-left rounded-xl has-[>svg]:px-4"
          >
            {selectedNote ? (
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-app-primary text-sm">
                  {getNoteLabel(selectedNote)}
                </div>
                <div className="text-xs text-app-secondary">
                  {formatEthAmount(selectedNote.amount, { maxDecimals: 6 })} {asset.symbol}
                </div>
              </div>
            ) : (
              <span className="text-app-secondary">Choose a note...</span>
            )}
            {isNoteDropdownOpen ? (
              <ChevronUp className="w-4 h-4 text-app-secondary ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 text-app-secondary ml-2" />
            )}
          </Button>

          {/* Dropdown Content */}
          {isNoteDropdownOpen && availableNotes.length > 1 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-app-surface border border-app rounded-xl shadow-lg overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                {availableNotes.map((note) => (
                  <button
                    key={`${note.depositIndex}-${note.changeIndex}`}
                    type="button"
                    onClick={() => {
                      setSelectedNote(note);
                      setIsNoteDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-app-surface-hover transition-colors border-b border-app-border last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-app-primary text-sm truncate">
                          {getNoteLabel(note)}
                        </div>
                        <div className="text-xs text-app-secondary font-medium">
                          {formatEthAmount(note.amount, { maxDecimals: 6 })} {asset.symbol}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-app-tertiary whitespace-nowrap">
                          {formatTimestamp(note.timestamp)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* To Address - Only show if note is selected */}
      {selectedNote && (
        <div className="mb-4">
          <label className="text-sm font-medium text-app-secondary mb-2 block">
            To
          </label>
          {toAddress && !toError ? (
            <div className="flex items-center gap-2 bg-app-surface border border-app rounded-xl px-4 py-3 h-16">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-app-primary truncate">{toAddress}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setToAddress("");
                  setToError("");
                }}
                className="w-6 h-6 flex items-center justify-center rounded-xl hover:bg-app-surface-hover transition-colors"
              >
                <X className="w-4 h-4 text-app-secondary" />
              </button>
            </div>
          ) : (
            <>
              <Input
                id="to-address"
                type="text"
                placeholder="Enter public address (0x)"
                value={toAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                className={cn("font-mono text-xs h-16 px-4 py-3", toError && "border-destructive focus:border-destructive")}
                autoFocus={false}
              />
              {toError && <p className="text-xs text-red-500 text-center mt-2">{toError}</p>}
            </>
          )}
        </div>
      )}

      {/* Amount - Only show if address is entered and valid */}
      {selectedNote && toAddress && !toError && (
        <div className="mb-4">
          <label htmlFor="amount" className="text-sm font-medium text-app-secondary mb-2 block">
            Amount
          </label>
          <div className={cn(
            "relative border border-app rounded-xl bg-app-surface p-4 h-16 flex items-center",
            withdrawAmountError && withdrawAmount.trim().length > 0 && "border-destructive"
          )}>
            <div className="flex items-center justify-between w-full">
              {/* Left side - Asset info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <img src={asset.icon} alt={asset.symbol} className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-app-primary">{asset.symbol}</p>
                </div>
              </div>
              
              {/* Right side - Amount input */}
              <div className="text-right flex-1 max-w-[120px]">
                <Input
                  id="amount"
                  type="text"
                  placeholder="0"
                  value={withdrawAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className={cn(
                    "text-right text-lg font-medium border-none bg-transparent p-0 h-auto focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-none shadow-none",
                    withdrawAmountError && withdrawAmount.trim().length > 0 ? "text-red-500" : "text-app-primary"
                  )}
                  autoFocus={true}
                />
                <p className="text-xs text-app-tertiary">$0.00</p>
              </div>
              
              {/* Swap icon */}
              {/* <div className="ml-3">
                <ArrowUpDown className="w-4 h-4 text-app-secondary" />
              </div> */}
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-app-secondary">
              Balance: <span className="text-app-primary font-medium">
                {formatEthAmount(selectedNote.amount, { maxDecimals: 6 })} {asset.symbol}
              </span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMaxClick}
              className="rounded-xl px-2 py-1 text-xs h-6"
            >
              MAX
            </Button>
          </div>
        </div>
      )}

      

      {/* Action Button */}
      <div className="mt-auto">
        <Button
          onClick={() => selectedNote && handlePreviewWithdrawal(withdrawAmount, toAddress)}
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
          ) : !toAddress || toError ? (
            "Continue"
          ) : (
            "Preview Withdrawal"
          )}
        </Button>
      </div>

      {/* Transaction Preview Drawer */}
      {showPreview && selectedNote && (
        <TransactionPreviewDrawer
          isOpen={showPreview}
          onClose={closePreview}
          onConfirm={handleExecuteTransaction}
          note={selectedNote}
          withdrawAmount={withdrawAmount}
          recipientAddress={toAddress}
          executionFee={executionFee}
          youReceive={youReceive}
          remainingBalance={remainingBalance}
          isProcessing={isExecuting}
        />
      )}
    </div>
  );
}