import { useNavigation } from "@/contexts/NavigationContext";
import { useModalWithSelection } from "@/hooks/ui/useModalState";
import type { Note } from "@/lib/storage/types";
import { ListUnspentNotes } from "../features/profile/ListUnspentNotes";
import { WithdrawNoteForm } from "../features/withdrawal/WithdrawNoteForm";
import { AuthenticationGate } from "../shared/AuthenticationGate";
import { ScreenHeader } from "../layout/ScreenHeader";
import { ScreenContent } from "../layout/ScreenLayout";

export const WithdrawalScreen = () => {
  const { currentAsset } = useNavigation();
  
  // Default to ETH if no asset context (fallback)
  const asset = currentAsset || { symbol: "ETH", name: "Ethereum", icon: "⚫" };
  
  const breadcrumbs = [
    { label: "Pool", screen: "home" as const }, 
    { label: asset.symbol }, 
    { label: "Withdraw" }
  ];

  return (
    <>
      <ScreenHeader breadcrumbs={breadcrumbs} backTo="home" />
      <ScreenContent>
        <AuthenticationGate
          title="Account Required"
          description="Create or load your account to access privacy features"
          context="withdraw"
        >
          <WithdrawalContent asset={asset} />
        </AuthenticationGate>
      </ScreenContent>
    </>
  );
};

const WithdrawalContent = ({ asset }: { asset: { symbol: string; name: string; icon: string } }) => {
  const noteModal = useModalWithSelection<Note>(false);

  // Show withdrawal form if a note is selected
  if (noteModal.selectedItem) {
    return <WithdrawNoteForm note={noteModal.selectedItem} asset={asset} onBack={noteModal.closeAndClear} />;
  }

  // Show list of unspent notes for selection
  return <ListUnspentNotes asset={asset} onNoteSelected={noteModal.openWith} />;
};
