# Multi-Year Stats Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add season-selector (2017–2026) and per-player career view (chart + table) to the WBB dashboard.

**Architecture:** CSV files move to `dashboard/public/data/` and are fetched on demand; a React context caches loaded years. The existing data-parsing functions (`goldToTransferPlayer`, `parseAdvancedStats`) are reused unchanged. A new `CareerModal` opens from a dedicated button on each `PlayerCard`.

**Tech Stack:** Python 3 (data prep script), React 18 + TypeScript + Vite, Recharts, Tailwind CSS, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-12-multi-year-stats-design.md`

---

## Chunk 1: Data Preparation

### Task 1: Python Aggregation Script

**Files:**
- Create: `scripts/aggregate_advanced_stats.py`

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""
Aggregates per-team advanced stat CSVs into one file per year.

Usage: python scripts/aggregate_advanced_stats.py

Input:  advancedData/YYYY/<school>_wbb_advanced_YYYY.csv  (one file per team)
Output: data/yearly_data/sr_advanced_YYYY.csv             (one file per year, 2017-2026)
"""

import os
import glob

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADVANCED_DIR = os.path.join(REPO_ROOT, 'advancedData')
OUTPUT_DIR = os.path.join(REPO_ROOT, 'data', 'yearly_data')


def aggregate_year(year: int) -> None:
    pattern = os.path.join(ADVANCED_DIR, str(year), f'*_wbb_advanced_{year}.csv')
    files = sorted(glob.glob(pattern))
    if not files:
        print(f'  No files found for {year}, skipping.')
        return

    output_path = os.path.join(OUTPUT_DIR, f'sr_advanced_{year}.csv')
    written = 0
    with open(output_path, 'w', encoding='utf-8', newline='') as out:
        for i, filepath in enumerate(files):
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            if not lines:
                continue
            if i == 0:
                # Write header from first file
                out.write(lines[0])
            # Write data rows (skip header row for all files)
            for line in lines[1:]:
                if line.strip():
                    out.write(line)
                    written += 1

    print(f'  {year}: {written} rows from {len(files)} team files → {output_path}')


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print('Aggregating advanced stats CSVs...')
    for year in range(2017, 2027):
        aggregate_year(year)
    print('Done.')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run the script and verify output**

```bash
cd /Users/sampath/BSA-Basketball-W26
python scripts/aggregate_advanced_stats.py
```

Expected output: 10 lines like `  2017: 4NNN rows from 364 team files → ...`

Then verify a spot-check:
```bash
head -3 data/yearly_data/sr_advanced_2017.csv
wc -l data/yearly_data/sr_advanced_2017.csv
# Should be ~4400 rows, header should match sr_advanced_2025.csv
head -1 data/yearly_data/sr_advanced_2017.csv
head -1 dashboard/src/app/data/sr_advanced_2025.csv
# Both header lines should be identical
```

- [ ] **Step 3: Commit the script and generated files**

```bash
git add scripts/aggregate_advanced_stats.py data/yearly_data/sr_advanced_*.csv
git commit -m "feat: add advanced stats aggregation script + generated yearly files"
```

---

### Task 2: Set Up Public Data Directory

**Files:**
- Create dir: `dashboard/public/data/`
- Delete: `dashboard/src/app/data/sr_data_2025.csv`
- Delete: `dashboard/src/app/data/sr_advanced_2025.csv`
- Delete: `dashboard/src/app/data/on3_wbb_transfers_2025.csv`
- Delete: `dashboard/src/app/data/sr_class_years_2025.csv`

- [ ] **Step 1: Copy all CSVs to public/data/**

```bash
mkdir -p dashboard/public/data

# Basic stats (2017-2026)
cp data/yearly_data/sr_data_*.csv dashboard/public/data/

# Advanced stats (2017-2026, just generated)
cp data/yearly_data/sr_advanced_*.csv dashboard/public/data/

