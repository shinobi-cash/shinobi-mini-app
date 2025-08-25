import { Loader2, Wallet, ChevronRight, Circle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Note } from '@/lib/noteCache';
import { useNotes } from '@/hooks/data/useDepositDiscovery';
import { useAuth } from '@/contexts/AuthContext';
import { CONTRACTS } from '@/config/constants';
import { formatEthAmount, formatTimestamp } from '@/utils/formatters';

interface ListUnspentNotesProps {
  onNoteSelected: (note: Note) => void;
}

export const ListUnspentNotes = ({ onNoteSelected }: ListUnspentNotesProps) => {
  const { publicKey, accountKey } = useAuth(); 
  const poolAddress = CONTRACTS.ETH_PRIVACY_POOL; // Assuming this is defined in your constants

  // Use 10 minute cache to prevent excessive refetching when navigating back from withdrawal form
  const { data: noteDiscovery, loading: isDiscovering, error } = useNotes(publicKey!, poolAddress, accountKey!, 10 * 60 * 1000);

  // Get available unspent notes by filtering the 2D notes array.
  const availableNotes = (noteDiscovery?.notes || [])
    .map(noteChain => {
      // An unspent note is always the last note in a chain
      const lastNote = noteChain[noteChain.length - 1];
      // Only include the note if it is unspent
      return lastNote.status === 'unspent' ? lastNote : null;
    })
    .filter(Boolean) as Note[];

  if (isDiscovering) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-app-primary mb-1">Discovering Notes</h3>
        <p className="text-sm text-app-secondary">Scanning the blockchain for your privacy notes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <Circle className="w-6 h-6 text-red-600 dark:text-red-400 fill-current" />
        </div>
        <h3 className="text-base font-semibold text-app-primary mb-1">Discovery Failed</h3>
        <p className="text-sm text-app-secondary mb-6 text-center max-w-xs leading-relaxed">
          Unable to discover your notes. Check your connection and try again.
        </p>
        <Button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium active:scale-95 transition-all"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (availableNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
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
    <div className="flex flex-col h-full gap-4">
      {/* Notes Table */}
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        <div className="flex-shrink-0 bg-app-surface border-b border-app shadow-md">
          <h2 className="text-lg font-semibold py-3 text-app-secondary tracking-tight text-center">
            Withdraw Notes ({availableNotes.length})
          </h2>
        </div>
        {/* Scrollable Notes Table */}
        <div className="flex-1 flex flex-col bg-app-surface border border-app shadow-md overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {availableNotes.map((note) => (
              <NoteCard
                key={`${note.depositIndex}-${note.changeIndex}`}
                note={note}
                onSelect={() => onNoteSelected(note)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface NoteCardProps {
  note: Note;
  onSelect: () => void;
}

const NoteCard = ({ note, onSelect }: NoteCardProps) => {
  const noteLabel = note.changeIndex === 0
    ? `Deposit #${note.depositIndex}`
    : `Change #${note.depositIndex}.${note.changeIndex}`;

  return (
    <button
      className="w-full bg-app-surface border-b border-app px-3 py-3 sm:px-4 sm:py-4 active:bg-app-surface-hover transition-all duration-150 hover:bg-app-surface-hover text-left group"
      onClick={onSelect}
    >
      {/* Note Details */}
      <div className="flex-1 flex justify-between gap-2">
        {/* Left side: Type and amount */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-app-primary tracking-tight capitalize text-base sm:text-lg truncate">
            {noteLabel}
          </div>
          <div className="text-sm sm:text-base text-app-secondary font-medium tabular-nums">
            {`${formatEthAmount(note.amount, { maxDecimals: 6 })} ETH`}
          </div>
        </div>

        {/* Right side: Timestamp and status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <div className="text-xs sm:text-sm text-app-tertiary font-medium whitespace-nowrap">
              {formatTimestamp(note.timestamp)}
            </div>
          </div>
          {/* Arrow Indicator */}
          <ChevronRight className="w-5 h-5 text-app-secondary group-hover:text-app-primary transition-colors" />
        </div>
      </div>
    </button>
  );
};