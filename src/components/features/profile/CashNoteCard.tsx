import { Note } from '@/lib/noteCache';
import { formatEthAmount, formatDate } from '@/utils/formatters';

interface CashNoteCardProps {
  note: Note;
  chainLength?: number;
  onClick?: () => void;
}

export function CashNoteCard({ note, chainLength, onClick }: CashNoteCardProps) {
  // Show user-friendly labels based on chain progression
  const noteLabel = chainLength === 1 
    ? "Transaction Balance"  // Simple case: only one note in chain
    : note.changeIndex === 0 
      ? "Original Deposit" 
      : "Current Balance";
  
  const isSpent = note.status === 'spent';

  return (
    <button
      className="w-full bg-app-surface border-b border-app px-3 py-3 sm:px-4 sm:py-4 transition-all duration-150 hover:bg-app-surface-hover text-left group"
      onClick={onClick}
    >
      {/* Note Details */}
      <div className="flex-1 flex justify-between gap-2">
        {/* Left side: Type and amount */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-app-primary tracking-tight capitalize text-base sm:text-lg truncate">
            {noteLabel}
          </div>
          <div className="text-sm sm:text-base text-app-secondary font-medium tabular-nums">
            {formatEthAmount(note.amount)} ETH
          </div>
        </div>

        {/* Right side: Status and timestamp */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${
              isSpent 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              <div className={`w-1 h-1 rounded-full ${
                isSpent ? 'bg-red-500' : 'bg-green-500'
              }`} />
              {isSpent ? 'Spent' : 'Unspent'}
            </div>
            <div className="text-xs sm:text-sm text-app-tertiary font-medium whitespace-nowrap">
              {formatDate(note.timestamp)}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}