# Multi-Year Stats Support — Design Spec

**Date:** 2026-03-12
**Branch:** wbb-dashboard-super-tables
**Status:** Draft

---

## Overview

Add multi-year stats support to the BSA Women's Basketball Dashboard. Users can browse any season from 2017–2026 and view a player's full career trajectory (stats across all seasons they appear in).

**Use cases:**
1. **Season browser** — select a year to see all players for that season (default: 2025)
2. **Career view** — click a dedicated "Career" button on a player card to see their stats charted and tabled across every season they played

---

## Approach

**Dynamic fetch (Approach B):** CSV files are served from `dashboard/public/data/` and fetched on demand when a year is first selected. Already-loaded years are cached in React context, so switching back to a previously-viewed season is instant. The app bundle stays small.

---

## Section 1: Data Preparation

### Aggregation Script (`scripts/aggregate_advanced_stats.py`)

Reads per-team advanced CSV files from `advancedData/YYYY/` and concatenates them into a single `sr_advanced_YYYY.csv` per year, matching the column schema of the existing `sr_advanced_2025.csv`:

```
player_sr_link, player_name, school, season, pos, games, games_started, mp,
per, ts_pct, fg3a_per_fga_pct, fta_per_fga_pct, pprod, orb_pct, drb_pct,
trb_pct, ast_pct, stl_pct, blk_pct, tov_pct, usg_pct, ows, dws, ws,
ws_per_40, obpm, dbpm, bpm
```

**Critical:** Each per-team file begins with a header row. Write the header exactly once (from the first file) and skip the header row of every subsequent file.

**Note on raw decimal format:** `ts_pct` is stored as `.521` (leading-dot) in the source files. Copy as-is — the existing `parseFloat` handles leading-dot decimals correctly. No normalisation needed in the script.

Output goes to `data/yearly_data/sr_advanced_YYYY.csv` for years 2017–2026, including 2025 (the existing `sr_advanced_2025.csv` lives in `dashboard/src/app/data/`, not in `data/yearly_data/`, so the script must generate it there).

### Public Data Directory

**Sequencing (must be done in order):**
1. Run `scripts/aggregate_advanced_stats.py` to produce `sr_advanced_YYYY.csv` for all years (2017–2026) in `data/yearly_data/`
2. Copy all `sr_data_YYYY.csv` and `sr_advanced_YYYY.csv` (20 files), plus `on3_wbb_transfers_2025.csv` and `sr_class_years_2025.csv` (22 files total, ~18 MB) into `dashboard/public/data/`
3. Delete the old static data files from `dashboard/src/app/data/`: `sr_data_2025.csv`, `sr_advanced_2025.csv`, `on3_wbb_transfers_2025.csv`, `sr_class_years_2025.csv` (all moved to `public/data/`)

Create `dashboard/public/data/` (does not currently exist). All 22 CSV files are committed to git as static data assets (~18 MB total — this is intentional; Git LFS is not required for an internal dashboard of this size).

**ON3 / class year:** `transferInfo` will be `null` for non-2025 seasons; `year` (class year) will be `null` for non-2025. See type change in Section 2.

**Conference gaps:** A small number of historical schools (e.g., `hartford`, `new-haven`, `savannah-state`, `st-francis-ny`) are absent from `conferences.ts` (which reflects only the 2024-25 landscape). These resolve to `conference: ''` — correct, not a bug.

---

## Section 2: Data Layer

### Type Change: `TransferPlayer.year`

In `schema.ts`, widen `year` from `Year` to `Year | null`.

**Display for null year:**
- `PlayerCard.tsx` renders `player.year` — add a null guard: render `'—'` when `year` is `null`
- Class year filter (`FilterPanel`): null-year players are excluded when any class year filter is active, and included when "All" (no class year filter) is selected. No "Unknown" option is added.

### `fetchYearData(year: number): Promise<TransferPlayer[]>`

Replaces static data loading in `transferData.ts`. The current code parses basic stats and advanced stats separately and joins them — **this same two-path pattern must be preserved**:

1. Fetch `/data/sr_data_YYYY.csv` and `/data/sr_advanced_YYYY.csv` in parallel
2. Parse basic stats using existing `goldToTransferPlayer` logic (from `schema.ts`)
   - `goldToTransferPlayer` handles `fg_pct × 100`, `fg3_pct × 100`, `ft_pct × 100`, `fg2_pct × 100`
   - It does NOT handle `ts_pct`, `obpm`, or `dbpm` (those fields are not on `GoldPlayerPerGame`)
