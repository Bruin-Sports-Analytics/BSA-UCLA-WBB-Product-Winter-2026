import { useState } from 'react';
import { Filter, X, Search } from 'lucide-react';

export interface FilterState {
  position: string[];
  availability: string[];
  classYear: string[];
  team: string[];
  conference: string[];
  ppgMin: number;
  ppgMax: number;
  minGames: number;
  minMPG: number;
  transferOnly: boolean;
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  teams: string[];
  conferences: string[];
  activeYear: number;
  onYearChange: (year: number) => void;
}

export function FilterPanel({ filters, onFilterChange, teams, conferences, activeYear, onYearChange }: FilterPanelProps) {
  const [teamSearch, setTeamSearch] = useState('');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [confSearch, setConfSearch] = useState('');
  const [confDropdownOpen, setConfDropdownOpen] = useState(false);

  const filteredConfs = confSearch
    ? conferences.filter((c) => c.toLowerCase().includes(confSearch.toLowerCase())).slice(0, 10)
    : [];

  const toggleConference = (conf: string) => {
    const updated = filters.conference.includes(conf)
      ? filters.conference.filter((c) => c !== conf)
      : [...filters.conference, conf];
    onFilterChange({ ...filters, conference: updated });
  };

  const filteredTeams = teamSearch
    ? teams.filter((t) => t.toLowerCase().includes(teamSearch.toLowerCase())).slice(0, 10)
    : [];

  const toggleTeam = (team: string) => {
    const updated = filters.team.includes(team)
      ? filters.team.filter((t) => t !== team)
      : [...filters.team, team];
    onFilterChange({ ...filters, team: updated });
  };
  const positions = ['G', 'F', 'C'];
  const availabilities = ['Available', 'Considering', 'Committed'];
  const classYears = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

  const toggleArrayFilter = (
    key: 'position' | 'availability' | 'classYear',
    value: string
  ) => {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({ ...filters, [key]: updated });
  };

  const resetFilters = () => {
    onFilterChange({
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
    });
  };

  const hasActiveFilters =
    filters.position.length > 0 ||
    filters.availability.length > 0 ||
    filters.classYear.length > 0 ||
    filters.team.length > 0 ||
    filters.conference.length > 0 ||
    filters.ppgMin > 0 ||
    filters.ppgMax < 30 ||
    filters.minGames > 0 ||
    filters.minMPG > 0 ||
    filters.transferOnly;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-card-elevated hover:bg-muted-foreground/20 rounded-lg transition-colors text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Season</label>
          <select
            value={activeYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-card-elevated border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
          >
            {Array.from({ length: 10 }, (_, i) => 2026 - i).map((year) => (
              <option key={year} value={year}>
                {year - 1}–{String(year).slice(2)} season
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-muted-foreground">Transfer Only</label>
            {activeYear !== 2025 && (
              <p className="text-[10px] text-muted-foreground opacity-60">2025 data only</p>
            )}
          </div>
          <button
            onClick={() => activeYear === 2025 && onFilterChange({ ...filters, transferOnly: !filters.transferOnly })}
            disabled={activeYear !== 2025}
            title={activeYear !== 2025 ? 'Transfer portal data is only available for the 2025 season' : undefined}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              activeYear !== 2025
                ? 'opacity-40 cursor-not-allowed bg-card-elevated'
                : filters.transferOnly
                ? 'bg-primary'
                : 'bg-card-elevated'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
                filters.transferOnly && activeYear === 2025
                  ? 'translate-x-[1.125rem] bg-primary-foreground'
                  : 'translate-x-0.5 bg-muted-foreground'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Position</label>
          <div className="flex flex-wrap gap-1.5">
            {positions.map((pos) => (
              <button
                key={pos}
                onClick={() => toggleArrayFilter('position', pos)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filters.position.includes(pos)
                    ? 'bg-primary text-primary-foreground shadow-[0_0_8px_rgba(255,209,0,0.3)]'
                    : 'bg-card-elevated text-muted-foreground hover:text-foreground'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Class Year</label>
          <div className="flex flex-wrap gap-1.5">
            {classYears.map((year) => (
              <button
                key={year}
                onClick={() => toggleArrayFilter('classYear', year)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filters.classYear.includes(year)
                    ? 'bg-primary text-primary-foreground shadow-[0_0_8px_rgba(255,209,0,0.3)]'
                    : 'bg-card-elevated text-muted-foreground hover:text-foreground'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Availability</label>
          <div className="flex flex-wrap gap-1.5">
            {availabilities.map((avail) => (
              <button
                key={avail}
                onClick={() => toggleArrayFilter('availability', avail)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filters.availability.includes(avail)
                    ? 'bg-primary text-primary-foreground shadow-[0_0_8px_rgba(255,209,0,0.3)]'
                    : 'bg-card-elevated text-muted-foreground hover:text-foreground'
                }`}
              >
                {avail}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Team</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teams..."
              value={teamSearch}
              onChange={(e) => {
                setTeamSearch(e.target.value);
                setTeamDropdownOpen(true);
              }}
              onFocus={() => setTeamDropdownOpen(true)}
              className="w-full pl-8 pr-3 py-2 bg-card-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
            />
            {teamDropdownOpen && filteredTeams.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-card-elevated border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                {filteredTeams.map((team) => (
                  <button
                    key={team}
                    onClick={() => {
                      toggleTeam(team);
                      setTeamSearch('');
                      setTeamDropdownOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted ${
                      filters.team.includes(team) ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            )}
          </div>
          {filters.team.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {filters.team.map((team) => (
                <span
                  key={team}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/15 text-primary rounded-md text-xs border border-primary/20"
                >
                  {team}
                  <button onClick={() => toggleTeam(team)} className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Conference</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conferences..."
              value={confSearch}
              onChange={(e) => {
                setConfSearch(e.target.value);
                setConfDropdownOpen(true);
              }}
              onFocus={() => setConfDropdownOpen(true)}
              className="w-full pl-8 pr-3 py-2 bg-card-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
            />
            {confDropdownOpen && filteredConfs.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-card-elevated border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                {filteredConfs.map((conf) => (
                  <button
                    key={conf}
                    onClick={() => {
                      toggleConference(conf);
                      setConfSearch('');
                      setConfDropdownOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted ${
                      filters.conference.includes(conf) ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {conf}
                  </button>
                ))}
              </div>
            )}
          </div>
          {filters.conference.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {filters.conference.map((conf) => (
                <span
                  key={conf}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/15 text-primary rounded-md text-xs border border-primary/20"
                >
                  {conf}
                  <button onClick={() => toggleConference(conf)} className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">PPG range</label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="number"
              min={0}
              max={30}
              value={filters.ppgMax}
              onChange={(e) => {
                const v = Math.max(0, Math.min(30, Number(e.target.value) || 0));
                onFilterChange({ ...filters, ppgMax: v });
              }}
              className="w-12 bg-card-elevated border border-border rounded-md px-1.5 py-1 text-xs text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              type="range"
              min={0}
              max={30}
              value={filters.ppgMax}
              onChange={(e) =>
                onFilterChange({ ...filters, ppgMax: Number(e.target.value) })
              }
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Min Games Played</label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="number"
              min={0}
              max={35}
              value={filters.minGames}
              onChange={(e) => {
                const v = Math.max(0, Math.min(35, Number(e.target.value) || 0));
                onFilterChange({ ...filters, minGames: v });
              }}
              className="w-12 bg-card-elevated border border-border rounded-md px-1.5 py-1 text-xs text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              type="range"
              min={0}
              max={35}
              value={filters.minGames}
              onChange={(e) =>
                onFilterChange({ ...filters, minGames: Number(e.target.value) })
              }
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Min Minutes/Game</label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="number"
              min={0}
              max={40}
              value={filters.minMPG}
              onChange={(e) => {
                const v = Math.max(0, Math.min(40, Number(e.target.value) || 0));
                onFilterChange({ ...filters, minMPG: v });
              }}
              className="w-12 bg-card-elevated border border-border rounded-md px-1.5 py-1 text-xs text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              type="range"
              min={0}
              max={40}
              value={filters.minMPG}
              onChange={(e) =>
                onFilterChange({ ...filters, minMPG: Number(e.target.value) })
              }
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
