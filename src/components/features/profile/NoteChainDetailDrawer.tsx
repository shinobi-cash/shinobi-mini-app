import { NETWORK } from "@/config/constants";
import type { NoteChain } from "@/lib/storage/types";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { ExternalLink, Minus } from "lucide-react";
import { Button } from "../../ui/button";
import { ResponsiveModal } from "../../ui/responsive-modal";

interface NoteChainDetailDrawerProps {
  noteChain: NoteChain | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWithdrawClick?: (noteChain: NoteChain) => void;
}

export function NoteChainDetailDrawer({ noteChain, open, onOpenChange, onWithdrawClick }: NoteChainDetailDrawerProps) {
  if (!noteChain) return null;
  const lastNote = noteChain[noteChain.length - 1];

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Deposit Note Timeline"
      description="Chronological details of your note chain"
      className="bg-app-background border-app"
    >
      <div className="space-y-6">
        {/* Balance Summary */}
        <div className="bg-app-surface rounded-xl p-2 border border-app shadow mb-6 text-center">
          <p className="text-sm font-medium text-app-secondary mb-1">Current Balance</p>
          <p className="text-2xl font-bold text-app-primary tabular-nums mb-2">
            {formatEthAmount(lastNote.amount)} ETH
          </p>
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              lastNote.status === "spent"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${lastNote.status === "spent" ? "bg-red-500" : "bg-green-500"}`}
            />
            {lastNote.status === "spent" ? "Fully Spent" : "Available"}
          </div>
        </div>

        {/* Withdraw Action - Only show for unspent notes */}
        {lastNote.status === "unspent" && BigInt(lastNote.amount) > 0n && onWithdrawClick && (
          <div className="mb-6">
            <Button
              onClick={() => onWithdrawClick(noteChain)}
              className="w-full h-12 text-base font-medium rounded-xl"
              size="lg"
            >
              <Minus className="w-5 h-5 mr-2" />
              Withdraw ETH
            </Button>
          </div>
        )}

        {/* Feed */}
        <ul className="-mb-8">
          {noteChain.map((note, index) => {
            const isLast = index === noteChain.length - 1;
            return (
              <li key={`${note.depositIndex}-${note.changeIndex}`}>
                <div className="relative pb-8">
                  {!isLast && (
                    <span className="absolute left-2 top-2 -ml-px h-full w-0.5 border border-app" aria-hidden="true" />
                  )}
                  <div className="relative flex items-start space-x-3">
                    {/* Dot */}
                    <span
                      className={`h-4 w-4 rounded-full flex items-center justify-center ${
                        note.status === "spent" ? "bg-red-500" : "bg-green-500"
                      }`}
                    />

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-app-primary">
                          {index === 0 ? "Deposited: " : isLast ? "Final Balance: " : "Balance: "}
                          <a
                            href={`${NETWORK.EXPLORER_URL}/tx/${note.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600"
                          >
                            {formatEthAmount(note.amount)} ETH
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </span>
                        <p className="text-xs text-app-tertiary whitespace-nowrap">{formatTimestamp(note.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </ResponsiveModal>
  );
}
