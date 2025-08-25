import { X, ExternalLink } from 'lucide-react';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription,
  DrawerClose 
} from '../../ui/drawer';
import { NoteChain } from '@/lib/noteCache';
import { formatEthAmount, formatTimestamp, formatHash } from '@/utils/formatters';
import { NETWORK } from '@/config/constants';

interface NoteChainDetailDrawerProps {
  noteChain: NoteChain | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteChainDetailDrawer({ noteChain, open, onOpenChange }: NoteChainDetailDrawerProps) {
  if (!noteChain) return null;

  const lastNote = noteChain[noteChain.length - 1];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-app-background border-app max-h-[85vh]">
        <DrawerHeader className="pb-0 px-4 py-1">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold text-app-primary tracking-tight">
              Transaction Timeline
            </DrawerTitle>
            <DrawerClose className="rounded-full h-7 w-7 flex items-center justify-center bg-app-surface hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-3.5 w-3.5 text-app-secondary" />
            </DrawerClose>
          </div>
          <DrawerDescription className="text-sm text-app-secondary">
            Money flow visualization for this transaction chain
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Current Status Summary */}
          <div className="bg-app-surface rounded-xl p-4 border border-app shadow-sm mb-6">
            <div className="text-center">
              <p className="text-sm font-medium text-app-secondary mb-1">Current Status</p>
              <p className="text-2xl font-bold text-app-primary tabular-nums mb-2">
                {formatEthAmount(lastNote.amount)} ETH
              </p>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                lastNote.status === 'spent' 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                <div className={`w-1 h-1 rounded-full ${
                  lastNote.status === 'spent' ? 'bg-red-500' : 'bg-green-500'
                }`} />
                {lastNote.status === 'spent' ? 'Fully Spent' : 'Available'}
              </div>
            </div>
          </div>

          {/* Activity Table */}
          <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-app">
              <h3 className="text-sm font-semibold text-app-primary">Transaction Details</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {noteChain.map((note, index) => {
                const isFirst = index === 0;
                const isLast = index === noteChain.length - 1;
                
                return (
                  <div key={`${note.depositIndex}-${note.changeIndex}`} className="bg-app-surface border-b border-app px-3 py-3 sm:px-4 sm:py-4 hover:bg-app-surface-hover transition-all duration-150">
                    <div className="flex items-center justify-between gap-2">
                      {/* Left side: Type and amount */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-app-primary tracking-tight text-base sm:text-lg truncate">
                          {isFirst ? 'Deposit' : isLast ? 'Current Balance' : 'Balance'}
                        </div>
                        <div className="text-sm sm:text-base text-app-secondary font-medium tabular-nums">
                          {formatEthAmount(note.amount)} ETH
                        </div>
                      </div>

                      {/* Right side: Status and timestamp */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-right">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${
                            note.status === 'spent' 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            <div className={`w-1 h-1 rounded-full ${
                              note.status === 'spent' ? 'bg-red-500' : 'bg-green-500'
                            }`} />
                            {note.status === 'spent' ? 'Spent' : 'Unspent'}
                          </div>
                          <div className="text-xs sm:text-sm text-app-tertiary font-medium whitespace-nowrap">
                            {formatTimestamp(note.timestamp)}
                          </div>
                          <a
                            href={`${NETWORK.EXPLORER_URL}/tx/${note.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-1"
                          >
                            {formatHash(note.transactionHash)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}