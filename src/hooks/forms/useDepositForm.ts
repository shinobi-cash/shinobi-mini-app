import { useState, useCallback } from "react";
import { useFormValidation, validationRules } from "./useFormValidation";
import { formatEther } from "viem";

interface DepositFormData {
  amount: string;
}

interface UseDepositFormProps {
  balance:
    | {
        value: bigint;
        decimals: number;
        formatted: string;
        symbol: string;
      }
    | undefined;
}

export function useDepositForm({ balance }: UseDepositFormProps) {
  const [selectedAsset] = useState({ symbol: "ETH", name: "Ethereum", icon: "⚫" });

  // Calculate available balance for validation
  const availableBalance = balance && balance.value ? parseFloat(formatEther(balance.value)) : 0;

  const formConfig = {
    amount: {
      rules: [
        validationRules.required("Please enter an amount"),
        validationRules.decimalString(),
        validationRules.positiveNumber(),
        validationRules.maxAmount(availableBalance, `Amount cannot exceed ${availableBalance.toFixed(4)} ETH`),
      ],
      initialValue: "",
    },
  };

  const form = useFormValidation<DepositFormData>(formConfig);

  // Handle amount input validation (only allow decimal numbers)
  const handleAmountChange = useCallback(
    (value: string) => {
      // Only allow numbers and decimal point
      if (/^\d*\.?\d*$/.test(value)) {
        form.setValue("amount", value);
      }
    },
    [form],
  );

  // Handle quick amount selection
  const handleQuickAmount = useCallback(
    (quickAmount: string) => {
      form.setValue("amount", quickAmount);
    },
    [form],
  );

  // Get computed values
  const amountNum = parseFloat(form.values.amount) || 0;

  // Validation checks for UI feedback
  const isValidAmount = amountNum > 0 && amountNum <= availableBalance;
  const hasBalance = balance && balance.value ? parseFloat(formatEther(balance.value)) > 0 : false;
  const hasNoteData = (noteData: any) => noteData !== null;

  // Check if deposit can be executed
  const canDeposit = (isOnCorrectNetwork: boolean, noteData: any, isTransacting: boolean) => {
    return (
      isValidAmount &&
      hasBalance &&
      amountNum <= availableBalance &&
      isOnCorrectNetwork &&
      hasNoteData(noteData) &&
      !isTransacting
    );
  };

  return {
    // Form state
    amount: form.values.amount,
    errors: form.errors,
    touched: form.touched,

    // Asset selection
    selectedAsset,

    // Computed values
    amountNum,
    availableBalance,
    isValidAmount,
    hasBalance,
    isFormValid: form.isFormValid && isValidAmount,

    // Actions
    handleAmountChange,
    handleQuickAmount,
    setFieldTouched: form.setFieldTouched,
    validateAll: form.validateAll,
    reset: form.reset,
    canDeposit,
  };
}
