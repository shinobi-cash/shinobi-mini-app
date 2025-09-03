import type { NoteChain } from "@/lib/storage/types";
import { RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";
import { CashNoteCard } from "./CashNoteCard";

interface NotesHistorySectionProps {
  noteChains: NoteChain[];
  loading: boolean;
  error: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onNoteChainClick: (noteChain: NoteChain) => void;
}

export function NotesHistorySection({
  noteChains,
  loading,
  error,
  isRefreshing,
  onRefresh,
  onNoteChainClick,
}: NotesHistorySectionProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 bg-app-surface border border-app rounded-t-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-app-secondary">Notes History</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing || loading}
            className="h-8 w-8 p-0 text-app-secondary hover:text-app-primary"
            title="Refresh notes history"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-app-surface border-x border-b border-app rounded-b-xl overflow-hidden">
        <div className="h-full overflow-y-auto">
          {error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-app-secondary mb-1">Failed to load history</p>
                <p className="text-sm text-app-tertiary">Check your connection and try again</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-app-secondary" />
                <p className="text-app-secondary">Loading your notes history...</p>
              </div>
            </div>
          ) : noteChains.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <span className="text-2xl mb-2 block">💰</span>
                <p className="text-app-secondary mb-1">No notes yet</p>
                <p className="text-sm text-app-tertiary">Make a deposit to create your first note</p>
              </div>
            </div>
          ) : (
            <>
              {noteChains.map((noteChain, index) => {
                const lastNote = noteChain[noteChain.length - 1];
                return (
                  <div key={`chain-${index}-${lastNote.depositIndex}-${lastNote.changeIndex}`} className="border-b border-app-border last:border-b-0">
                    <CashNoteCard
                      note={lastNote}
                      chainLength={noteChain.length}
                      onClick={() => onNoteChainClick(noteChain)}
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