# 2025-only supplemental files
cp dashboard/src/app/data/on3_wbb_transfers_2025.csv dashboard/public/data/
cp dashboard/src/app/data/sr_class_years_2025.csv dashboard/public/data/
```

- [ ] **Step 2: Verify the files are there (22 total)**

**⚠️ This step must come AFTER Task 1 (the aggregation script) is complete. The `sr_advanced_*.csv` files do not exist until the script runs.**

File count breakdown: 10 basic (`sr_data_2017–2026`) + 10 advanced (`sr_advanced_2017–2026`) + 2 supplemental (`on3` + `class_years`) = 22.

```bash
ls dashboard/public/data/ | wc -l
# Expected: 22
ls dashboard/public/data/
# Should show: sr_data_2017.csv ... sr_data_2026.csv,
#              sr_advanced_2017.csv ... sr_advanced_2026.csv,
#              on3_wbb_transfers_2025.csv, sr_class_years_2025.csv
```

**Note:** Only 4 CSV files from `src/app/data/` are deleted — `conferences.ts`, `schema.ts`, and `transferData.ts` must NOT be deleted.

- [ ] **Step 3: Delete the old static data files from src/**

```bash
rm dashboard/src/app/data/sr_data_2025.csv
rm dashboard/src/app/data/sr_advanced_2025.csv
rm dashboard/src/app/data/on3_wbb_transfers_2025.csv
rm dashboard/src/app/data/sr_class_years_2025.csv
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/public/data/
git add -u dashboard/src/app/data/
git commit -m "feat: move CSV data to public/data for dynamic fetching"
```

---

## Chunk 2: Data Layer

> **⚠️ Ordering:** Tasks 3–5 modify TypeScript source only and can be written before Task 2, but the `npm run dev` smoke-test in Task 7 will not work until Task 2 (public/data/ directory) is complete. Do not use `npm run dev` as a verification gate until after Task 2 is done.

### Task 3: Widen `TransferPlayer.year` Type

**Files:**
- Modify: `dashboard/src/app/data/schema.ts`

- [ ] **Step 1: Widen the `year` field in `TransferPlayer`**

In `schema.ts`, change line 60:
```typescript
// Before
year: Year;

// After
year: Year | null;
```

- [ ] **Step 2: Update the `goldToTransferPlayer` function signature and default**

The `overrides` parameter currently types `year` as `Year`. Update it to accept `Year | null`, and change the default so passing `null` explicitly works (use `undefined` check instead of nullish coalescing):

Replace the `overrides` type in the function signature:
```typescript
// Before
overrides?: Partial<Pick<TransferPlayer, 'name' | 'previousSchool' | 'year' | 'height' | 'availability'>>

// After (same — Pick<TransferPlayer, 'year'> now resolves to Year | null automatically after the type change)
overrides?: Partial<Pick<TransferPlayer, 'name' | 'previousSchool' | 'year' | 'height' | 'availability'>>
```

Then change the `year` line inside the returned object. Replace:
```typescript
year: overrides?.year ?? 'Junior',
```
With:
```typescript
year: overrides && 'year' in overrides ? overrides.year ?? null : null,
```

This ensures:
- 2025 path passes `year: classYear` (a `Year` value) → stored as-is
- New year paths pass no `year` override → stored as `null`

- [ ] **Step 3: Check TypeScript compiles with no new errors from schema.ts**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -30
```

Expected errors at this stage (these are fixed in later tasks, not now):
- `?raw` import errors — fixed in Task 4
- `filters.classYear.includes(player.year)` in `App.tsx` — fixed in Task 6 (null guard)
- `{player.year}` in `PlayerCard.tsx` — fixed in Task 9 (null guard)

**Do not use `tsc --noEmit` as a success gate between Tasks 3 and 9.** The type widening intentionally introduces downstream TS errors that are resolved only after all consumer files are updated.

There must be **no** new errors originating from `schema.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/app/data/schema.ts
git commit -m "feat: widen TransferPlayer.year to Year | null for multi-year support"
```

---

### Task 4: Refactor `transferData.ts` with `fetchYearData`

**Files:**
- Modify: `dashboard/src/app/data/transferData.ts`

The existing `parseCSV`, `num`, `stripMascot`, `parseOn3Transfers`, `parseClassYears`, `parseAdvancedStats` helper functions are all kept. Only the top-level imports and `getTransferPlayers` change.