3. Parse advanced stats using existing `parseAdvancedStats` logic (from `transferData.ts`)
   - `parseAdvancedStats` handles `ts_pct × 100`, `obpm`, `dbpm` from the advanced CSV
4. Join basic + advanced rows by `player_sr_link`, same as current `getTransferPlayers()`
5. For 2025 only: also fetch ON3 and class year CSVs, apply existing merge logic
6. Return `TransferPlayer[]`

**Cross-year identity:** Use `playerLink` (mapped from `player_sr_link`) as the stable cross-season identifier. `TransferPlayer.id` is an index-based render-time identifier; do not use it for career correlation.

### `YearDataContext`

```typescript
interface YearDataContextValue {
  cache: Map<number, TransferPlayer[]>;
  loadYear: (year: number) => Promise<void>;
  loadingYears: Set<number>;   // per-year in-flight tracking
  error: Error | null;
}
```

**Context default:** `createContext<YearDataContextValue | null>(null)`. A custom hook `useYearDataContext()` throws a descriptive error if consumed outside `YearDataProvider`:

```typescript
function useYearDataContext(): YearDataContextValue {
  const ctx = useContext(YearDataContext);
  if (!ctx) throw new Error('useYearDataContext must be used inside YearDataProvider');
  return ctx;
}
```

**Immutable update pattern:** `loadingYears` and `cache` must never be mutated in place. Always replace with new instances to trigger React re-renders:
```typescript
setLoadingYears(prev => new Set(prev).add(year));
setLoadingYears(prev => { const s = new Set(prev); s.delete(year); return s; });
setCache(prev => new Map(prev).set(year, players));
```

**Error handling — single `error` slot behaviour:**
- `error` is set to the caught error when any fetch or parse fails; the failed year is removed from `loadingYears` and not added to `cache`
- Other in-flight requests for the same `loadYear()` call continue unaffected
- `error` is cleared to `null` when a retry is initiated (before re-fetching)
- A partial success (some years succeed, some fail) does not clear `error`; `error` will reflect the last failure
- Retry scope: re-fetch all years not yet in `cache` (same logic as initial open)

### `useYearData(year: number)`

```typescript
function useYearData(year: number): { players: TransferPlayer[], isLoading: boolean, error: Error | null }
```

Calls `loadYear(year)` on mount. `isLoading` derived as `loadingYears.has(year)`.

---

## Section 3: Year Picker UI

A year selector is added to the `FilterPanel` component (top of filter area, above existing filters).

- **Control:** `<select>` listing years 2017–2026, defaulting to 2025
- **Year change handler in `App.tsx`** (not inside FilterPanel):
  1. Calls `loadYear(newYear)`
  2. `setFilters(defaultFilters)` — resets all filter state to defaults
  3. `setDisplayLimit(10)` — resets pagination/display limit
  4. `setSelectedPlayers([])` — clears comparison selection (player `id` values are index-based and not stable across year fetches, so any prior selection must be cleared)
  5. Re-derives `allTeams` from the new year's player list once loaded
- **`transferOnly` toggle:** disabled and grayed out when active year ≠ 2025 (transfer data only exists for 2025); tooltip explains why. Auto-cleared when switching away from 2025.
- **Loading state:** spinner in player list area while `loadingYears.has(activeYear)` is true
- **Error state:** error banner in player list if `error` is set
- **Styling:** matches existing filter panel `<select>` styles, dark/light mode aware

---

## Section 4: Initial Data Load

`App.tsx` calls `loadYear(2025)` in a `useEffect` on mount (empty dependency array). This ensures the default 2025 data is fetched on first render, replacing the previous static import. The player list shows a loading spinner until the fetch completes.

---

## Section 5: Career View (`CareerModal`)

### PlayerCard Interaction Model

The existing card click handler (select for comparison, up to 3) is **preserved unchanged**. A separate **"Career" icon button** is added to the card's footer row — **only rendered when `player.playerLink` is defined** (same condition as the existing external link icon). It calls `event.stopPropagation()` to prevent triggering the card's comparison-selection click — the same pattern used for the existing external link icon in `PlayerCard.tsx`. `PlayerComparisonModal` is not changed.

### `CareerModal` Component

Same overlay + close button pattern as `PlayerComparisonModal`.

### Data Loading

On open, identify all years not yet in `cache`, then fetch them in parallel. Browser concurrent connection limits (~6 per origin) stagger requests naturally. Typical career spans 4–5 years (~8–10 requests), which completes promptly. Once cached, subsequent opens for the same player are instant.

Filter each loaded year's `TransferPlayer[]` by `playerLink === player.playerLink` to build `CareerSeason[]`:

