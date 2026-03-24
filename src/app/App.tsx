import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { Header } from './components/Header';
import { FilterPanel, type FilterState } from './components/FilterPanel';
import { SortPanel, type SortState } from './components/SortPanel';
import { PlayerCard } from './components/PlayerCard';
import { StatsOverview } from './components/StatsOverview';
import { PointsComparisonChart } from './components/PointsComparisonChart';
import { ShootingPercentageChart } from './components/ShootingPercentageChart';
import { StatsScatterChart } from './components/StatsScatterChart';
import { PositionDistributionChart } from './components/PositionDistributionChart';
import { DefensiveStatsChart } from './components/DefensiveStatsChart';
import { PlayerComparisonModal } from './components/PlayerComparisonModal';
import { CareerModal } from './components/CareerModal';
import type { TransferPlayer } from './data/transferData';
import { ALL_CONFERENCES } from './data/conferences';
import { YearDataProvider, useYearData, useYearDataContext } from './data/YearDataContext';
import { SimilarityProvider } from './data/SimilarityContext';
import { BarChart3, GitCompare, Search, Globe } from 'lucide-react';

const ALL_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

type Theme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'bsa-dashboard-theme';

// Memoized chart section to avoid re-renders when only player list changes
const ChartSection = memo(function ChartSection({
  displayPlayers,
  filteredPlayers,
  selectedCount,
}: {
  displayPlayers: TransferPlayer[];
  filteredPlayers: TransferPlayer[];
  selectedCount: number;
}) {
  // Cap chart data to top 30 by PPG for readability and performance
  const chartPlayers = useMemo(() => {
    if (displayPlayers.length <= 30) return displayPlayers;
    return [...displayPlayers].sort((a, b) => b.stats.ppg - a.stats.ppg).slice(0, 30);
  }, [displayPlayers]);

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="text-xl font-bold text-foreground">Analytics Dashboard</h2>
        </div>
        <p className="text-xs text-muted-foreground ml-4">
          {selectedCount > 0
            ? `Viewing analytics for selected players (${selectedCount})`
            : `Viewing top ${chartPlayers.length} of ${displayPlayers.length} filtered players (by PPG)`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <PointsComparisonChart players={chartPlayers} />
        <StatsScatterChart players={chartPlayers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ShootingPercentageChart players={chartPlayers} />
        <PositionDistributionChart players={filteredPlayers} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <DefensiveStatsChart players={chartPlayers} />
      </div>
    </>
  );
});

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debounced;
}

const DEFAULT_FILTERS: FilterState = {
  position: [],
  availability: [],
  classYear: [],
  team: [],
  conference: [],
  ppgMin: 0,
  ppgMax: 30,
  minGames: 0,
  minMPG: 0,
  transferOnly: false,
};

