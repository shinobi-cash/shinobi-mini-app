import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

export const WalletDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  if (!isConnected) {
    return null;
  }

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Wallet menu"
        className="flex items-center gap-1 p-2 hover:bg-app-surface-hover rounded-lg active:scale-95 transition-all"
      >
        <Wallet className="w-5 h-5 text-app-secondary" />
        <ChevronDown className={`w-4 h-4 text-app-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-48 bg-app-surface border border-app rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Connected Address */}
          <div className="px-3 py-2 border-b border-app">
            <p className="text-xs text-app-tertiary mb-1">Connected Wallet</p>
            <p className="text-sm font-mono text-app-primary truncate">{address && shortenAddress(address)}</p>
          </div>

          {/* Disconnect Option */}
          <button
            type="button"
            onClick={handleDisconnect}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
};
