import { useAccount, useDisconnect } from 'wagmi';
import { AuthenticationGate } from './shared/AuthenticationGate';
import { WalletGate } from './shared/WalletGate';
import { CheckCircle, Wallet, LogOut } from 'lucide-react';
import { Button } from './ui/button';

export const DepositScreen = () => {
  return (
    <AuthenticationGate
      title="Deposit to Privacy Pool"
      description="Create or load your account to start making private deposits"
      context="deposit"
    >
      <WalletGate
        title="Connect Wallet"
        description="Connect your wallet to fund privacy pool deposits"
      >
        <DepositForm />
      </WalletGate>
    </AuthenticationGate>
  );
};

const DepositForm = () => {
  const { address, connector, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      {/* Connection Status */}
      <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>

      <h2 className="text-xl font-bold mb-2 text-center text-app-primary">
        Ready to Deposit!
      </h2>
      
      {/* Wallet Info */}
      {isConnected && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 max-w-sm w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-app-secondary" />
              <p className="text-sm text-app-secondary">Connected Wallet</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => disconnect()}
              className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Disconnect
            </Button>
          </div>
          <p className="text-sm font-mono text-app-primary break-all">
            {address?.slice(0, 8)}...{address?.slice(-6)}
          </p>
          <p className="text-xs text-app-secondary mt-1">
            via {connector?.name}
          </p>
        </div>
      )}

      <p className="text-base text-center text-app-secondary mb-4">
        Wallet connected successfully! Deposit form will be implemented next.
      </p>
      
      <div className="text-xs text-center text-app-secondary bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 max-w-sm">
        <p className="font-medium mb-1">Next Steps:</p>
        <p>• Check available nullifiers</p>
        <p>• Implement deposit amount input</p>
        <p>• Add privacy pool integration</p>
      </div>
    </div>
  );
};