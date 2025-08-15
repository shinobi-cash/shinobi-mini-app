import { useConnect, useAccount } from 'wagmi';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

export const WalletConnectionActions = () => {
  const { connect, connectors, isPending } = useConnect();
  const { isConnecting } = useAccount();

  const handleConnect = () => {
    // Use the Farcaster Mini App connector
    const farcasterConnector = connectors[0]; 
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  };

  const isLoading = isPending || isConnecting;

  return (
    <div className="w-full max-w-sm space-y-3">
      <Button
        variant="default"
        className="w-full h-12 text-base font-medium rounded-2xl"
        onClick={handleConnect}
        disabled={isLoading}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          'Connect Wallet'
        )}
      </Button>
      
      {connectors.length > 0 && (
        <p className="text-xs text-center text-app-secondary">
          Connect your wallet to proceed with deposits
        </p>
      )}
    </div>
  );
};