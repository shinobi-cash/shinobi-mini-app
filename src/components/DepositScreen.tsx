import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { AuthenticationGate } from './shared/AuthenticationGate';
import { WalletGate } from './shared/WalletGate';
import { LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { formatEther } from 'viem';

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
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [amount, setAmount] = useState('');

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleQuickAmount = (quickAmount: string) => {
    setAmount(quickAmount);
  };

  const isValidAmount = amount && parseFloat(amount) > 0;
  const hasBalance = balance && parseFloat(formatEther(balance.value)) > 0;
  const canDeposit = isValidAmount && hasBalance && parseFloat(amount) <= parseFloat(formatEther(balance?.value || 0n));

  return (
    <div className="h-full flex flex-col px-4 py-6">
      {/* Header with wallet info */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-app-primary">Deposit</h1>
          <p className="text-sm text-app-secondary mt-1">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => disconnect()}
          className="text-app-secondary hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Amount Input */}
      <div className="mb-8">
        <div className="text-center mb-4">
          <input
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="text-4xl font-light text-center bg-transparent border-none outline-none text-app-primary placeholder-app-secondary w-full"
          />
          <p className="text-lg text-app-secondary mt-2">ETH</p>
        </div>
        
        {/* Quick Amount Buttons */}
        <div className="flex gap-2 justify-center">
          {['0.001', '0.01', '0.1'].map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(quickAmount)}
              className="rounded-full px-4 py-1 text-sm"
            >
              {quickAmount}
            </Button>
          ))}
        </div>
      </div>

      {/* Balance Info */}
      <div className="bg-app-card rounded-2xl p-4 mb-8">
        <div className="flex justify-between text-sm">
          <span className="text-app-secondary">Available</span>
          <span className="text-app-primary font-medium">
            {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ETH` : '0.000 ETH'}
          </span>
        </div>
      </div>

      {/* Deposit Button */}
      <div className="mt-auto">
        <Button
          disabled={!canDeposit}
          className="w-full h-12 rounded-2xl text-base font-medium"
          size="lg"
        >
          {!hasBalance ? 'Insufficient Balance' : !isValidAmount ? 'Enter Amount' : 'Deposit to Privacy Pool'}
        </Button>
      </div>
    </div>
  );
};