import { useNavigation } from "@/contexts/NavigationContext";
import { WithdrawalForm } from "../features/withdrawal/WithdrawalForm";
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
          <WithdrawalForm asset={asset} />
        </AuthenticationGate>
      </ScreenContent>
    </>
  );
};
