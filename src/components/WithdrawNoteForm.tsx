import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { isAddress } from 'viem';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { TransactionPreviewDrawer } from './TransactionPreviewDrawer';
import { Note } from '@/lib/noteCache';
import { 
  executePreparedWithdrawal,
  validateWithdrawalRequest,
  calculateWithdrawalAmounts,
  type WithdrawalRequest,
  type PreparedWithdrawal,
  processWithdrawal
} from '../services/withdrawalService';

interface WithdrawNoteFormProps {
  note: Note;
  onBack: () => void;
}

export const WithdrawNoteForm = ({ note, onBack }: WithdrawNoteFormProps) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Get auth context for account keys
  const { accountKey } = useAuth();

  // State for withdrawal preparation
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [preparedWithdrawal, setPreparedWithdrawal] = useState<PreparedWithdrawal | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Calculate values for validation and display
  const availableBalance = parseFloat(note.amount);
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  
  // Use service to calculate withdrawal amounts
  const { executionFee, youReceive } = withdrawAmount 
    ? calculateWithdrawalAmounts(withdrawAmount)
    : { executionFee: 0, youReceive: 0 };
    
  // Remaining balance = original amount - withdrawal amount (execution fee comes from withdrawal)
  const remainingBalance = availableBalance - withdrawAmountNum;

  // Basic form validation (for UI feedback)
  const isValidAmount = withdrawAmountNum > 0 && withdrawAmountNum <= availableBalance;
  const isValidRecipient = isAddress(recipientAddress);

  // Handle amount input validation
  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setWithdrawAmount(value);
    }
  };

  // Handle max button
  const handleMaxClick = () => {
    setWithdrawAmount(note.amount);
  };

  // Handle withdrawal preparation using our clean service
  const handlePreviewWithdrawal = async () => {
    try {
      setIsPreparing(true);
      setPreparationError(null);
      
      // Create withdrawal request
      const withdrawalRequest: WithdrawalRequest = {
        note,
        withdrawAmount,
        recipientAddress,
        accountKey:accountKey!,
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
      console.log('💰 Fee calculation debug:', { executionFee, youReceive, withdrawAmount });
      
    } catch (error) {
      console.error('❌ Failed to prepare withdrawal:', error);
      setIsPreparing(false);
      setPreparationError(error instanceof Error ? error.message : 'Failed to prepare withdrawal');
      toast.error('Failed to prepare withdrawal');
    }
  };

  // Execute the withdrawal transaction
  const handleExecuteTransaction = async () => {
    if (!preparedWithdrawal) {
      toast.error('No prepared withdrawal found');
      return;
    }

    try {
      setIsExecuting(true);
      
      console.log('🚀 Executing withdrawal transaction...');
      const transactionHash = await executePreparedWithdrawal(preparedWithdrawal);
      
      console.log('✅ Withdrawal executed successfully:', transactionHash);
      toast.success(`Withdrawal completed! Tx: ${transactionHash.slice(0, 10)}...`);
      
      setShowPreview(false);
      setIsExecuting(false);
      
    } catch (error) {
      console.error('❌ Failed to execute withdrawal:', error);
      setIsExecuting(false);
      toast.error('Failed to execute withdrawal');
    }
  };

  // Auto-reset all states when form values change
  useEffect(() => {
    if (preparedWithdrawal || preparationError) {
      setPreparedWithdrawal(null);
      setPreparationError(null);
    }
    if (showPreview) {
      setShowPreview(false);
    }
  }, [withdrawAmount, recipientAddress]);

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
              Available: <span className="text-app-primary font-medium">{note.amount} ETH</span>
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
              onClick={() => setWithdrawAmount((availableBalance * 0.5).toString())}
              className="rounded-full px-3 py-1 text-xs"
            >
              50%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWithdrawAmount((availableBalance * 0.25).toString())}
              className="rounded-full px-3 py-1 text-xs"
            >
              25%
            </Button>
          </div>
          
          {!isValidAmount && withdrawAmount && (
            <p className="text-xs text-destructive mt-2 text-center">
              Amount must be between 0 and {note.amount} ETH
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
          onClick={handlePreviewWithdrawal}
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
          onClose={() => setShowPreview(false)}
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