**⚠️ Critical:** When refactoring `parseOn3Transfers`, preserve the exact column name strings used to read from the CSV rows — `r['Name']`, `r['Class Rank']`, `r['Previous Team']`, `r['New Team']`, `r['Status']`, `r['Date']`. These match the actual CSV headers exactly. Changing them silently produces an empty ON3 map.

- [ ] **Step 1: Replace static imports with `fetchYearData`**

Replace the entire file with the following (all internal helpers are preserved verbatim):

```typescript
/**
 * Transfer dashboard data layer.
 * Fetches CSV data from /data/ at runtime (served from dashboard/public/data/).
 */

import type { GoldPlayerPerGame, TransferPlayer, TransferStatus } from './schema';
import { goldToTransferPlayer, mapClassRank } from './schema';
import { getConference } from './conferences';

export type { TransferPlayer } from './schema';

// ---------------------------------------------------------------------------
// CSV parsing utilities (unchanged)
// ---------------------------------------------------------------------------

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.trim().split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).filter(line => line.trim() !== '').map(line => {
    const values = line.split(',');
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header.trim()] = (values[i] ?? '').trim();
    });
    return record;
  });
}

function num(val: string | undefined): number {
  const n = parseFloat(val ?? '');
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// 2025-only: ON3 transfer data
// ---------------------------------------------------------------------------

interface On3TransferRecord {
  name: string;
  classRank: string;
  previousTeam: string;
  newTeam: string;
  status: string;
  date: string;
}

function parseOn3Transfers(raw: string): Map<string, On3TransferRecord> {
  const rows = parseCSV(raw);
  const byName = new Map<string, On3TransferRecord>();

  for (const r of rows) {
    const key = (r['Name'] || '').toLowerCase().trim();
    if (!key) continue;

    const record: On3TransferRecord = {
      name: r['Name'] || '',
      classRank: r['Class Rank'] || '',
      previousTeam: r['Previous Team'] || '',
      newTeam: r['New Team'] || '',
      status: r['Status'] || '',
      date: r['Date'] || '',
    };

    const existing = byName.get(key);
    if (!existing || record.date > existing.date) {
      byName.set(key, record);
    }
  }

  for (const [key, record] of byName) {
    if (record.status === 'Withdrawn') {
      byName.delete(key);
    }
  }

  return byName;
}

function stripMascot(fullTeamName: string): string {
  if (!fullTeamName) return '';
  const parts = fullTeamName.trim().split(/\s+/);
  if (parts.length <= 1) return fullTeamName;
  const knownTwoWordMascots = ['tar heels', 'fighting irish', 'scarlet knights',
    'golden eagles', 'mean green', 'red storm', 'blue devils',
    'yellow jackets', 'horned frogs', 'nittany lions', 'lady vols',
    'red raiders', 'golden gophers', 'banana slugs'];
  const lower = fullTeamName.toLowerCase();
  for (const mascot of knownTwoWordMascots) {
    if (lower.endsWith(mascot)) {
      return fullTeamName.slice(0, lower.lastIndexOf(mascot)).trim();
    }
  }
  return parts.slice(0, -1).join(' ');
}

// ---------------------------------------------------------------------------
// 2025-only: class year data
// ---------------------------------------------------------------------------

function parseClassYears(raw: string): Map<string, string> {
  const rows = parseCSV(raw);
  const byLink = new Map<string, string>();
  for (const r of rows) {
    const link = (r['player_sr_link'] || '').trim();
    const cls = (r['class'] || '').trim();
    if (link && cls) byLink.set(link, cls);
  }
  return byLink;
}

// ---------------------------------------------------------------------------
// Advanced stats (all years)
// ---------------------------------------------------------------------------

function parseAdvancedStats(raw: string): Map<string, { tsPercentage: number; obpm: number; dbpm: number }> {
  const rows = parseCSV(raw);
  const byLink = new Map<string, { tsPercentage: number; obpm: number; dbpm: number }>();
  for (const r of rows) {
    const link = (r['player_sr_link'] || '').trim();
    if (!link) continue;
    byLink.set(link, {
      tsPercentage: num(r['ts_pct']) * 100,
      obpm: num(r['obpm']),
      dbpm: num(r['dbpm']),
    });
  }
  return byLink;
}

// ---------------------------------------------------------------------------
// Core fetch + parse function
// ---------------------------------------------------------------------------

async function fetchText(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  return res.text();
}

export async function fetchYearData(year: number): Promise<TransferPlayer[]> {
  // Fetch basic + advanced CSVs in parallel (always)
  const [basicRaw, advancedRaw] = await Promise.all([
    fetchText(`/data/sr_data_${year}.csv`),
    fetchText(`/data/sr_advanced_${year}.csv`),
  ]);

  // For 2025 only: also fetch ON3 and class year data
  let on3Map = new Map<string, On3TransferRecord>();
  let classYearMap = new Map<string, string>();
  if (year === 2025) {
    const [on3Raw, classYearRaw] = await Promise.all([
      fetchText('/data/on3_wbb_transfers_2025.csv'),
      fetchText('/data/sr_class_years_2025.csv'),
    ]);
    on3Map = parseOn3Transfers(on3Raw);
    classYearMap = parseClassYears(classYearRaw);
  }

  const advancedMap = parseAdvancedStats(advancedRaw);
  const rows = parseCSV(basicRaw);

  return rows.map((r, i) => {
    const gold: GoldPlayerPerGame = {
      player_sr_link: r.player_sr_link,
      player_name: r.player_name,
      team_name_abbr: r.school,
      pos: r.pos,
      games: num(r.games),
      games_started: num(r.games_started),
      mp_per_g: num(r.mp_per_g),
      fg_pct: num(r.fg_pct),
      fg3_pct: num(r.fg3_pct),
      ft_pct: num(r.ft_pct),
      pts_per_g: num(r.pts_per_g),
      trb_per_g: num(r.trb_per_g),
      ast_per_g: num(r.ast_per_g),
      stl_per_g: num(r.stl_per_g),
      blk_per_g: num(r.blk_per_g),
    };

    // Class year: SR roster data (2025 only) or null.
    // For 2025 players not found in classYearMap, classYear is null — this is
    // intentional. The old fallback of 'Junior' is removed; unknown class year
    // is represented as null rather than a misleading default.
    const srClass = classYearMap.get(r.player_sr_link || '');
    const classYear = srClass ? mapClassRank(srClass) : null;

    const player: TransferPlayer = {
      ...goldToTransferPlayer(gold, i, {
        name: r.player_name || `Player ${i}`,
        previousSchool: r.school || 'Unknown',
        year: classYear,
        height: '—',
        availability: 'Available',
      }),
    };

    player.conference = getConference(r.school || '');

    const advanced = advancedMap.get(r.player_sr_link || '');
    if (advanced) {
      player.stats.tsPercentage = advanced.tsPercentage;
      player.stats.obpm = advanced.obpm;
      player.stats.dbpm = advanced.dbpm;
    }

    if (year === 2025) {
      const on3 = on3Map.get(player.name.toLowerCase().trim());
      if (on3) {
        player.transferInfo = {
          classYear: mapClassRank(on3.classRank),
          previousTeam: on3.previousTeam,
          newTeam: on3.status === 'Committed' ? stripMascot(on3.newTeam) : null,
          status: on3.status as TransferStatus,
        };
        player.availability = on3.status === 'Committed' ? 'Committed' : 'Available';
      }
    }

    return player;
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors. (The old `?raw` import errors are now gone.)

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/app/data/transferData.ts
git commit -m "feat: replace static CSV imports with fetchYearData() async function"
```

