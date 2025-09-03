import { RotateCcw } from "lucide-react";
import { Button } from "../../ui/button";

interface NotesSummaryCardProps {
  unspentNotes: number;
  totalNotes: number;
  isRediscovering?: boolean;
  onRediscover?: () => void;
}

export function NotesSummaryCard({ unspentNotes, totalNotes, isRediscovering, onRediscover }: NotesSummaryCardProps) {
  const spentNotes = totalNotes - unspentNotes;

  return (
    <div className="flex-shrink-0">
      <div className="bg-app-surface p-4 border border-app rounded-xl shadow-sm">
        <div className="flex gap-6 mb-3">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-app-secondary mb-1">Unspent</p>
            <p className="text-xl font-bold text-app-primary tabular-nums">{unspentNotes}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-app-secondary mb-1">Spent</p>
            <p className="text-xl font-bold text-app-primary tabular-nums">{spentNotes}</p>
          </div>
        </div>

        {onRediscover && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRediscover}
            disabled={isRediscovering}
            className="w-full text-app-secondary hover:text-app-primary"
            title="Re-discover notes from blockchain"
          >
            <RotateCcw className={`w-4 h-4 mr-1 ${isRediscovering ? "animate-spin" : ""}`} />
            {isRediscovering ? "Syncing..." : "Sync"}
          </Button>
        )}
      </div>
    </div>
  );
}
