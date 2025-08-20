import { Copy, Loader2, X, Info } from 'lucide-react';
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
import { formatEther, parseEther } from 'viem';

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
  executionFee: number;
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
  executionFee,
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

  // Format ETH amounts using viem's formatEther for proper precision with consistent decimals
  const formatEthAmount = (amount: number | string | undefined): string => {
    if (!amount || amount === 0) return '0';
    try {
      // Convert to string first, then to BigInt wei, then format
      const amountStr = typeof amount === 'number' ? amount.toString() : amount;
      const weiAmount = parseEther(amountStr);
      const formatted = formatEther(weiAmount);
      
      // Ensure consistent decimal places (pad with zeros if needed, trim if too long)
      const parts = formatted.split('.');
      if (parts.length === 1) {
        return `${parts[0]}.0000000`;
      }
      const decimals = parts[1].padEnd(7, '0').substring(0, 7);
      return `${parts[0]}.${decimals}`;
    } catch {
      return '0.0000000';
    }
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

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Amount Section */}
          <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
            <div className="text-center">
              <p className="text-sm font-medium text-app-secondary mb-1">
                You will receive
              </p>
              <p className="text-2xl font-bold text-app-primary tabular-nums">
                {formatEthAmount(youReceive)} ETH
              </p>
            </div>
          </div>

          {/* Transaction Summary */}
          <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-app">
              <h3 className="text-sm font-semibold text-app-primary">Fee Breakdown</h3>
            </div>
            
            <div className="divide-y divide-app-border">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Note Balance</span>
                <span className="text-xs font-mono text-app-primary tabular-nums">
                  {formatEthAmount(parseFloat(noteData.amount))} ETH
                </span>
              </div>
              
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Withdrawal Amount</span>
                <span className="text-xs font-mono  text-red-500  tabular-nums">
                  -{formatEthAmount(withdrawAmountNum)} ETH
                </span>
              </div>
              
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-app-secondary">Execution Fee (Max)</span>
                  <div className="group relative">
                    <Info className="h-3 w-3 text-app-tertiary hover:text-app-secondary cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      Maximum fee taken from withdrawal. Unused portion refunded to recipient.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-red-500 tabular-nums">
                  -{formatEthAmount(executionFee)} ETH
                </span>
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
              <h3 className="text-sm font-semibold text-app-primary">Recipient Details</h3>
            </div>
            
            <div className="divide-y divide-app-border">
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
        <div className="px-4 pb-4">
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