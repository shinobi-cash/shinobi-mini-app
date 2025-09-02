import { useModalWithSelection } from "@/hooks/ui/useModalState";
import type { Note } from "@/lib/storage/types";
import { ListUnspentNotes } from "../features/profile/ListUnspentNotes";
import { WithdrawNoteForm } from "../features/withdrawal/WithdrawNoteForm";
import { AuthenticationGate } from "../shared/AuthenticationGate";

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
  const noteModal = useModalWithSelection<Note>(false);

  // Show withdrawal form if a note is selected
  if (noteModal.selectedItem) {
    return <WithdrawNoteForm note={noteModal.selectedItem} onBack={noteModal.closeAndClear} />;
  }

  // Show list of unspent notes for selection
  return <ListUnspentNotes onNoteSelected={noteModal.openWith} />;
};
