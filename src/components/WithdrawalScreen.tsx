import { useState } from 'react';
import { AuthenticationGate } from './shared/AuthenticationGate';
import { ListUnspentNotes } from './ListUnspentNotes';
import { WithdrawNoteForm } from './WithdrawNoteForm';
import { DiscoveredNote } from '@/lib/noteCache';

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
  const [selectedNote, setSelectedNote] = useState<DiscoveredNote | null>(null);

  // Show withdrawal form if a note is selected
  if (selectedNote) {
    return (
      <WithdrawNoteForm 
        noteData={selectedNote} 
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