---

### Task 5: Create `YearDataContext`

**Files:**
- Create: `dashboard/src/app/data/YearDataContext.tsx`

- [ ] **Step 1: Write the context**

```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchYearData } from './transferData';
import type { TransferPlayer } from './transferData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface YearDataContextValue {
  cache: Map<number, TransferPlayer[]>;
  loadYear: (year: number) => Promise<void>;
  loadingYears: Set<number>;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const YearDataContext = createContext<YearDataContextValue | null>(null);

export function useYearDataContext(): YearDataContextValue {
  const ctx = useContext(YearDataContext);
  if (!ctx) throw new Error('useYearDataContext must be used inside YearDataProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function YearDataProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Map<number, TransferPlayer[]>>(new Map());
  const [loadingYears, setLoadingYears] = useState<Set<number>>(new Set());
  const [error, setError] = useState<Error | null>(null);
  // cacheRef mirrors the cache state so loadYear can read it without
  // having cache as a dependency (which would cause infinite re-renders).
  const cacheRef = useRef<Map<number, TransferPlayer[]>>(new Map());
  // inFlight prevents duplicate fetches in React StrictMode double-invoke.
  const inFlight = useRef<Set<number>>(new Set());

  // Keep cacheRef in sync with cache state.
  cacheRef.current = cache;

  // loadYear is stable (empty deps) because it reads cacheRef, not cache state.
  // Order: check cacheRef first, then inFlight, then fetch.
  const loadYear = useCallback(async (year: number): Promise<void> => {
    if (cacheRef.current.has(year) || inFlight.current.has(year)) return;

    inFlight.current.add(year);
    setLoadingYears(prev => new Set(prev).add(year));

    try {
      const players = await fetchYearData(year);
      cacheRef.current.set(year, players); // keep ref in sync immediately
      setCache(prev => new Map(prev).set(year, players));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      inFlight.current.delete(year);
      setLoadingYears(prev => {
        const next = new Set(prev);
        next.delete(year);
        return next;
      });
    }
  }, []); // stable — reads refs, not state

  return (
    <YearDataContext.Provider value={{ cache, loadYear, loadingYears, error }}>
      {children}
    </YearDataContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useYearData(year: number): {
  players: TransferPlayer[];
  isLoading: boolean;
  error: Error | null;
} {
  const { cache, loadYear, loadingYears, error } = useYearDataContext();

  useEffect(() => {
    loadYear(year);
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    players: cache.get(year) ?? [],
    isLoading: loadingYears.has(year),
    error,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/app/data/YearDataContext.tsx
git commit -m "feat: add YearDataContext with per-year caching and loading state"
```

