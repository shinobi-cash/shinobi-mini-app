import { useBanner } from "@/contexts/BannerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, useChainId } from "wagmi";
import { NETWORK } from "../../config/constants";
import { useDepositCommitment } from "@/hooks/transactions/useDepositCommitment";
import { useDepositTransaction } from "../../hooks/transactions/useDepositTransaction";
import { AuthenticationGate } from "../shared/AuthenticationGate";
import { WalletGate } from "../shared/WalletGate";
import { Button } from "../ui/button";

const DEPOSIT_AMOUNTS = [
  { value: "0.01", label: "0.01 ETH" },
  { value: "0.05", label: "0.05 ETH" },
  { value: "0.1", label: "0.1 ETH" },
  { value: "0.5", label: "0.5 ETH" },
];

export const DepositScreen = () => {
  return (
    <AuthenticationGate
      title="Account Required"
      description="Create or load your account to access privacy features"
      context="deposit"
    >
      <WalletGate title="Connect Wallet" description="Connect your wallet to fund privacy pool deposits">
        <DepositForm />
      </WalletGate>
    </AuthenticationGate>
  );
};

const DepositForm = () => {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const shownBannersRef = useRef(new Set<string>());
  const { trackTransaction } = useTransactionTracking();
  const { banner } = useBanner();

  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string>("");

  const availableBalance = balance?.value ?? 0n;
  const selectedAsset = { symbol: "ETH", name: "Ethereum", icon: "⚫" };

  // ---- Validation ----
  const validateAmount = useCallback(
    (value: string): string => {
      if(value.length === 0 ) return "";
      if (!value.trim()) return "Please enter an amount";
      try {
        const parsed = parseEther(value);
        if (parsed <= 0n) return "Amount must be positive";
        if (parsed > availableBalance)
          return `Amount cannot exceed ${formatEther(availableBalance)} ETH`;
        return "";
      } catch {
        return "Please enter a valid amount";
      }
    },
    [availableBalance]
  );

  // Keep state + error synced
  const handleAmountChange = useCallback(
    (value: string) => {
      setAmount(value);
      setAmountError(validateAmount(value));
    },
    [validateAmount]
  );

  const handleQuickAmount = useCallback(
    (quickAmount: string) => {
      setAmount(quickAmount);
      setAmountError(validateAmount(quickAmount));
    },
    [validateAmount]
  );

  const { publicKey, accountKey } = useAuth();
  const isOnCorrectNetwork = chainId === NETWORK.CHAIN_ID;
  const { noteData, isGeneratingNote, error: noteError, regenerateNote } =
    useDepositCommitment(publicKey, accountKey);
  const {
    deposit,
    reset,
    clearError,
    isLoading,
    isSuccess,
    error,
    transactionHash,
  } = useDepositTransaction();

  // Banner for tx error
  useEffect(() => {
    if (error) banner.error("Transaction failed");
  }, [error, banner]);

  // Retry note silently
  useEffect(() => {
    if (noteError) {
      console.warn("Note generation failed, auto-retrying:", noteError);
      setTimeout(() => regenerateNote(), 1000);
    }
  }, [noteError, regenerateNote]);

  // Success handler
  useEffect(() => {
    if (isSuccess && transactionHash && !shownBannersRef.current.has(transactionHash)) {
      shownBannersRef.current.add(transactionHash);
      trackTransaction(transactionHash);
      setTimeout(() => {
        reset();
        setAmount("");
        setAmountError("");
      }, 1000);
    }
  }, [isSuccess, transactionHash, reset, trackTransaction]);

  // Deposit
  const handleDeposit = async () => {
    if (!noteData || !amount || amountError) return;
    clearError();
    try {
      await deposit(amount, noteData);
    } catch (err) {
      console.error("Deposit failed:", err);
    }
  };

  // Derived flags
  const isTransacting = isLoading;
  const hasNoteData = !!noteData;
  const hasBalance = availableBalance > 0n;
  const canMakeDeposit =
    !amountError && amount.trim() && isOnCorrectNetwork && hasNoteData && hasBalance && !isTransacting;

  return (
    <div className="h-full flex flex-col px-4 py-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-app-primary">Deposit</h1>
        <p className="text-xs text-app-secondary mt-1 font-mono">{address}</p>
      </div>

      {/* Asset */}
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

      {/* Amount */}
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

        {/* Quick Buttons */}
        <div className="flex gap-2 justify-center">
          {DEPOSIT_AMOUNTS.map((deposit) => (
            <Button
              key={deposit.value}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(deposit.value)}
              className="rounded-full px-3 py-1 text-xs"
            >
              {deposit.label}
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
              <p className="text-xs font-medium text-orange-800 dark:text-orange-200">Wrong Network</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Please switch to {NETWORK.NAME}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balance */}
      <div className="bg-app-card rounded-xl p-3 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-app-secondary">Available</span>
          <span className="text-app-primary font-medium">
            {balance
              ? `${Number.parseFloat(formatEther(balance.value)).toFixed(4)} ${selectedAsset.symbol}`
              : `0.000 ${selectedAsset.symbol}`}
          </span>
        </div>
      </div>

       {/* Inline error */}
        {amountError && (
          <p className="text-xs text-red-500 text-center mt-2">{amountError}</p>
        )}

      {/* Button */}
      <div className="mt-auto">
        <Button
          disabled={!canMakeDeposit}
          onClick={handleDeposit}
          className="w-full h-11 rounded-xl text-sm font-medium"
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing Transaction...
            </div>
          ) : isGeneratingNote || !hasNoteData ? (
            "Preparing..."
          ) : !isOnCorrectNetwork ? (
            `Switch to ${NETWORK.NAME}`
          ) : !hasBalance ? (
            "Insufficient Balance"
          ) : amountError ? (
            "Enter Amount"
          ) : (
            "Deposit to Privacy Pool"
          )}
        </Button>
      </div>
    </div>
  );
};

