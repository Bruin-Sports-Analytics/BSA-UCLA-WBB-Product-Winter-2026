import { memo } from 'react';
import type { TransferPlayer } from '@/app/data/transferData';
import { Award, TrendingUp, ExternalLink, ArrowRight, History } from 'lucide-react';

interface PlayerCardProps {
  player: TransferPlayer;
  onClick: (player: TransferPlayer) => void;
  isSelected: boolean;
  onCareerClick: (player: TransferPlayer) => void;
}

export const PlayerCard = memo(function PlayerCard({ player, onClick, isSelected, onCareerClick }: PlayerCardProps) {
  const getAvailabilityStyle = (availability: string) => {
    switch (availability) {
      case 'Available':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Considering':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Committed':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-card-elevated text-muted-foreground border-border';
    }
  };

  return (
    <div
      onClick={() => onClick(player)}
      className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:bg-card-elevated ${
        isSelected
          ? 'border-primary/50 shadow-[0_0_15px_rgba(255,209,0,0.1)]'
          : 'border-border hover:border-border-highlight'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">{player.name}</h3>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="bg-primary/15 text-primary px-2 py-0.5 rounded-md font-medium">
              {player.position}
            </span>
            <span className="bg-card-elevated text-muted-foreground px-2 py-0.5 rounded-md">
              {player.year ?? '—'}
            </span>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium rounded-md border ${getAvailabilityStyle(
            player.availability
          )}`}
        >
          {player.availability}
        </span>
      </div>

      <div className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
        <Award className="w-3.5 h-3.5 text-primary/60" />
        <span>{player.previousSchool}</span>
      </div>

      {player.transferInfo && (
        <div className="text-sm mb-3 space-y-1">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-medium">
            {player.transferInfo.classYear}
          </span>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <span>{player.transferInfo.previousTeam}</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary/50" />
            <span className={player.transferInfo.newTeam ? 'font-medium text-primary' : 'text-muted-foreground italic'}>
              {player.transferInfo.newTeam ?? 'TBD'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">PPG</div>
          <div className="text-sm font-semibold text-primary">{player.stats.ppg.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">RPG</div>
          <div className="text-sm font-semibold text-foreground">{player.stats.rpg.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">APG</div>
          <div className="text-sm font-semibold text-foreground">{player.stats.apg.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">FG%</div>
          <div className="text-sm font-semibold text-foreground">{player.stats.fgPercentage.toFixed(2)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t border-border">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">3PT%</div>
          <div className="text-xs text-foreground">
            {player.stats.threePointPercentage > 0
              ? `${player.stats.threePointPercentage.toFixed(2)}%`
              : 'N/A'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">FT%</div>
          <div className="text-xs text-foreground">{player.stats.ftPercentage.toFixed(2)}%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">MPG</div>
          <div className="text-xs text-foreground">{player.stats.minutesPerGame.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t border-border">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">TS%</div>
          <div className="text-xs text-foreground">{player.stats.tsPercentage > 0 ? `${player.stats.tsPercentage.toFixed(2)}%` : 'N/A'}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">OBPM</div>
          <div className="text-xs text-foreground">{player.stats.obpm !== 0 ? player.stats.obpm.toFixed(2) : 'N/A'}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">DBPM</div>
          <div className="text-xs text-foreground">{player.stats.dbpm !== 0 ? player.stats.dbpm.toFixed(2) : 'N/A'}</div>
        </div>
      </div>

      {player.playerLink && (
        <div className="mt-3 pt-2 border-t border-border flex items-center gap-4">
          <a
            href={player.playerLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View Profile
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onCareerClick(player); }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-3 h-3" />
            Career
          </button>
        </div>
      )}

      {isSelected && (
        <div className="mt-2 pt-2 border-t border-primary/20">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary font-medium">
            <TrendingUp className="w-3 h-3" />
            Selected for comparison
          </div>
        </div>
      )}
    </div>
  );
});
