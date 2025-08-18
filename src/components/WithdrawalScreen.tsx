import { useState } from 'react';
import { ArrowLeft, Copy, ExternalLink, Loader2, CheckCircle2, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { isAddress } from 'viem';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AuthenticationGate } from './shared/AuthenticationGate';
import { useCashNoteData } from '../hooks/useProfileData';
import { TransactionPreviewDrawer } from './TransactionPreviewDrawer';

interface WithdrawalFormProps {
  noteData: {
    noteIndex: number;
    amount: string;
    status: 'deposited' | 'spent';
    transactionHash: string;
    blockNumber: string;
    timestamp: string;
  };
  onBack: () => void;
}

export const WithdrawalScreen = () => {
  return (
    <AuthenticationGate
      title="Withdraw from Privacy Pool"
      description="Load your account to access your private notes for withdrawal"
      context="withdraw"
    >
      <WithdrawalContent />
    </AuthenticationGate>
  );
};

const WithdrawalContent = () => {
  const profileData = useCashNoteData();
  const [selectedNote, setSelectedNote] = useState<number | null>(null);

  // Get available notes with deposits
  const availableNotes = profileData.deposits.filter(deposit => deposit.status === 'deposited');

  if (selectedNote !== null) {
    const noteData = availableNotes.find(note => note.noteIndex === selectedNote);
    if (noteData) {
      return (
        <WithdrawalForm 
          noteData={noteData} 
          onBack={() => setSelectedNote(null)} 
        />
      );
    }
  }

  return <NoteSelector 
    notes={availableNotes} 
    onSelectNote={setSelectedNote}
    isLoading={profileData.isSyncing}
  />;
};

interface NoteSelectorProps {
  notes: any[];
  onSelectNote: (noteIndex: number) => void;
  isLoading: boolean;
}

