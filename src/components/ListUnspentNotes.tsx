import { Loader2, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Note } from '@/lib/noteCache';
import { useNotes } from '@/hooks/useDepositDiscovery';
import { useAuth } from '@/contexts/AuthContext';
import { CONTRACTS } from '@/config/constants';

interface ListUnspentNotesProps {
  onNoteSelected: (note: Note) => void;
}

export const ListUnspentNotes = ({ onNoteSelected }: ListUnspentNotesProps) => {
  const { publicKey, accountKey } = useAuth(); 
  const poolAddress = CONTRACTS.ETH_PRIVACY_POOL; // Assuming this is defined in your constants

  const { data: noteDiscovery, loading: isDiscovering, error } = useNotes(publicKey!, poolAddress, accountKey!);

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
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-sm text-app-secondary">Discovering your notes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-app-primary mb-2">Discovery Error</h3>
        <p className="text-sm text-app-secondary mb-4 text-center max-w-sm">
          {error.message}
        </p>
        <Button 
          onClick={() => window.location.reload()} // A simple way to trigger a re-render and re-fetch
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (availableNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-app-primary mb-2">No Notes Available</h3>
        <p className="text-sm text-app-secondary text-center max-w-sm">
          You don't have any unspent notes to withdraw from. Make a deposit first to create notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-app-primary">Select Note to Withdraw</h2>
          <p className="text-sm text-app-secondary">
            Choose one of your {availableNotes.length} available note{availableNotes.length > 1 ? 's' : ''}
          </p>
        </div>
        {/* The useNotes hook doesn't expose a refreshNotes method, so a full page reload is a simple fallback */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.reload()}
          disabled={isDiscovering}
        >
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {availableNotes.map((note) => (
          <NoteCard
            key={`${note.depositIndex}-${note.changeIndex}`}
            note={note}
            onSelect={() => onNoteSelected(note)}
          />
        ))}
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
    ? `Deposit Note #${note.depositIndex}`
    : `Change Note #${note.depositIndex}.${note.changeIndex}`;

  return (
    <div 
      className="p-4 border border-app rounded-xl bg-app-surface hover:bg-app-surface-hover transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-sm font-medium text-green-700">
              {note.changeIndex === 0 ? 'D' : 'C'}
            </span>
          </div>
          <div>
            <p className="font-medium text-app-primary">{note.amount} ETH</p>
            <p className="text-xs text-app-secondary">
              {noteLabel} • Available for withdrawal
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <div className="w-1 h-1 rounded-full bg-green-500" />
            Unspent
          </div>
          <p className="text-xs text-app-secondary mt-1">
            Tap to withdraw
          </p>
        </div>
      </div>
    </div>
  );
};