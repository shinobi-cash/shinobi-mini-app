import { useWithdrawalFlow } from "@/hooks/transactions/useWithdrawalFlow";
import type { Note } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { calculateWithdrawalAmounts } from "@/services/privacy/withdrawalService";
import { formatEthAmount } from "@/utils/formatters";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAddress, parseEther } from "viem";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { TransactionPreviewDrawer } from "./TransactionPreviewDrawer";

interface WithdrawNoteFormProps {
  note: Note;
  onBack: () => void;
}

export const WithdrawNoteForm = ({ note, onBack }: WithdrawNoteFormProps) => {
  // Direct state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAmountError, setWithdrawAmountError] = useState<string>("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientError, setRecipientError] = useState<string>("");

  // Form utilities
  const availableBalance = Number.parseFloat(formatEthAmount(note.amount));
  const withdrawAmountNum = Number.parseFloat(withdrawAmount) || 0;

  // ---- Validation ----
  const validateAmount = useCallback(
    (value: string): string => {
      if(value.length === 0 ) return "";
      if (!value.trim()) return "Please enter an amount";
      try {
        const parsed = parseEther(value);
        if (parsed <= 0n) return "Amount must be positive";
        const num = Number.parseFloat(value);
        if (num > availableBalance) {
          return `Amount cannot exceed ${formatEthAmount(note.amount)} ETH`;
        }
        return "";
      } catch {
        return "Please enter a valid amount";
      }
    },
    [availableBalance, note.amount]
  );

  const validateAddress = useCallback((value: string): string => {
    if(value.length === 0 ) return "";
    if (!value.trim()) return "Please enter a recipient address";
    if (!isAddress(value)) return "Please enter a valid Ethereum address";
    return "";
  }, []);

  // ---- Handlers ----
  const handleAmountChange = useCallback(
    (value: string) => {
      setWithdrawAmount(value);
      setWithdrawAmountError(validateAmount(value));
    },
    [validateAmount]
  );

  const handleAddressChange = useCallback(
    (value: string) => {
      setRecipientAddress(value);
      setRecipientError(validateAddress(value));
    },
    [validateAddress]
  );

  const handleMaxClick = useCallback(() => {
    const maxValue = availableBalance.toString();
    setWithdrawAmount(maxValue);
    setWithdrawAmountError(validateAmount(maxValue));
  }, [availableBalance, validateAmount]);

  const handlePercentageClick = useCallback(
    (percentage: number) => {
      const amount = (availableBalance * percentage).toString();
      setWithdrawAmount(amount);
      setWithdrawAmountError(validateAmount(amount));
    },
    [availableBalance, validateAmount]
  );

  // Derived state
  const isValidAmount = !withdrawAmountError && withdrawAmountNum > 0;
  const isValidAddress = !recipientError;

  // Withdrawal flow hook
  const withdrawalFlow = useWithdrawalFlow({ note });

  const withdrawalAmounts = useMemo(() => {
    return withdrawAmount
      ? calculateWithdrawalAmounts(withdrawAmount)
      : { executionFee: 0, youReceive: 0 };
  }, [withdrawAmount]);

  const { executionFee, youReceive } = withdrawalAmounts;
  const remainingBalance = useMemo(
    () => availableBalance - withdrawAmountNum,
    [availableBalance, withdrawAmountNum]
  );

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
  }, [resetStates, withdrawAmount, recipientAddress]);

  return (
    <div className="h-full flex flex-col px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-app-primary">Withdraw</h1>
          <p className="text-xs text-app-secondary"> Anonymous withdrawal</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto">
        {/* Amount */}
        <div className="mb-6">
          <div className="text-center mb-3">
            <input
              type="text"
              placeholder="0.00"
              value={withdrawAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="text-3xl font-light text-center bg-transparent border-none outline-none text-app-primary placeholder-app-secondary w-full"
            />
            <p className="text-base text-app-secondary mt-1">ETH</p>
          </div>

          {/* Balance */}
          <div className="text-center mb-3">
            <p className="text-xs text-app-secondary">
              Available:{" "}
              <span className="text-app-primary font-medium">
                {formatEthAmount(note.amount, { maxDecimals: 6 })} ETH
              </span>
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleMaxClick} className="rounded-full px-3 py-1 text-xs">
              MAX
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePercentageClick(0.5)}
              className="rounded-full px-3 py-1 text-xs"
            >
              50%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePercentageClick(0.25)}
              className="rounded-full px-3 py-1 text-xs"
            >
              25%
            </Button>
          </div>
        </div>

        {/* Recipient Address */}
        <div className="mb-4">
          <label htmlFor="recipient-address" className="text-sm font-medium text-app-primary mb-2 block">
            Recipient Address
          </label>
          <Input
            id="recipient-address"
            type="text"
            placeholder="0x..."
            value={recipientAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            className={cn(
              "font-mono text-xs",
              recipientError && "border-destructive focus:border-destructive"
            )}
          />
        </div>
        {/* Error */}
        {withdrawAmountError && (
          <p className="text-xs text-destructive mt-2 text-center">{withdrawAmountError}</p>
        )}
        {recipientError && <p className="text-xs text-destructive text-center mt-2">{recipientError}</p>}

      </div>


      {/* Action */}
      <div className="mt-auto">
        <Button
          onClick={() => handlePreviewWithdrawal(withdrawAmount, recipientAddress)}
          disabled={!isValidAmount || !isValidAddress || isPreparing || isExecuting}
          className="w-full h-11 rounded-xl text-sm font-medium"
          size="lg"
        >
          {isPreparing ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Preparing Withdrawal...
            </>
          ) : isExecuting ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Executing...
            </>
          ) : (
            "Preview Withdrawal"
          )}
        </Button>
      </div>

      {/* Drawer */}
      {showPreview && (
        <TransactionPreviewDrawer
          isOpen={showPreview}
          onClose={closePreview}
          onConfirm={handleExecuteTransaction}
          note={note}
          withdrawAmount={withdrawAmount}
          recipientAddress={recipientAddress}
          executionFee={executionFee}
          youReceive={youReceive}
          remainingBalance={remainingBalance}
          isProcessing={isExecuting}
        />
      )}
    </div>
  );
};

