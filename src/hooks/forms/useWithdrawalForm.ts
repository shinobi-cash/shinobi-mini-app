import type { Note } from "@/lib/storage/noteCache";
import { formatEthAmount } from "@/utils/formatters";
import { useCallback } from "react";
import { useFormValidation, validationRules } from "./useFormValidation";

interface WithdrawalFormData {
  withdrawAmount: string;
  recipientAddress: string;
}

interface UseWithdrawalFormProps {
  note: Note;
}

export function useWithdrawalForm({ note }: UseWithdrawalFormProps) {
  // Calculate available balance for validation
  const availableBalance = Number.parseFloat(formatEthAmount(note.amount));

  const formConfig = {
    withdrawAmount: {
      rules: [
        validationRules.required("Please enter an amount"),
        validationRules.decimalString(),
        validationRules.positiveNumber(),
        validationRules.maxAmount(availableBalance, `Amount cannot exceed ${formatEthAmount(note.amount)} ETH`),
      ],
      initialValue: "",
    },
    recipientAddress: {
      rules: [validationRules.required("Please enter a recipient address"), validationRules.ethereumAddress()],
      initialValue: "",
    },
  };

  const form = useFormValidation<WithdrawalFormData>(formConfig);

  // Handle amount input validation (only allow decimal numbers)
  const handleAmountChange = useCallback(
    (value: string) => {
      // Only allow numbers and decimal point
      if (/^\d*\.?\d*$/.test(value)) {
        form.setValue("withdrawAmount", value);
      }
    },
    [form],
  );

  // Handle max button
  const handleMaxClick = useCallback(() => {
    form.setValue("withdrawAmount", availableBalance.toString());
  }, [form, availableBalance]);

  // Handle percentage buttons
  const handlePercentageClick = useCallback(
    (percentage: number) => {
      const amount = (availableBalance * percentage).toString();
      form.setValue("withdrawAmount", amount);
    },
    [form, availableBalance],
  );

  // Get computed values
  const withdrawAmountNum = Number.parseFloat(form.values.withdrawAmount) || 0;

  // Basic validation checks for UI feedback
  const isValidAmount = withdrawAmountNum > 0 && withdrawAmountNum <= availableBalance;
  const isValidRecipient = form.isFieldValid("recipientAddress");

  return {
    // Form state
    withdrawAmount: form.values.withdrawAmount,
    recipientAddress: form.values.recipientAddress,
    errors: form.errors,
    touched: form.touched,

    // Computed values
    withdrawAmountNum,
    availableBalance,
    isValidAmount,
    isValidRecipient,
    isFormValid: form.isFormValid && isValidAmount,

    // Actions
    handleAmountChange,
    setRecipientAddress: (value: string) => form.setValue("recipientAddress", value),
    handleMaxClick,
    handlePercentageClick,
    setFieldTouched: form.setFieldTouched,
    validateAll: form.validateAll,
    reset: form.reset,
  };
}
