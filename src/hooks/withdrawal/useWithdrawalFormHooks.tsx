import { NETWORK } from "@/config/constants";
import { useCachedNotes } from "@/hooks/notes/useCachedNotes";
import type { Note } from "@/lib/storage/types";
import { formatEthAmount } from "@/utils/formatters";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAddress, parseEther } from "viem";
// import { CONTRACTS } from "@/config/constants";

// interface UseWithdrawalFormStateProps {
//   note: Note | null;
//   asset: { symbol: string };
// }

interface WithdrawalFormState {
  withdrawAmount: string;
  toAddress: string;
  destinationChainId:number
}

interface WithdrawalValidationErrors {
  amount: string;
  toAddress: string;
}

// Form state and validation hook
export const useWithdrawalFormState = (selectedNote: Note | null, asset: { symbol: string }) => {
  const [form, setForm] = useState<WithdrawalFormState>({
    withdrawAmount: "",
    toAddress: "",
    destinationChainId: NETWORK.CHAIN_ID
  });
  const [validationErrors, setValidationErrors] = useState<WithdrawalValidationErrors>({
    amount: "",
    toAddress: "",
  });

  const availableBalance = useMemo(
    () => (selectedNote ? Number.parseFloat(formatEthAmount(selectedNote.amount)) : 0),
    [selectedNote],
  );
  

  const validateAmount = useCallback(
    (value: string): string => {
      if (!selectedNote) return "Please select a note first";
      if (!value.trim()) return "";
      try {
        const parsed = parseEther(value);
        if (parsed <= 0n) return "Amount must be positive";
        const num = Number.parseFloat(value);
        if (num > availableBalance) {
          return `Amount cannot exceed ${formatEthAmount(selectedNote.amount)} ${asset.symbol}`;
        }
        return "";
      } catch {
        return "Please enter a valid amount";
      }
    },
    [availableBalance, selectedNote, asset.symbol],
  );

  const validateAddress = useCallback((value: string): string => {
    if (!value.trim()) return "";
    if (!isAddress(value)) return "Please enter a valid Ethereum address";
    return "";
  }, []);

  const handleAmountChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, withdrawAmount: value }));
      setValidationErrors((prev) => ({
        ...prev,
        amount: validateAmount(value),
      }));
    },
    [validateAmount],
  );

  const handleAddressChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, toAddress: value }));
      setValidationErrors((prev) => ({
        ...prev,
        toAddress: validateAddress(value),
      }));
    },
    [validateAddress],
  );

  const handleMaxClick = useCallback(() => {
    if (!selectedNote) return;
    const maxValue = availableBalance.toString();
    setForm((prev) => ({ ...prev, withdrawAmount: maxValue }));
    setValidationErrors((prev) => ({
      ...prev,
      amount: validateAmount(maxValue),
    }));
  }, [availableBalance, validateAmount, selectedNote]);

  const handleDestinationChainChange = useCallback((chainId: number) => {
    setForm(prev => ({ 
      ...prev, 
      destinationChainId: chainId,
      // Clear address when switching chains for UX
      toAddress: chainId !== NETWORK.CHAIN_ID ? '' : prev.toAddress 
    }));
    // Clear address validation error when switching chains
    if (chainId !== NETWORK.CHAIN_ID) {
      setValidationErrors(prev => ({ ...prev, toAddress: '' }));
    }
  }, []);

  const resetForm = useCallback(() => {
    setForm({ withdrawAmount: "", toAddress: "", destinationChainId:NETWORK.CHAIN_ID });
    setValidationErrors({ amount: "", toAddress: "" });
  }, []);

  useEffect(() => {
    // Re-validate amount when selected note changes
    if (form.withdrawAmount && selectedNote) {
      setValidationErrors((prev) => ({
        ...prev,
        amount: validateAmount(form.withdrawAmount),
      }));
    }
  }, [selectedNote, form.withdrawAmount, validateAmount]);

  return {
    form,
    validationErrors,
    handleAmountChange,
    handleAddressChange,
    handleMaxClick,
    handleDestinationChainChange,
    resetForm,
  };
};

// Note selection and discovery hook
export const useNoteSelection = (publicKey: string, poolAddress: string, preSelectedNote?: Note | null) => {
  const { data: noteDiscovery, loading: isLoadingNotes } = useCachedNotes(publicKey, poolAddress);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isNoteDropdownOpen, setIsNoteDropdownOpen] = useState(false);

  const availableNotes = useMemo(() => {
    return (
      (noteDiscovery?.notes
        ?.map((noteChain) => {
          const lastNote = noteChain[noteChain.length - 1];
          return lastNote.status === "unspent" ? lastNote : null;
        })
        .filter(Boolean) as Note[]) || []
    );
  }, [noteDiscovery]);

  useEffect(() => {
    if (preSelectedNote && preSelectedNote.status === "unspent") {
      setSelectedNote(preSelectedNote);
    } else if (availableNotes.length > 0 && !selectedNote) {
      setSelectedNote(availableNotes[0]);
    }
  }, [availableNotes, selectedNote, preSelectedNote]);

  return {
    availableNotes,
    selectedNote,
    setSelectedNote,
    isLoadingNotes,
    isNoteDropdownOpen,
    setIsNoteDropdownOpen,
  };
};