const NoteSelector = ({ notes, onSelectNote, isLoading }: NoteSelectorProps) => {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col px-4 py-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-app-primary">Select Note to Withdraw</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-app-primary mx-auto" />
            <p className="text-app-secondary">Loading your notes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="h-full flex flex-col px-4 py-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-app-primary">Select Note to Withdraw</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <div className="size-16 bg-app-card rounded-full flex items-center justify-center mx-auto">
              <Wallet className="size-8 text-app-secondary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-app-primary">No Notes Available</h2>
              <p className="text-app-secondary text-sm">
                You don't have any notes with deposits available for withdrawal. 
                Make a deposit first to create withdrawable notes.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-4 py-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-app-primary">Select Note to Withdraw</h1>
        <span className="text-sm text-app-secondary">({notes.length} available)</span>
      </div>
      
      <div className="flex-1 space-y-3 overflow-auto">
        {notes.map((note) => (
          <button
            key={note.noteIndex}
            onClick={() => onSelectNote(note.noteIndex)}
            className="w-full p-4 bg-app-card border border-app-border rounded-xl hover:bg-app-card/80 transition-colors text-left"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-app-primary">Cash Note #{note.noteIndex}</span>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded-full">
                    Available
                  </span>
                </div>
                <p className="text-sm text-app-secondary">
                  Deposited {new Date(parseInt(note.timestamp) * 1000).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-app-primary">{note.amount} ETH</div>
                <div className="text-xs text-app-secondary">Available</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const WithdrawalForm = ({ noteData, onBack }: WithdrawalFormProps) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [transactionHash, setTransactionHash] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Calculate values
  const availableBalance = parseFloat(noteData.amount);
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const feeRate = 0.05; // 5% fee
  const estimatedFee = withdrawAmountNum * feeRate;
  const youReceive = withdrawAmountNum - estimatedFee;
  const remainingBalance = availableBalance - withdrawAmountNum;

  // Format ETH amounts with meaningful precision
  const formatEthAmount = (amount: number): string => {
    if (amount === 0) return '0';
    
    // For amounts >= 1, show 4 decimal places
    if (amount >= 1) {
      return amount.toFixed(4);
    }
    
    // For amounts < 1, show at least 2 significant digits
    const str = amount.toString();
    const scientificMatch = str.match(/^(\d+\.?\d*)[eE]([+-]?\d+)$/);
    
    if (scientificMatch) {
      // Handle scientific notation (very small numbers)
      return amount.toFixed(Math.max(6, Math.abs(parseInt(scientificMatch[2])) + 2));
    }
    
    // Find first non-zero digit after decimal point
    const decimalIndex = str.indexOf('.');
    if (decimalIndex === -1) return str;
    
    let firstNonZero = decimalIndex + 1;
    while (firstNonZero < str.length && str[firstNonZero] === '0') {
      firstNonZero++;
    }
    
    // Show at least 2 significant digits after the first non-zero
    const significantDigits = Math.max(4, firstNonZero - decimalIndex + 1);
    return amount.toFixed(significantDigits);
  };

  // Validation
  const isValidAmount = withdrawAmountNum > 0 && withdrawAmountNum <= availableBalance;
  const isValidRecipient = isAddress(recipientAddress);
  const isFormValid = isValidAmount && isValidRecipient;

  // Handle amount input validation (same as DepositScreen)
  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setWithdrawAmount(value);
    }
  };

  // Handle max button
  const handleMaxClick = () => {
    setWithdrawAmount(noteData.amount);
  };

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (!isFormValid) return;

    setIsProcessing(true);
    setWithdrawalStatus('processing');

    try {
      // TODO: Implement actual withdrawal logic
      // This would call the privacy pool withdrawal function
      
      // Simulate processing steps
      await new Promise(resolve => setTimeout(resolve, 2000)); // ZK proof generation
      await new Promise(resolve => setTimeout(resolve, 1000)); // Transaction submission
      await new Promise(resolve => setTimeout(resolve, 1500)); // Confirmation
      
      // Simulate success
      setTransactionHash('0x1234567890abcdef1234567890abcdef12345678');
      setWithdrawalStatus('success');
      toast.success('Withdrawal completed successfully!');
      
    } catch (error) {
      setWithdrawalStatus('error');
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, fieldName?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(fieldName ? `${fieldName} copied!` : 'Copied to clipboard');
  };

  // Reset form
  const handleStartOver = () => {
    setWithdrawalStatus('idle');
    setWithdrawAmount('');
    setRecipientAddress('');
    setTransactionHash('');
  };

  if (withdrawalStatus === 'success') {
    return (
      <div className="h-full flex flex-col px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-app-primary">Withdraw</h1>
            <p className="text-xs text-app-secondary mt-1">Withdrawal completed successfully</p>
          </div>
        </div>

        {/* Success Content */}
        <div className="flex-1 overflow-auto space-y-4">
          {/* Success Hero Section */}
          <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
            <div className="text-center py-4">
              <div className="size-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-app-secondary mb-1">Successfully received</p>
              <p className="text-2xl font-bold text-app-primary tabular-nums">
                {formatEthAmount(youReceive)} ETH
              </p>
              <p className="text-xs text-app-tertiary mt-0.5">Funds sent anonymously</p>
            </div>
          </div>

          {/* Transaction Summary */}
          <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-app">
              <h3 className="text-sm font-semibold text-app-primary">Transaction Summary</h3>
            </div>
            
            <div className="divide-y divide-app-border">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Withdrawal Amount</span>
                <span className="text-xs font-mono text-app-primary tabular-nums">
                  {formatEthAmount(parseFloat(withdrawAmount))} ETH
                </span>
              </div>
              
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Network Fee</span>
                <span className="text-xs font-mono text-red-500 tabular-nums">
                  -{formatEthAmount(estimatedFee)} ETH
                </span>
              </div>
              
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Gas Fee</span>
                <span className="text-xs text-green-600">Free (Sponsored)</span>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-app">
              <h3 className="text-sm font-semibold text-app-primary">Transaction Details</h3>
            </div>
            
            <div className="divide-y divide-app-border">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">To Address</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-app-primary">
                    {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(recipientAddress, 'Address')}
                    className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                  </button>
                </div>
              </div>
              
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Transaction Hash</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-app-primary">
                    {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(transactionHash, 'Transaction Hash')}
                    className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                  </button>
                  <button className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200">
                    <ExternalLink className="h-3.5 w-3.5 text-app-tertiary" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-3">
          <Button onClick={handleStartOver} className="w-full h-11 rounded-xl text-sm font-medium">
            Make Another Withdrawal
          </Button>
          <Button variant="outline" onClick={onBack} className="w-full h-11 rounded-xl text-sm font-medium">
            Back to Notes
          </Button>
        </div>
      </div>
    );
  }

  if (withdrawalStatus === 'processing') {
    return (
      <div className="h-full flex flex-col px-4 py-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-app-primary">Processing Withdrawal</h1>
        </div>

        {/* Processing Content */}
        <div className="flex-1 space-y-6 overflow-auto">
          <div className="text-center py-8">
            <div className="size-16 bg-app-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="size-8 text-app-primary animate-spin" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-app-primary">Creating Anonymous Withdrawal</h2>
            <p className="text-app-secondary">Please wait while we process your transaction</p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="size-5 text-green-600" />
              <span className="text-sm font-medium">Generating privacy proof</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
              <Loader2 className="size-5 text-blue-600 animate-spin" />
              <span className="text-sm font-medium">Submitting transaction</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border opacity-50">
              <div className="size-5 border-2 border-muted-foreground rounded-full" />
              <span className="text-sm text-muted-foreground">Confirming withdrawal</span>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-app-card border border-app-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-app-secondary">Withdrawing</span>
              <span className="font-medium text-app-primary">{withdrawAmount} ETH</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-app-secondary">To</span>
              <span className="font-mono text-sm text-app-primary">{recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-app-secondary">You'll receive</span>
              <span className="font-semibold text-app-primary">{youReceive.toFixed(4)} ETH</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-app-primary">Withdraw</h1>
          <p className="text-xs text-app-secondary">Note #{noteData.noteIndex} • Anonymous withdrawal</p>
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
          
          {/* Available Balance - Integrated */}
          <div className="text-center mb-3">
            <p className="text-xs text-app-secondary">
              Available: <span className="text-app-primary font-medium">{noteData.amount} ETH</span>
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
            <p className="text-xs text-destructive mt-2 text-center">Amount must be between 0 and {noteData.amount} ETH</p>
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


        {/* Privacy Notice */}
        {/* <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="size-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <span className="text-xs">🔒</span>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100">Anonymous Withdrawal</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Your identity will not be linked to this withdrawal.</p>
            </div>
          </div>
        </div> */}
      </div>

      {/* Action Button */}
      <div className="mt-auto">
        <Button
          onClick={() => setShowPreview(true)}
          disabled={!isFormValid || isProcessing}
          className="w-full h-11 rounded-xl text-sm font-medium"
          size="lg"
        >
          Transaction Preview
        </Button>
      </div>
      
      {/* Transaction Preview Drawer */}
      {showPreview && (
        <TransactionPreviewDrawer
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onConfirm={handleWithdraw}
          noteData={noteData}
          withdrawAmount={withdrawAmount}
          recipientAddress={recipientAddress}
          estimatedFee={estimatedFee}
          youReceive={youReceive}
          remainingBalance={remainingBalance}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};