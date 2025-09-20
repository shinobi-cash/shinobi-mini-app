
import { memo, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DestinationChain {
  chainId: number;
  name: string;
}

// Move outside component to prevent recreation on every render
const SUPPORTED_DESTINATIONS: readonly DestinationChain[] = [
  {
    chainId: 421614,
    name: "Arbitrum Sepolia"
  },
  {
    chainId: 84532,
    name: "Base Sepolia"
  }
] as const;

interface DestinationChainSelectorProps {
  selectedChainId: number;
  onChainSelect: (chainId: number) => void;
  disabled?: boolean;
}

export const DestinationChainSelector = memo(({ 
  selectedChainId, 
  onChainSelect, 
  disabled 
}: DestinationChainSelectorProps) => {
  const selectedChain = useMemo(
    () => SUPPORTED_DESTINATIONS.find(chain => chain.chainId === selectedChainId),
    [selectedChainId]
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-app-secondary block">
        Destination Chain
      </label>
      <Select
        value={selectedChainId.toString()}
        onValueChange={(value) => onChainSelect(Number(value))}
        disabled={disabled}
      >
        <SelectTrigger className="w-full h-16">
          <SelectValue placeholder="Select destination chain">
            {selectedChain?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Available Chains</SelectLabel>
            {SUPPORTED_DESTINATIONS.map((chain) => (
              <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                {chain.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
});

DestinationChainSelector.displayName = 'DestinationChainSelector';
 