import { useEffect, useState } from 'react';
import { X, TrendingUp, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useYearDataContext } from '../data/YearDataContext';
import type { TransferPlayer } from '../data/transferData';
import { SimilarPlayersSection } from './SimilarPlayersSection';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CareerSeason {
  year: number;
  season: string;
  school: string;
  position: string;
  cls: string;
  gp: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  fgPct: number;
  threePct: number;
  ftPct: number;
  mpg: number;
  tsPct: number;
  obpm: number;
  dbpm: number;
}

type TabKey = 'scoring' | 'efficiency' | 'boards';

interface TabConfig {
  label: string;
  lines: { key: keyof CareerSeason; name: string; color: string }[];
}

const TABS: Record<TabKey, TabConfig> = {
  scoring: {
    label: 'Scoring',
    lines: [
      { key: 'ppg', name: 'PPG', color: '#FFD100' },
      { key: 'fgPct', name: 'FG%', color: '#60a5fa' },
      { key: 'threePct', name: '3P%', color: '#34d399' },
      { key: 'ftPct', name: 'FT%', color: '#f87171' },
    ],
  },
  efficiency: {
    label: 'Efficiency',
    lines: [
      { key: 'tsPct', name: 'TS%', color: '#FFD100' },
      { key: 'obpm', name: 'OBPM', color: '#60a5fa' },
      { key: 'dbpm', name: 'DBPM', color: '#34d399' },
      { key: 'mpg', name: 'MPG', color: '#a78bfa' },
    ],
  },
  boards: {
    label: 'Boards & Playmaking',
    lines: [
      { key: 'rpg', name: 'RPG', color: '#FFD100' },
      { key: 'apg', name: 'APG', color: '#60a5fa' },
      { key: 'spg', name: 'SPG', color: '#34d399' },
      { key: 'bpg', name: 'BPG', color: '#f87171' },
    ],
  },
};

const ALL_YEARS = Array.from({ length: 10 }, (_, i) => 2017 + i);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CareerModalProps {
  player: TransferPlayer;
  onClose: () => void;
}

export function CareerModal({ player, onClose }: CareerModalProps) {
  const { cache, loadYear, loadingYears, error } = useYearDataContext();
  const [activeTab, setActiveTab] = useState<TabKey>('scoring');

  // Kick off fetches for all uncached years on open
  useEffect(() => {
    ALL_YEARS.forEach(year => {
      if (!cache.has(year)) loadYear(year);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = ALL_YEARS.some(year => loadingYears.has(year));

  // Assemble career seasons from cache.
  // Guard: player.playerLink must be defined (Career button only renders when it is,
  // but guard here too so an undefined link can't match other undefined-link players).
  const careerSeasons: CareerSeason[] = !player.playerLink ? [] : ALL_YEARS
    .filter(year => cache.has(year))
    .flatMap(year => {
      const yearPlayers = cache.get(year)!;
      const found = yearPlayers.find(p => p.playerLink === player.playerLink);
      if (!found) return [];
      return [{
        year,
        season: `${year - 1}-${String(year).slice(2)}`,
        school: found.previousSchool,
        position: found.position ?? '',
        cls: found.year ?? '',
        gp: found.stats.gamesPlayed,
        ppg: found.stats.ppg,
        rpg: found.stats.rpg,
        apg: found.stats.apg,
        spg: found.stats.spg,
        bpg: found.stats.bpg,
        fgPct: found.stats.fgPercentage,
        threePct: found.stats.threePointPercentage,
        ftPct: found.stats.ftPercentage,
        mpg: found.stats.minutesPerGame,
        tsPct: found.stats.tsPercentage,
        obpm: found.stats.obpm,
        dbpm: found.stats.dbpm,
      }];
    })
    .sort((a, b) => a.year - b.year);

  const handleRetry = () => {
    // loadYear guards against re-fetching cached years, so calling it for
    // all uncached years is safe. Failed years are NOT in cache (only
    // successful loads go into cache), so they will be re-fetched here.
    ALL_YEARS.forEach(year => loadYear(year));
  };

  const tab = TABS[activeTab];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">{player.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Career Statistics</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-card-elevated transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Error state */}
          {error && (
            <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 mb-6 text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm flex-1">Some seasons failed to load.</span>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && careerSeasons.length === 0 && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-3 text-primary" />
              Loading career data...
            </div>
          )}

          {/* No career data */}
          {!isLoading && careerSeasons.length === 0 && !error && (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No historical data found for this player.</p>
            </div>
          )}

          {/* Career content */}
          {careerSeasons.length > 0 && (
            <>
              {/* Partial loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  Loading remaining seasons...
                </div>
              )}

              {/* Tab selector */}
              <div className="flex gap-2 mb-4">
                {(Object.entries(TABS) as [TabKey, TabConfig][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === key
                        ? 'bg-primary text-primary-foreground shadow-[0_0_8px_rgba(255,209,0,0.3)]'
                        : 'bg-card-elevated text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>

              {/* Trend chart */}
              <div className="mb-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={careerSeasons} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="season" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {tab.lines.map(line => (
                      <Line
                        key={line.key}
                        type="monotone"
                        dataKey={line.key}
                        name={line.name}
                        stroke={line.color}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Year-by-year table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Season', 'School', 'Pos', 'Class', 'GP', 'PPG', 'RPG', 'APG', 'FG%', '3P%', 'FT%', 'MPG', 'TS%', 'OBPM', 'DBPM'].map(col => (
                        <th key={col} className="pb-2 pr-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {careerSeasons.map(s => (
                      <tr key={s.year} className="border-b border-border/50 hover:bg-card-elevated transition-colors">
                        <td className="py-2 pr-3 font-medium text-foreground">{s.season}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{s.school}</td>
                        <td className="py-2 pr-3 text-foreground">{s.position || '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.cls || '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.gp}</td>
                        <td className="py-2 pr-3 text-primary font-semibold">{s.ppg.toFixed(2)}</td>
                        <td className="py-2 pr-3 text-foreground">{s.rpg.toFixed(2)}</td>
                        <td className="py-2 pr-3 text-foreground">{s.apg.toFixed(2)}</td>
                        <td className="py-2 pr-3 text-foreground">{s.fgPct > 0 ? `${s.fgPct.toFixed(2)}%` : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.threePct > 0 ? `${s.threePct.toFixed(2)}%` : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.ftPct > 0 ? `${s.ftPct.toFixed(2)}%` : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.mpg.toFixed(2)}</td>
                        <td className="py-2 pr-3 text-foreground">{s.tsPct > 0 ? `${s.tsPct.toFixed(2)}%` : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.obpm !== 0 ? s.obpm.toFixed(2) : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.dbpm !== 0 ? s.dbpm.toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Similar career trajectories */}
          {player.playerLink && (
            <SimilarPlayersSection playerLink={player.playerLink} />
          )}
        </div>
      </div>
    </div>
  );
}
