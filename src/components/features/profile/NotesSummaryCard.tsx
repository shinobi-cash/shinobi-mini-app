import { UserX } from "lucide-react";
import { Button } from "../../ui/button";

interface NotesSummaryCardProps {
  unspentNotes: number;
  totalNotes: number;
  onSignOut: () => void;
}

export function NotesSummaryCard({ unspentNotes, totalNotes, onSignOut }: NotesSummaryCardProps) {
  const spentNotes = totalNotes - unspentNotes;

  return (
    <div className="flex-shrink-0">
      <div className="flex justify-between items-center bg-app-surface p-3 border-t border-b border-app shadow-md">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-app-secondary mb-1">Unspent</p>
            <p className="text-xl font-bold text-app-primary tabular-nums">{unspentNotes}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-app-secondary mb-1">Spent</p>
            <p className="text-xl font-bold text-app-primary tabular-nums">{spentNotes}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          title="Sign out of account"
          className="w-8 h-8 p-0 rounded-full text-app-tertiary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <UserX className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