---

## Chunk 3: Year Picker UI

### Task 6: Wire `App.tsx` with Year State

**Files:**
- Modify: `dashboard/src/app/App.tsx`

- [ ] **Step 1: Add `activeYear` state + wrap with `YearDataProvider` + replace static player load**

Make the following changes to `App.tsx`:

**Imports to add:**
```typescript
import { YearDataProvider, useYearData } from './data/YearDataContext';
```

**Remove this import:**
```typescript
import { getTransferPlayers, type TransferPlayer } from './data/transferData';
```

**Add this import:**
```typescript
import type { TransferPlayer } from './data/transferData';
```

**Split `App` into an inner component `AppInner` and an outer `App`:**

The outer `App` just wraps with the provider:
```tsx
export default function App() {
  return (
    <YearDataProvider>
      <AppInner />
    </YearDataProvider>
  );
}
```

**Rename the existing `App` function to `AppInner` and make the following changes inside it:**

1. Remove:
   ```typescript
   const players = useMemo(() => getTransferPlayers(), []);
   const allTeams = useMemo(() => [...new Set(players.map((p) => p.previousSchool))].sort(), [players]);
   ```

2. Add at the top of `AppInner`:
   ```typescript
   const [activeYear, setActiveYear] = useState(2025);
   const { players, isLoading: yearLoading } = useYearData(activeYear);
   const allTeams = useMemo(() => [...new Set(players.map((p) => p.previousSchool))].sort(), [players]);
   ```

3. Add a `handleYearChange` callback:
   ```typescript
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

   const handleYearChange = useCallback((year: number) => {
     setActiveYear(year);
     setFilters(DEFAULT_FILTERS);
     setDisplayLimit(10);
     setSelectedPlayers([]);
     setSearchQuery('');
   }, []);
   ```

4. Update the `filteredPlayers` filter to guard against null `player.year`:
   ```typescript
   // Change this line:
   if (filters.classYear.length > 0 && !filters.classYear.includes(player.year)) return false;
   // To:
   if (filters.classYear.length > 0 && (player.year === null || !filters.classYear.includes(player.year))) return false;
   ```