```typescript
interface CareerSeason {
  year: number;      // the integer year argument passed to fetchYearData(year)
  season: string;    // from the CSV's season column (e.g., "2021-22")
  school: string;    // from the CSV's school column (Sports Reference slug, e.g., "iowa")
  stats: PlayerStats;
}
```

Note: `CareerSeason.year` is the integer year used to fetch the data (e.g., `2022`) — not parsed from the `season` column (which stores `"YYYY-YY"` format strings, not integers). Rows sorted chronologically ascending by `year`.

### Career Trend Chart (top half)

Recharts `LineChart` with `season` on the X-axis. Three preset tabs:

| Tab | Stats |
|-----|-------|
| **Scoring** | PPG, FG%, 3P%, FT% |
| **Efficiency** | TS%, OBPM, DBPM, MPG |
| **Boards & Playmaking** | RPG, APG, SPG, BPG |

Each stat is a distinct colored line with dots at each season. Single data point renders without crashing (no connecting line). All chart data comes from the fetched `CareerSeason[]` array — no synthetic or random data.

**Note:** The existing `PerformanceTrendChart` in `PlayerComparisonModal` (which uses `Math.random()`) is not modified — it serves the comparison view, not the career view.

### Year-by-Year Table (bottom half)

One row per season, sorted oldest-first. Columns:

| Season | School | GP | PPG | RPG | APG | FG% | 3P% | FT% | MPG | TS% | OBPM | DBPM |

`school` displays the Sports Reference slug value (e.g., `"iowa"`). Slug values are human-readable for most schools. A display-name mapping is out of scope for this feature.

### Loading & Error States

The modal opens immediately. While career year fetches are in flight, show a spinner inside the modal body. If `error` is set, show an error banner with a "Retry" button. Clicking Retry:
1. Clears `error` to `null`
2. Re-fetches all years not yet in `cache` (same logic as initial open)

---

## Data Flow Summary

```
App mounts
       │
       ▼
useEffect → loadYear(2025)

User selects year in FilterPanel dropdown
       │
       ▼
App.tsx year change handler:
  loadYear(newYear)
  setFilters(defaultFilters)
  setDisplayLimit(10)
  setSelectedPlayers([])
  disable/clear transferOnly if year ≠ 2025

loadYear(year):
  cache hit? → return immediately
  loadingYears.add(year) → new Set(...)
  fetch sr_data_YYYY.csv + sr_advanced_YYYY.csv (parallel)
    error? → set error, loadingYears.remove(year) → new Set(...)
    success? →
      parse basic (goldToTransferPlayer) + advanced (parseAdvancedStats) → join
      cache.set(year, players) → new Map(...)
      loadingYears.remove(year) → new Set(...)

User clicks Career button on PlayerCard
  event.stopPropagation()
  CareerModal opens immediately
  fetch all uncached years (parallel)
  filter each year by playerLink → CareerSeason[]
  render LineChart (tabbed) + stats table
```

---

## What Doesn't Change

- All existing filter controls (position, conference, PPG range, games, MPG, availability — except `transferOnly` is disabled for non-2025)
- Sort panel and sort logic
- `PlayerCard` visual design (except Career icon button in footer + null guard on `year`)
- `PlayerComparisonModal` and all comparison chart components
- Dark/light theme system
- Conference mapping in `conferences.ts`

---

## Files Affected

| File | Change |
|------|--------|
| `scripts/aggregate_advanced_stats.py` | **New** — aggregates per-team advanced CSVs into yearly files |
| `dashboard/public/data/` | **New dir** — 22 CSV files (~18 MB) committed as static data |
| `dashboard/src/app/data/` | Delete the 4 static CSV files (moved to `public/data/`) |
| `dashboard/src/app/data/schema.ts` | Widen `TransferPlayer.year` to `Year \| null` |
| `dashboard/src/app/data/transferData.ts` | Remove static imports; add `fetchYearData()` using existing parse functions |
| `dashboard/src/app/data/YearDataContext.tsx` | **New** — context, provider, `useYearDataContext`, `useYearData` |
| `dashboard/src/app/App.tsx` | Wrap with `YearDataProvider`; initial `loadYear(2025)` on mount; year change handler |
| `dashboard/src/app/components/FilterPanel.tsx` | Add year dropdown; disable `transferOnly` for non-2025 years |
| `dashboard/src/app/components/CareerModal.tsx` | **New** — career chart (tabbed) + year-by-year table |
| `dashboard/src/app/components/PlayerCard.tsx` | Add Career icon button with `stopPropagation`; null guard on `year` display |
