import type { NoteChain } from "@/lib/storage/types";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { CashNoteCard } from "./CashNoteCard";

interface NotesHistorySectionProps {
  noteChains: NoteChain[];
  loading: boolean;
  error: boolean;
  onNoteChainClick: (noteChain: NoteChain) => void;
}

type NoteFilter = "unspent" | "spent";

export function NotesHistorySection({ noteChains, loading, error, onNoteChainClick }: NotesHistorySectionProps) {
  const [activeFilter, setActiveFilter] = useState<NoteFilter>("unspent");

  // Filter note chains based on selected tab
  const filteredNoteChains = noteChains.filter((noteChain) => {
    const lastNote = noteChain[noteChain.length - 1];
    return lastNote.status === activeFilter;
  });

  const unspentCount = noteChains.filter((chain) => chain[chain.length - 1].status === "unspent").length;
  const spentCount = noteChains.filter((chain) => chain[chain.length - 1].status === "spent").length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 bg-app-surface border border-app rounded-t-xl">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveFilter("unspent")}
            className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === "unspent"
                ? "text-app-primary border-b-2 border-green-500"
                : "text-app-secondary hover:text-app-primary"
            }`}
          >
            Unspent ({unspentCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("spent")}
            className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === "spent"
                ? "text-app-primary border-b-2 border-red-500"
                : "text-app-secondary hover:text-app-primary"
            }`}
          >
            Spent ({spentCount})
          </button>
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
          ) : filteredNoteChains.length === 0 && noteChains.length > 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                {activeFilter === "unspent" ? (
                  <>
                    <span className="text-2xl mb-2 block">💸</span>
                    <p className="text-app-secondary mb-1">No unspent notes</p>
                    <p className="text-sm text-app-tertiary">All your notes have been spent</p>
                  </>
                ) : (
                  <>
                    <span className="text-2xl mb-2 block">🔒</span>
                    <p className="text-app-secondary mb-1">No spent notes</p>
                    <p className="text-sm text-app-tertiary">Your notes are still available for withdrawal</p>
                  </>
                )}
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
              {filteredNoteChains.map((noteChain, index) => {
                const lastNote = noteChain[noteChain.length - 1];
                return (
                  <div
                    key={`chain-${index}-${lastNote.depositIndex}-${lastNote.changeIndex}`}
                    className="border-b border-app-border last:border-b-0"
                  >
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
