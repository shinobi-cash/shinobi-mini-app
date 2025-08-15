import { useConnect } from 'wagmi';
import { Button } from '../ui/button';

export const WalletConnectionActions = () => {
  const { connect, connectors } = useConnect();

  const handleConnect = () => {
    // Use the first available connector (should be farcasterFrame from wagmi config)
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  return (
    <div className="w-full max-w-sm space-y-3">
      <Button
        variant="default"
        className="w-full h-12 text-base font-medium rounded-2xl"
        onClick={handleConnect}
        size="lg"
      >
        Connect Wallet
      </Button>
    </div>
  );
};