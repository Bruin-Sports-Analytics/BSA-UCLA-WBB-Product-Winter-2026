import { useState } from 'react';
import { LineChart, Line } from 'recharts';
import { useSimilarity } from '../data/SimilarityContext';
import type { SimilarPlayer } from '../data/similarityTypes';

interface SimilarPlayersSectionProps {
  playerLink: string;
}

function ScoreBadge({ score }: { score: number }) {
  const rounded = Math.round(score);
  let cls = '';
  if (score >= 80) {
    cls = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  } else if (score >= 60) {
    cls = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  } else {
    cls = 'text-muted-foreground bg-card-elevated border-border';
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {rounded}%
    </span>
  );
}

function PlayerCard({ match }: { match: SimilarPlayer }) {
  const sparkData = match.seasons.map((s, i) => ({ i, ppg: s.ppg }));
  const finalSeason = match.seasons[match.seasons.length - 1];

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
      {/* Left: info */}
      <div className="flex-1 min-w-0">
        <a
          href={match.player_link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-foreground text-sm truncate hover:text-primary transition-colors"
        >
          {match.player_name}
        </a>
        <p className="text-xs text-muted-foreground truncate">
          <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-card-elevated border border-border mr-1.5">{match.position}</span>
          {match.school} · {match.year_start}–{match.year_end}
        </p>
        {finalSeason && (
          <div className="flex gap-2 mt-1">
            {[
              `PPG ${finalSeason.ppg.toFixed(1)}`,
              `RPG ${finalSeason.rpg.toFixed(1)}`,
              `APG ${finalSeason.apg.toFixed(1)}`,
            ].map((label) => (
              <span
                key={label}
                className="px-1.5 py-0.5 bg-card-elevated rounded text-[10px] text-muted-foreground border border-border"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Center: PPG sparkline */}
      <div className="flex-shrink-0">
        <LineChart width={120} height={40} data={sparkData}>
          <Line
            type="monotone"
            dataKey="ppg"
            stroke="var(--color-primary)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </div>

      {/* Right: score badge */}
      <div className="flex-shrink-0">
        <ScoreBadge score={match.score} />
      </div>
    </div>
  );
}

export function SimilarPlayersSection({ playerLink }: SimilarPlayersSectionProps) {
  const { index, isLoading, error } = useSimilarity();
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Similar Career Trajectories</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Based on full career stat arc · Same position · Powered by DTW
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Loading similarity data...
        </div>
      )}

      {!isLoading && error && (
        <p className="text-sm text-muted-foreground py-4">Similarity data unavailable.</p>
      )}

      {!isLoading && !error && index && !index[playerLink] && (
        <p className="text-sm text-muted-foreground py-4">
          Not enough career data to compute similarity (requires ≥ 2 seasons).
        </p>
      )}

      {!isLoading && !error && index && index[playerLink] && (() => {
        const matches = index[playerLink];
        const visible = showAll ? matches : matches.slice(0, 5);
        const remaining = matches.length - 5;
        return (
          <>
            <div>
              {visible.map((match) => (
                <PlayerCard key={match.player_link} match={match} />
              ))}
            </div>
            {!showAll && remaining > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="mt-3 text-xs text-primary hover:opacity-80 transition-opacity"
              >
                Show {remaining} more
              </button>
            )}
          </>
        );
      })()}
    </div>
  );
}
