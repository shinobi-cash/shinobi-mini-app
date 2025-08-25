import { useState } from 'react';
import { AuthenticationGate } from '../shared/AuthenticationGate';
import { ListUnspentNotes } from '../features/profile/ListUnspentNotes';
import { WithdrawNoteForm } from '../features/withdrawal/WithdrawNoteForm';
import { Note } from '@/lib/noteCache';

export const WithdrawalScreen = () => {
  return (
    <AuthenticationGate
      title="Account Required"
      description="Create or load your account to access privacy features"
      context="withdraw"
    >
      <WithdrawalContent />
    </AuthenticationGate>
  );
};

const WithdrawalContent = () => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Show withdrawal form if a note is selected
  if (selectedNote) {
    return (
      <WithdrawNoteForm 
        note={selectedNote} 
        onBack={() => setSelectedNote(null)} 
      />
    );
  }

  // Show list of unspent notes for selection
  return (
    <ListUnspentNotes 
      onNoteSelected={setSelectedNote}
    />
  );
};