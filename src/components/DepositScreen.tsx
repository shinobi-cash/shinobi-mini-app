import { useAccount, useBalance, useChainId } from 'wagmi';
import { AuthenticationGate } from './shared/AuthenticationGate';
import { WalletGate } from './shared/WalletGate';
import { ChevronDown, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { NETWORK, DEFAULT_DEPOSIT_AMOUNTS, isCorrectNetwork } from '../config/contracts';
import { useDepositCommitment } from '../hooks/useDepositCommitment';
import { useDepositTransaction } from '../hooks/useDepositTransaction';
import { toast } from 'sonner';

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
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const [amount, setAmount] = useState('');
  const [selectedAsset] = useState({ symbol: 'ETH', name: 'Ethereum', icon: '⚫' });
  
  const isOnCorrectNetwork = isCorrectNetwork(chainId);
  const commitmentData = useDepositCommitment();
  const { 
    deposit, 
    reset,
    clearError,
    isLoading, 
    isConfirming, 
    isSuccess, 
    error, 
    transactionHash 
  } = useDepositTransaction();

  // Handle transaction errors with toast
  useEffect(() => {
    if (error) {
      toast.error('Transaction Failed', {
        description: error,
        duration: 5000,
      });
    }
  }, [error]);

  // Handle transaction success with toast and auto-reset
  useEffect(() => {
    if (isSuccess && transactionHash) {
      toast.success('Deposit Successful!', {
        description: (
          <div className="flex items-center gap-2">
            <span>Transaction confirmed</span>
            <a 
              href={`${NETWORK.EXPLORER_URL}/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ),
        duration: 7000,
      });
      
      // Reset form for next deposit
      setTimeout(() => {
        reset();
        setAmount('');
      }, 1000);
    }
  }, [isSuccess, transactionHash, reset]);

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleQuickAmount = (quickAmount: string) => {
    setAmount(quickAmount);
  };

  const handleDeposit = async () => {
    if (!commitmentData || !amount) return;
    
    // Clear any previous errors
    clearError();
    
    try {
      await deposit(amount, commitmentData);
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const isValidAmount = amount && parseFloat(amount) > 0;
  const hasBalance = balance && parseFloat(formatEther(balance.value)) > 0;
  const hasCommitmentData = commitmentData !== null;
  const isTransacting = isLoading || isConfirming;
  const canDeposit = isValidAmount && hasBalance && parseFloat(amount) <= parseFloat(formatEther(balance?.value || 0n)) && isOnCorrectNetwork && hasCommitmentData && !isTransacting;

  return (
    <div className="h-full flex flex-col px-4 py-4">
      {/* Header with wallet info */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-app-primary">Deposit</h1>
        <p className="text-xs text-app-secondary mt-1 font-mono">
          {address}
        </p>
      </div>

      {/* Asset Selection */}
      <div className="mb-4">
        <div className="bg-app-card rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs">
                {selectedAsset.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-app-primary">{selectedAsset.name}</p>
                <p className="text-xs text-app-secondary">{selectedAsset.symbol}</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-app-secondary opacity-50" />
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <div className="text-center mb-3">
          <input
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="text-3xl font-light text-center bg-transparent border-none outline-none text-app-primary placeholder-app-secondary w-full"
          />
          <p className="text-base text-app-secondary mt-1">{selectedAsset.symbol}</p>
        </div>
        
        {/* Quick Amount Buttons */}
        <div className="flex gap-2 justify-center">
          {DEFAULT_DEPOSIT_AMOUNTS.map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(quickAmount)}
              className="rounded-full px-3 py-1 text-xs"
            >
              {quickAmount}
            </Button>
          ))}
        </div>
      </div>

      {/* Network Warning */}
      {!isOnCorrectNetwork && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                Wrong Network
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Please switch to {NETWORK.NAME}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balance Info */}
      <div className="bg-app-card rounded-xl p-3 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-app-secondary">Available</span>
          <span className="text-app-primary font-medium">
            {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ${selectedAsset.symbol}` : `0.000 ${selectedAsset.symbol}`}
          </span>
        </div>
      </div>




      {/* Deposit Button */}
      <div className="mt-auto">
        <Button
          disabled={!canDeposit}
          onClick={handleDeposit}
          className="w-full h-11 rounded-xl text-sm font-medium"
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing Transaction...
            </div>
          ) : isConfirming ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirming...
            </div>
          ) : !hasCommitmentData
          ? 'Authentication Required'
          : !isOnCorrectNetwork 
          ? `Switch to ${NETWORK.NAME}`
          : !hasBalance 
          ? 'Insufficient Balance' 
          : !isValidAmount 
          ? 'Enter Amount' 
          : 'Deposit to Privacy Pool'
          }
        </Button>
      </div>
    </div>
  );
};