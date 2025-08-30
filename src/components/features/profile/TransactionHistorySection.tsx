import type { NoteChain } from "@/lib/storage/noteCache";
import { RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";
import { CashNoteCard } from "./CashNoteCard";

interface TransactionHistorySectionProps {
  noteChains: NoteChain[];
  loading: boolean;
  error: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onNoteChainClick: (noteChain: NoteChain) => void;
}

export function TransactionHistorySection({
  noteChains,
  loading,
  error,
  isRefreshing,
  onRefresh,
  onNoteChainClick,
}: TransactionHistorySectionProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      <div className="flex-shrink-0 bg-app-surface border-b border-app shadow-md">
        <div className="flex items-center justify-between py-3 px-4">
          <h2 className="text-lg font-semibold text-app-secondary tracking-tight flex-1">Transaction History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing || loading}
            className="h-8 w-8 p-0 text-app-secondary hover:text-app-primary"
            title="Refresh transaction history"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Scrollable History Table */}
      <div className="flex-1 flex flex-col bg-app-surface border-b border-app shadow-md overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-app-secondary" />
                <p className="text-app-secondary">Loading your transaction history...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-app-secondary mb-1">Failed to load history</p>
                <p className="text-sm text-app-tertiary">Check your connection and try again</p>
              </div>
            </div>
          ) : noteChains.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <span className="text-2xl mb-2 block">💰</span>
                <p className="text-app-secondary mb-1">No transaction history yet</p>
                <p className="text-sm text-app-tertiary">Make a deposit to create your first cash note</p>
              </div>
            </div>
          ) : (
            <>
              {noteChains.map((noteChain, index) => {
                const lastNote = noteChain[noteChain.length - 1];
                return (
                  <CashNoteCard
                    key={`chain-${index}-${lastNote.depositIndex}-${lastNote.changeIndex}`}
                    note={lastNote}
                    chainLength={noteChain.length}
                    onClick={() => onNoteChainClick(noteChain)}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
