import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useDepositCommitment } from "@/hooks/transactions/useDepositCommitment";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { showToast } from "@/lib/toast";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, useChainId } from "wagmi";
import { NETWORK } from "../../config/constants";
import { useDepositTransaction } from "../../hooks/transactions/useDepositTransaction";
import { ScreenHeader } from "../layout/ScreenHeader";
import { ScreenContent } from "../layout/ScreenLayout";
import { Button } from "../ui/button";

const DEPOSIT_AMOUNTS = [
  { value: "0.01", label: "0.01 ETH" },
  { value: "0.05", label: "0.05 ETH" },
  { value: "0.1", label: "0.1 ETH" },
  { value: "0.5", label: "0.5 ETH" },
];

export const DepositScreen = () => {
  const { currentAsset } = useNavigation();

  // Default to ETH if no asset context (fallback)
  const asset = currentAsset || { symbol: "ETH", name: "Ethereum", icon: "⚫" };

  const breadcrumbs = [
    { label: "Pool", screen: "home" as const },
    { label: asset.symbol },
    { label: "Deposit" },
  ];

  return (
    <>
      <ScreenHeader breadcrumbs={breadcrumbs} backTo="home" />
      <ScreenContent>
        <DepositForm asset={asset} />
      </ScreenContent>
    </>
  );
};

const DepositForm = ({ asset }: { asset: { symbol: string; name: string; icon: string } }) => {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { trackTransaction } = useTransactionTracking();
  const { publicKey, accountKey } = useAuth();

  const [amount, setAmount] = useState("");

  const availableBalance = balance?.value ?? 0n;

  // ---- Validation ----
  const validateAmount = useCallback(
    (value: string): string => {
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
    [availableBalance],
  );

  const amountError = amount ? validateAmount(amount) : "";

  // ---- Quick Inputs ----
  const handleAmountChange = useCallback((value: string) => {
    setAmount(value);
  }, []);

  const handleQuickAmount = useCallback((quickAmount: string) => {
    setAmount(quickAmount);
  }, []);

  // ---- Transaction Hooks ----
  const isOnCorrectNetwork = chainId === NETWORK.CHAIN_ID;
  const { noteData, isGeneratingNote, error: noteError, regenerateNote } = useDepositCommitment(
    publicKey,
    accountKey,
  );
  const {
    deposit,
    reset,
    clearError,
    isLoading,
    isSuccess,
    error,
    transactionHash,
  } = useDepositTransaction();

  // ---- Error + Success Tracking ----
  const shownErrorsRef = useRef(new Set<string>());
  const shownTxsRef = useRef(new Set<string>());

  // Transaction error toast
  useEffect(() => {
    if (error && !shownErrorsRef.current.has(error)) {
      shownErrorsRef.current.add(error);
      showToast.error("Transaction failed", { duration: 5000 });
    }
  }, [error]);

  // Retry note silently (with cleanup)
  useEffect(() => {
    if (!noteError) return;
    console.warn("Note generation failed, auto-retrying:", noteError);
    const timer = setTimeout(() => regenerateNote(), 1000);
    return () => clearTimeout(timer);
  }, [noteError, regenerateNote]);

  // Success handler
  useEffect(() => {
    if (isSuccess && transactionHash && !shownTxsRef.current.has(transactionHash)) {
      shownTxsRef.current.add(transactionHash);
      trackTransaction(transactionHash);

      setTimeout(() => {
        reset();
        setAmount("");
      }, 1000);
    }
  }, [isSuccess, transactionHash, reset, trackTransaction]);

  // ---- Deposit Action ----
  const handleDeposit = () => {
    if (!noteData || !amount || amountError) return;
    clearError();
    shownErrorsRef.current.clear();
    deposit(amount, noteData);
  };

  // ---- Derived Flags ----
  const isTransacting = isLoading;
  const hasNoteData = !!noteData;
  const hasBalance = availableBalance > 0n;
  const canMakeDeposit =
    !amountError &&
    amount.trim() &&
    isOnCorrectNetwork &&
    hasNoteData &&
    hasBalance &&
    !isTransacting;

  // ---- Button Label ----
  const getButtonLabel = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparing Transaction...
        </div>
      );
    }
    if (isGeneratingNote || !hasNoteData) return "Preparing...";
    if (!isOnCorrectNetwork) return `Switch to ${NETWORK.NAME}`;
    if (!hasBalance) return "Insufficient Balance";
    if (amountError) return "Enter Amount";
    return "Deposit to Pool";
  };

  return (
    <div className="h-full flex flex-col px-4 py-4">
      {/* Connected Address */}
      <div className="mb-6">
        <p className="text-xs text-app-secondary font-bold mb-1">Connected Address</p>
        <p className="text-xs text-app-primary font-mono">{address}</p>
      </div>

      {/* Amount */}
      <div className="mb-6">
        <div className="text-center mb-3">
          <input
            type="text"
            id="amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={`text-3xl font-light text-center bg-transparent border-none outline-none placeholder-app-secondary w-full ${
              amountError ? "text-red-500" : "text-app-primary"
            }`}
          />
          <p className="text-base text-app-primary mt-1">{asset.symbol}</p>
        </div>

        {/* Quick Buttons */}
        <div className="flex gap-2 justify-center">
          {DEPOSIT_AMOUNTS.map((deposit) => (
            <Button
              key={deposit.value}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(deposit.value)}
              className="rounded-full px-2 py-1 text-xs"
            >
              {deposit.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Network Warning */}
      {!isOnCorrectNetwork && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-2 mb-4">
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
      <div className="bg-app-card rounded-xl p-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-app-secondary font-bold">Available</span>
          <span className="text-app-primary font-medium">
            {balance
              ? `${Number.parseFloat(formatEther(balance.value)).toFixed(4)} ${asset.symbol}`
              : `0.000 ${asset.symbol}`}
          </span>
        </div>
      </div>

      {/* Button */}
      <div className="mt-auto">
        <Button
          disabled={!canMakeDeposit}
          onClick={handleDeposit}
          className="w-full h-11 rounded-xl text-sm font-medium"
          size="lg"
        >
          {getButtonLabel()}
        </Button>
      </div>
    </div>
  );
};