5. Pass `activeYear`, `onYearChange`, and `yearIsLoading` to `FilterPanel`:
   ```tsx
   <FilterPanel
     filters={filters}
     onFilterChange={setFilters}
     teams={allTeams}
     conferences={ALL_CONFERENCES}
     activeYear={activeYear}
     onYearChange={handleYearChange}
   />
   ```

6. In the player list section, wrap the player grid with a loading state. Replace the player grid `<div>` block:
   ```tsx
   {yearLoading ? (
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
           />
         ))}
       </div>
       {filteredPlayers.length === 0 && !yearLoading && (
         <div className="text-center py-12 text-muted-foreground">
           <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
           <p>No players match the current filters</p>
         </div>
       )}
     </>
   )}
   ```

7. Update the footer season label:
   ```tsx
   // Change:
   <p className="mt-1 opacity-60">Data: Sports Reference 2024-25 season</p>
   // To (derive from activeYear):
   <p className="mt-1 opacity-60">Data: Sports Reference {activeYear - 1}-{String(activeYear).slice(2)} season</p>
   ```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors about `FilterPanel` missing new props — those get fixed in Task 7.

- [ ] **Step 3: Commit (partial — FilterPanel update pending)**

```bash
git add dashboard/src/app/App.tsx
git commit -m "feat: wire App.tsx with year state and YearDataProvider"
```

---

### Task 7: Add Year Selector to `FilterPanel`

**Files:**
- Modify: `dashboard/src/app/components/FilterPanel.tsx`

- [ ] **Step 1: Add `activeYear` and `onYearChange` props**

Update the `FilterPanelProps` interface:
```typescript
interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  teams: string[];
  conferences: string[];
  activeYear: number;
  onYearChange: (year: number) => void;
}
```

Update the function signature:
```typescript
export function FilterPanel({ filters, onFilterChange, teams, conferences, activeYear, onYearChange }: FilterPanelProps) {
```

- [ ] **Step 2: Add the year selector at the top of the filter panel**

After the `<div className="flex items-center justify-between mb-5">` header block (around line 95), add the year selector as the first item in the `<div className="space-y-5">`:

```tsx
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
```

- [ ] **Step 3: Disable the Transfer Only toggle when year ≠ 2025**

Replace the Transfer Only toggle section with:
```tsx
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
```

- [ ] **Step 4: Verify TypeScript compiles with zero errors**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 5: Smoke test in browser**

```bash
cd dashboard && npm run dev
```

