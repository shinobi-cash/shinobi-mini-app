interface NotesSummaryCardProps {
  unspentNotes: number;
  totalNotes: number;
}

export function NotesSummaryCard({ unspentNotes, totalNotes }: NotesSummaryCardProps) {
  const spentNotes = totalNotes - unspentNotes;

  return (
    <div className="flex-shrink-0">
      <div className="bg-app-surface p-4 border border-app rounded-xl shadow-sm">
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
      </div>
    </div>
  );
}
