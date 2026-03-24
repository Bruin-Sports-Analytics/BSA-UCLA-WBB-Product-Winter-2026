import { ArrowUpDown, ChevronUp, ChevronDown, X } from 'lucide-react';

export type SortField = 'ppg' | 'rpg' | 'apg' | 'tsPercentage' | 'obpm' | 'dbpm';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

interface SortPanelProps {
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}

const basicStats: { field: SortField; label: string }[] = [
  { field: 'ppg', label: 'Points' },
  { field: 'rpg', label: 'Rebounds' },
  { field: 'apg', label: 'Assists' },
];

const advancedStats: { field: SortField; label: string }[] = [
  { field: 'tsPercentage', label: 'TS%' },
  { field: 'obpm', label: 'OBPM' },
  { field: 'dbpm', label: 'DBPM' },
];

export function SortPanel({ sort, onSortChange }: SortPanelProps) {
  const handleClick = (field: SortField) => {
    if (sort.field === field) {
      if (sort.direction === 'desc') {
        onSortChange({ field, direction: 'asc' });
      } else {
        onSortChange({ field: null, direction: 'desc' });
      }
    } else {
      onSortChange({ field, direction: 'desc' });
    }
  };

  const renderButton = ({ field, label }: { field: SortField; label: string }) => {
    const isActive = sort.field === field;
    return (
      <button
        key={field}
        onClick={() => handleClick(field)}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-[0_0_8px_rgba(255,209,0,0.3)]'
            : 'bg-card-elevated text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>{label}</span>
        {isActive ? (
          sort.direction === 'desc' ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
        )}
      </button>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Sort</h3>
        </div>
        {sort.field && (
          <button
            onClick={() => onSortChange({ field: null, direction: 'desc' })}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-card-elevated hover:bg-muted-foreground/20 rounded-lg transition-colors text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Basic Stats</label>
          <div className="space-y-1.5">
            {basicStats.map(renderButton)}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Advanced</label>
          <div className="space-y-1.5">
            {advancedStats.map(renderButton)}
          </div>
        </div>
      </div>
    </div>
  );
}