function AppInner() {
  const [activeYear, setActiveYear] = useState(2025);
  const { players, isLoading: yearLoading, error: yearError } = useYearData(activeYear);
  const allTeams = useMemo(() => [...new Set(players.map((p) => p.previousSchool))].sort(), [players]);


  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const [selectedPlayers, setSelectedPlayers] = useState<TransferPlayer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 200);
  const [allYearsMode, setAllYearsMode] = useState(false);
  const { cache, loadYear, loadingYears } = useYearDataContext();
  useEffect(() => {
    if (allYearsMode) ALL_YEARS.forEach(loadYear);
  }, [allYearsMode, loadYear]);
  const allYearsLoading = allYearsMode && ALL_YEARS.some(y => loadingYears.has(y));
  const allYearsResults = useMemo<TransferPlayer[]>(() => {
    if (!allYearsMode) return [];
    const query = debouncedSearch.trim();
    if (!query) return [];
    const byLink = new Map<string, TransferPlayer>();
    for (const year of [...ALL_YEARS].reverse()) {
      for (const p of cache.get(year) ?? []) {
        if (!p.name.toLowerCase().includes(query) && !p.previousSchool.toLowerCase().includes(query)) continue;
        if (!byLink.has(p.playerLink ?? p.id)) byLink.set(p.playerLink ?? p.id, p);
      }
    }
    return [...byLink.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allYearsMode, debouncedSearch, cache]);
  const [sort, setSort] = useState<SortState>({ field: null, direction: 'desc' });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleYearChange = useCallback((year: number) => {
    setActiveYear(year);
    setFilters(DEFAULT_FILTERS);
    setDisplayLimit(10);
    setSelectedPlayers([]);
    setSearchQuery('');
    setSort({ field: null, direction: 'desc' });
    setShowComparisonModal(false);
  }, []);

  const filteredPlayers = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    return players.filter((player) => {
      if (filters.transferOnly && !player.transferInfo) return false;
      if (query && !player.name.toLowerCase().includes(query) && !player.previousSchool.toLowerCase().includes(query)) return false;
      if (filters.position.length > 0 && !filters.position.includes(player.position)) return false;
      if (filters.availability.length > 0 && !filters.availability.includes(player.availability)) return false;
      if (filters.classYear.length > 0 && (player.year === null || !filters.classYear.includes(player.year))) return false;
      if (filters.team.length > 0 && !filters.team.includes(player.previousSchool)) return false;
      if (filters.conference.length > 0 && !filters.conference.includes(player.conference)) return false;
      if (player.stats.ppg < filters.ppgMin || player.stats.ppg > filters.ppgMax) return false;
      if (player.stats.gamesPlayed < filters.minGames) return false;
      if (player.stats.minutesPerGame < filters.minMPG) return false;
      return true;
    });
  }, [players, filters, debouncedSearch]);

  const sortedPlayers = useMemo(() => {
    if (!sort.field) return filteredPlayers;
    const field = sort.field;
    const dir = sort.direction === 'desc' ? -1 : 1;
    return [...filteredPlayers].sort((a, b) => {
      const aVal = a.stats[field];
      const bVal = b.stats[field];
      return (aVal - bVal) * dir;
    });
  }, [filteredPlayers, sort]);

  const cappedPlayers = sortedPlayers.slice(0, displayLimit);

  const selectedIds = useMemo(() => new Set(selectedPlayers.map((p) => p.id)), [selectedPlayers]);

  const [careerPlayer, setCareerPlayer] = useState<TransferPlayer | null>(null);

  const handlePlayerClick = useCallback((player: TransferPlayer) => {
    setSelectedPlayers((prev) => {
      const isSelected = prev.some((p) => p.id === player.id);
      if (isSelected) return prev.filter((p) => p.id !== player.id);
      if (prev.length >= 3) return [...prev.slice(1), player];
      return [...prev, player];
    });
  }, []);

  const handleCareerClick = useCallback((player: TransferPlayer) => {
    setCareerPlayer(player);
  }, []);

  const displayPlayers = useMemo(
    () => (selectedPlayers.length > 0 ? selectedPlayers : filteredPlayers),
    [selectedPlayers, filteredPlayers]
  );
  const handleThemeToggle = useCallback(() => {
    setTheme((previousTheme) => (previousTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header playerCount={filteredPlayers.length} theme={theme} onThemeToggle={handleThemeToggle} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <StatsOverview players={filteredPlayers} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFilterChange={setFilters}
              teams={allTeams}
              conferences={ALL_CONFERENCES}
              activeYear={activeYear}
              onYearChange={handleYearChange}
            />
          </div>

          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">All Players</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {selectedPlayers.length > 0 && (
                    <span className="bg-primary/15 text-primary px-3 py-1 rounded-lg text-xs font-medium border border-primary/20">
                      {selectedPlayers.length} selected
                    </span>
                  )}
                  {selectedPlayers.length >= 2 && (
                    <button
                      onClick={() => setShowComparisonModal(true)}
                      className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(255,209,0,0.2)]"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      Compare
                    </button>
                  )}
                </div>
              </div>
              {!allYearsMode && (
                <p className="text-xs text-muted-foreground mb-4">
                  Click on players to select them for comparison in the charts below (max 3)
                </p>
              )}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={allYearsMode ? 'Search all years by player name or school...' : 'Search by player name or school...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-card-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                  />
                </div>
                <button
                  onClick={() => { setAllYearsMode(m => !m); setSearchQuery(''); }}
                  title={allYearsMode ? 'Switch to current year only' : 'Search across all years (2017–2026)'}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    allYearsMode
                      ? 'bg-primary text-primary-foreground border-primary/50'
                      : 'bg-card-elevated text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  All years
                </button>
              </div>
              {!allYearsMode && sortedPlayers.length > displayLimit && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <span>Showing</span>
                  <input
                    type="number"
                    min={1}
                    max={sortedPlayers.length}
                    value={displayLimit}
                    onChange={(e) => {
                      const nextValue = Number(e.target.value);
                      if (Number.isNaN(nextValue)) return;
                      const clampedValue = Math.max(1, Math.min(sortedPlayers.length, Math.floor(nextValue)));
                      setDisplayLimit(clampedValue);
                    }}
                    className="w-20 px-2 py-1 bg-card-elevated border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                  />
                  <span>of {sortedPlayers.length} results</span>
                </div>
              )}
              {allYearsMode ? (
                allYearsLoading && allYearsResults.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
                    Loading all seasons...
                  </div>
                ) : allYearsResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{debouncedSearch.trim() ? 'No players found across all years' : 'Type a name or school to search all years'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allYearsResults.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        onClick={handlePlayerClick}
                        isSelected={selectedIds.has(player.id)}
                        onCareerClick={handleCareerClick}
                      />
                    ))}
                  </div>
                )
              ) : yearError ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Failed to load {activeYear} season data</p>
                </div>
              ) : yearLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
                  Loading {activeYear} season...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cappedPlayers.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        onClick={handlePlayerClick}
                        isSelected={selectedIds.has(player.id)}
                        onCareerClick={handleCareerClick}
                      />
                    ))}
                  </div>
                  {filteredPlayers.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No players match the current filters</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <SortPanel sort={sort} onSortChange={setSort} />
          </div>
        </div>

        <ChartSection
          displayPlayers={displayPlayers}
          filteredPlayers={filteredPlayers}
          selectedCount={selectedPlayers.length}
        />

        <div className="mt-10 text-center text-xs text-muted-foreground border-t border-border pt-6">
          <p className="uppercase tracking-wider">Bruin Sports Analytics WBB Stats & Recruiting Dashboard</p>
          <p className="mt-1 opacity-60">Data: Sports Reference {activeYear - 1}-{String(activeYear).slice(2)} season</p>
        </div>
      </div>

      {showComparisonModal && (
        <PlayerComparisonModal
          players={selectedPlayers}
          onClose={() => setShowComparisonModal(false)}
        />
      )}
      {careerPlayer && (
        <CareerModal
          player={careerPlayer}
          onClose={() => setCareerPlayer(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <YearDataProvider>
      <SimilarityProvider>
        <AppInner />
      </SimilarityProvider>
    </YearDataProvider>
  );
}
