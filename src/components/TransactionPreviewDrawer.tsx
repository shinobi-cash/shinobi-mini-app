import { Copy, Loader2, X } from 'lucide-react';
import { Button } from './ui/button';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerClose, 
  DrawerDescription
} from './ui/drawer';
import { toast } from 'sonner';

interface TransactionPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  noteData: {
    noteIndex: number;
    amount: string;
  };
  withdrawAmount: string;
  recipientAddress: string;
  estimatedFee: number;
  youReceive: number;
  remainingBalance: number;
  isProcessing: boolean;
}

export const TransactionPreviewDrawer = ({
  isOpen,
  onClose,
  onConfirm,
  noteData,
  withdrawAmount,
  recipientAddress,
  estimatedFee,
  youReceive,
  remainingBalance,
  isProcessing
}: TransactionPreviewDrawerProps) => {
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${fieldName} copied!`);
  };

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

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

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-app-background border-app max-h-[85vh]">
        <DrawerHeader className="pb-0 px-4 py-1">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold text-app-primary tracking-tight">
              Transaction Preview
            </DrawerTitle>
            <DrawerClose className="rounded-full h-7 w-7 flex items-center justify-center bg-app-surface hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-3.5 w-3.5 text-app-secondary" />
            </DrawerClose>
          </div>
          <DrawerDescription className="text-sm text-app-secondary">
            Review your withdrawal details before confirming
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {/* Amount Section */}
          <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
            <div className="text-center">
              <p className="text-sm font-medium text-app-secondary mb-1">You will receive</p>
              <p className="text-2xl font-bold text-app-primary tabular-nums">
                {formatEthAmount(youReceive)} ETH
              </p>
              <p className="text-xs text-app-tertiary mt-0.5">After network fees</p>
            </div>
          </div>

          {/* Transaction Summary */}
          <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-app">
              <h3 className="text-sm font-semibold text-app-primary">Fee Breakdown</h3>
            </div>
            
            <div className="divide-y divide-app-border">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Withdrawal Amount</span>
                <span className="text-xs font-mono text-app-primary tabular-nums">
                  {formatEthAmount(withdrawAmountNum)} ETH
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

              {remainingBalance > 0 && (
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-app-secondary">Remaining in Note</span>
                  <span className="text-xs font-mono text-app-primary tabular-nums">
                    {formatEthAmount(remainingBalance)} ETH
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-app">
              <h3 className="text-sm font-semibold text-app-primary">Transaction Details</h3>
            </div>
            
            <div className="divide-y divide-app-border">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">From Note</span>
                <span className="text-xs text-app-primary">#{noteData.noteIndex}</span>
              </div>
              
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">To Address</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-app-primary">
                    {formatHash(recipientAddress)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(recipientAddress, 'Recipient Address')}
                    className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-6">
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="w-full h-11 rounded-xl text-sm font-medium"
            size="lg"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            ) : (
              'Confirm Withdrawal'
            )}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};