Open `http://localhost:5173`. Verify:
- Year selector appears at top of filter panel, defaults to 2025-26 season (i.e., `activeYear=2025`)
- Data loads and players appear (same as before)
- Switching to 2022 clears filters, shows loading spinner, then shows 2021-22 season players
- Transfer Only toggle is grayed out for non-2025 years

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/app/components/FilterPanel.tsx
git commit -m "feat: add year selector to FilterPanel with transfer-only disable for non-2025"
```

---

## Chunk 4: Career View

### Task 8: Create `CareerModal`

**Files:**
- Create: `dashboard/src/app/components/CareerModal.tsx`

The modal fetches all years in parallel on open, assembles `CareerSeason[]` from the cache, then renders a tabbed `LineChart` and a year-by-year stats table.

- [ ] **Step 1: Write `CareerModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { X, TrendingUp, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useYearDataContext } from '../data/YearDataContext';
import type { TransferPlayer } from '../data/transferData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CareerSeason {
  year: number;
  season: string;
  school: string;
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
                      {['Season', 'School', 'GP', 'PPG', 'RPG', 'APG', 'FG%', '3P%', 'FT%', 'MPG', 'TS%', 'OBPM', 'DBPM'].map(col => (
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
                        <td className="py-2 pr-3 text-foreground">{s.gp}</td>
                        <td className="py-2 pr-3 text-primary font-semibold">{s.ppg.toFixed(1)}</td>
                        <td className="py-2 pr-3 text-foreground">{s.rpg.toFixed(1)}</td>
                        <td className="py-2 pr-3 text-foreground">{s.apg.toFixed(1)}</td>
                        <td className="py-2 pr-3 text-foreground">{s.fgPct > 0 ? `${s.fgPct.toFixed(1)}%` : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.threePct > 0 ? `${s.threePct.toFixed(1)}%` : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.ftPct > 0 ? `${s.ftPct.toFixed(1)}%` : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.mpg.toFixed(1)}</td>
                        <td className="py-2 pr-3 text-foreground">{s.tsPct > 0 ? `${s.tsPct.toFixed(1)}%` : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.obpm !== 0 ? s.obpm.toFixed(1) : '—'}</td>
                        <td className="py-2 pr-3 text-foreground">{s.dbpm !== 0 ? s.dbpm.toFixed(1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/app/components/CareerModal.tsx
git commit -m "feat: add CareerModal with career trend chart and year-by-year stats table"
```

---

### Task 9: Add Career Button to `PlayerCard` and Wire Modal in `App.tsx`

**Files:**
- Modify: `dashboard/src/app/components/PlayerCard.tsx`
- Modify: `dashboard/src/app/App.tsx`

- [ ] **Step 1: Update `PlayerCard` props and add the Career button**

Update the `PlayerCardProps` interface:
```typescript
interface PlayerCardProps {
  player: TransferPlayer;
  onClick: (player: TransferPlayer) => void;
  isSelected: boolean;
  onCareerClick: (player: TransferPlayer) => void;
}
```

Update the function signature:
```typescript
export const PlayerCard = memo(function PlayerCard({ player, onClick, isSelected, onCareerClick }: PlayerCardProps) {
```

Add `History` to the lucide-react import:
```typescript
import { Award, TrendingUp, ExternalLink, ArrowRight, History } from 'lucide-react';
```

Replace the null-unsafe year display (line ~42). Change:
```tsx
<span className="bg-card-elevated text-muted-foreground px-2 py-0.5 rounded-md">
  {player.year}
</span>
```
To:
```tsx
<span className="bg-card-elevated text-muted-foreground px-2 py-0.5 rounded-md">
  {player.year ?? '—'}
</span>
```

In the `player.playerLink` section at the bottom of the card, add the Career button alongside the existing external link:

Replace:
```tsx
{player.playerLink && (
  <div className="mt-3 pt-2 border-t border-border">
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
  </div>
)}
```

With:
```tsx
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
```

- [ ] **Step 2: Wire `CareerModal` in `App.tsx`**

Add to imports in `App.tsx`:
```typescript
import { CareerModal } from './components/CareerModal';
```

Add state for the career modal (inside `AppInner`):
```typescript
const [careerPlayer, setCareerPlayer] = useState<TransferPlayer | null>(null);
```

Add a `handleCareerClick` callback:
```typescript
const handleCareerClick = useCallback((player: TransferPlayer) => {
  setCareerPlayer(player);
}, []);
```

Pass `onCareerClick` to `PlayerCard`:
```tsx
<PlayerCard
  key={player.id}
  player={player}
  onClick={handlePlayerClick}
  isSelected={selectedIds.has(player.id)}
  onCareerClick={handleCareerClick}
/>
```

Add the `CareerModal` below the `PlayerComparisonModal`:
```tsx
{careerPlayer && (
  <CareerModal
    player={careerPlayer}
    onClose={() => setCareerPlayer(null)}
  />
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 4: Full smoke test in browser**

```bash
cd dashboard && npm run dev
```

Verify:
1. App loads, 2025 season shows by default
2. Year selector switches seasons; player list updates; filters reset
3. Transfer Only is disabled for non-2025 years
4. Each player card with a `player_sr_link` shows a "Career" button in the footer
5. Clicking "Career" opens the modal
6. Modal shows loading spinner, then career chart and table appear
7. Tab switching (Scoring / Efficiency / Boards & Playmaking) updates the chart
8. Clicking outside the modal or the X button closes it
9. Comparison flow (clicking card body) still works as before
10. Dark/light theme applies to the modal

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/app/components/PlayerCard.tsx dashboard/src/app/App.tsx
git commit -m "feat: add Career button to PlayerCard and wire CareerModal in App"
```

---

## Final Check

- [ ] **Build to confirm no compile errors in production bundle**

```bash
cd dashboard && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Final commit if any last tweaks were made**

```bash
git add -u
git commit -m "feat: multi-year stats support complete"
```
