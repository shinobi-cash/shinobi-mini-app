import React from 'react';
import { useAccount } from 'wagmi';
import { Wallet } from 'lucide-react';
import { WalletConnectionActions } from './WalletConnectionActions';

interface WalletGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const WalletGate = ({ 
  children,
  title = "Connect Wallet",
  description = "Connect your wallet to continue"
}: WalletGateProps) => {
  const { isConnected } = useAccount();
  
  if (isConnected) {
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