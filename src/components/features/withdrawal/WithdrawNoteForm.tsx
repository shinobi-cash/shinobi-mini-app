import { useEffect, useMemo } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '@/lib/utils';
import { useWithdrawalForm } from '@/hooks/forms/useWithdrawalForm';
import { useWithdrawalFlow } from '@/hooks/transactions/useWithdrawalFlow';
import { TransactionPreviewDrawer } from './TransactionPreviewDrawer';
import { Note } from '@/lib/noteCache';
import { formatEthAmount } from '@/utils/formatters';
import { calculateWithdrawalAmounts } from '@/services/withdrawalService';

interface WithdrawNoteFormProps {
  note: Note;
  onBack: () => void;
}

export const WithdrawNoteForm = ({ note, onBack }: WithdrawNoteFormProps) => {
  // Use form hook for validation and state management
  const form = useWithdrawalForm({ note });
  
  // Use withdrawal flow hook for transaction management
  const withdrawalFlow = useWithdrawalFlow({ note });

  // Extract form values for easier access
  const { withdrawAmount, recipientAddress, withdrawAmountNum, availableBalance, isValidAmount, isValidRecipient } = form;
  
  // Memoize expensive calculations to prevent unnecessary recalculations
  const withdrawalAmounts = useMemo(() => {
    return withdrawAmount 
      ? calculateWithdrawalAmounts(withdrawAmount)
      : { executionFee: 0, youReceive: 0 };
  }, [withdrawAmount]);
  
  const { executionFee, youReceive } = withdrawalAmounts;
    
  // Remaining balance = original amount - withdrawal amount (execution fee comes from withdrawal)
  const remainingBalance = useMemo(() => 
    availableBalance - withdrawAmountNum, 
    [availableBalance, withdrawAmountNum]
  );

  // Extract form handlers 
  const { handleAmountChange, handleMaxClick, setRecipientAddress } = form;
  
  // Extract withdrawal flow handlers and state
  const { 
    showPreview, 
    isPreparing, 
    isExecuting, 
    handlePreviewWithdrawal, 
    handleExecuteTransaction, 
    closePreview, 
    resetStates 
  } = withdrawalFlow;

  // Auto-reset all states when form values change
  useEffect(() => {
    resetStates();
  }, [withdrawAmount, recipientAddress, resetStates]);

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

      {/* Form Content */}
      <div className="flex-1 overflow-auto">
        {/* Amount Input */}
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
          
          {/* Available Balance */}
          <div className="text-center mb-3">
            <p className="text-xs text-app-secondary">
              Available: <span className="text-app-primary font-medium">{formatEthAmount(note.amount, { maxDecimals: 6 })} ETH</span>
            </p>
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMaxClick}
              className="rounded-full px-3 py-1 text-xs"
            >
              MAX
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => form.handlePercentageClick(0.5)}
              className="rounded-full px-3 py-1 text-xs"
            >
              50%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => form.handlePercentageClick(0.25)}
              className="rounded-full px-3 py-1 text-xs"
            >
              25%
            </Button>
          </div>
          
          {!isValidAmount && withdrawAmount && (
            <p className="text-xs text-destructive mt-2 text-center">
              Amount must be between 0 and {formatEthAmount(note.amount)} ETH
            </p>
          )}
        </div>

        {/* Recipient Address */}
        <div className="mb-4">
          <label className="text-sm font-medium text-app-primary mb-2 block">Recipient Address</label>
          <Input
            type="text"
            placeholder="0x..."
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className={cn(
              "font-mono text-xs",
              !isValidRecipient && recipientAddress && "border-destructive focus:border-destructive"
            )}
          />
          {!isValidRecipient && recipientAddress && (
            <p className="text-xs text-destructive mt-2">Please enter a valid Ethereum address</p>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-auto">
        <Button
          onClick={() => handlePreviewWithdrawal(withdrawAmount, recipientAddress)}
          disabled={
            !isValidAmount || 
            !isValidRecipient || 
            isPreparing ||
            isExecuting
          }
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
            'Preview Withdrawal'
          )}
        </Button>
      </div>

      {/* Transaction Preview Drawer */}
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