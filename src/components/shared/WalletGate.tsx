import { useAccount, useDisconnect } from 'wagmi';
import { Wallet, CheckCircle, ExternalLink } from 'lucide-react';
import { WalletConnectionActions } from './WalletConnectionActions';
import { Button } from '../ui/button';

interface WalletGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showWalletInfo?: boolean;
}

export const WalletGate = ({ 
  children,
  title = "Connect Wallet",
  description = "Connect your wallet to continue",
  showWalletInfo = false
}: WalletGateProps) => {
  const { isConnected, address, connector } = useAccount();
  const { disconnect } = useDisconnect();
  
  if (isConnected) {
    // Show wallet info briefly if requested, then show children
    if (showWalletInfo) {
      return (
        <div className="h-full flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          
          <h2 className="text-xl font-bold mb-2 text-center text-app-primary">
            Wallet Connected
          </h2>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 max-w-sm w-full">
            <p className="text-sm text-app-secondary mb-1">Connected Account</p>
            <p className="text-sm font-mono text-app-primary break-all">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
            <p className="text-xs text-app-secondary mt-1">
              via {connector?.name}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => disconnect()}
            >
              Disconnect
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(`https://basescan.org/address/${address}`, '_blank')}
            >
              View on Explorer
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      );
    }
    
    return <>{children}</>;
  }
  
  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
        <Wallet className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      
      <h2 className="text-xl font-bold mb-2 text-center text-app-primary">
        {title}
      </h2>
      
      <p className="text-base mb-8 text-center text-app-secondary max-w-sm">
        {description}
      </p>
      
      <WalletConnectionActions />
    </div>
  );
};