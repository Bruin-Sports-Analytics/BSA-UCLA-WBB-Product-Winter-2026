# Career Similarity Score — Design Spec

> **For agentic workers:** Use superpowers:writing-plans to create an implementation plan from this spec.

**Goal:** Add a "Similar Career Trajectories" section to the Career Modal that shows historically similar players from the 2017–2026 dataset, ranked by DTW similarity on their full career stat arcs.

**Architecture:** Offline Python script computes pairwise DTW distances and writes a static JSON index; the frontend fetches it lazily and renders results inside the existing CareerModal component.

**Tech Stack:** Python + scikit-learn + dtaidistance (offline); React + Recharts (frontend); static JSON served from `dashboard/public/data/`

---

## Algorithm & Data Pipeline

### Input Data

The script reads from three CSV families already in `dashboard/public/data/`:
- `sr_data_{year}.csv` — per-game stats (2017–2026)
- `sr_advanced_{year}.csv` — advanced stats including `ts_pct`, `obpm`, `dbpm` (2017–2026)
- `sr_class_years_{year}.csv` — class year per player-season (2017–2026, all 10 files present)

### CSV Column Mapping

The 10 feature names used in this spec map to CSV columns as follows:

| Feature alias | CSV column (`sr_data_*.csv`) |
|---|---|
| `ppg` | `pts_per_g` |
| `rpg` | `trb_per_g` |
| `apg` | `ast_per_g` |
| `spg` | `stl_per_g` |
| `bpg` | `blk_per_g` |
| `fg_pct` | `fg_pct` |
| `fg3_pct` | `fg3_pct` |
| `ft_pct` | `ft_pct` |
| `mp_per_g` | `mp_per_g` |
| `ts_pct` | `ts_pct` (from `sr_advanced_*.csv`) |

### Class Year Mapping

The `sr_class_years_{year}.csv` files store full English class year names. Map them to abbreviations before use:

| CSV value | Abbreviation |
|---|---|
| `Freshman` | `FR` |
| `Sophomore` | `SO` |
| `Junior` | `JR` |
| `Senior` | `SR` |
| `Graduate` | `GR` |

For redshirt entries (e.g., `RedShirt Freshman`, `RedShirt Sophomore`), strip the `RedShirt ` prefix before mapping. So `RedShirt Junior` → `JR`. Any remaining unrecognized value is treated as unknown and written to JSON as the empty string `""`. The `SimilarPlayersSection` component renders an empty string class label as `"?"` in the stat season rows.

### Class Year Assignment per Season

Each `sr_class_years_{year}.csv` contains one row per player with their class year for that calendar year (the year in the filename). To assign a class year to a player-season:
- A player-season from `sr_data_{year}.csv` is matched to `sr_class_years_{year}.csv` by `player_sr_link` and the same `year`.
- If a player appears in multiple year files (e.g., 2024 and 2025), each season gets the class year from its own year's file independently.
- If a player's link is not found in the class year file for that year, that season's class is unknown.

### Career Vector Construction

For each player (identified by `player_sr_link`):
1. Collect all rows from `sr_data_{year}.csv` across all years. Before filtering, deduplicate rows with the same (`player_sr_link`, `season`) pair (which occurs when a player transferred mid-season): keep the row with the **higher `games` value**. If tied, keep the last row encountered.
2. Apply quality filter: keep only rows where `games >= 8`.
3. Join with `sr_advanced_{year}.csv` using a **left join** on `player_sr_link` + `season` string (e.g., `"2025-26"`). Apply the same deduplication rule to `sr_advanced` before joining (keep highest-games row per `player_sr_link`+`season`). Seasons with no matching advanced row get `ts_pct = 0.0`. The `season` column values are assumed to use the same format (e.g., `"2025-26"`) in both `sr_data_*` and `sr_advanced_*` CSVs; the script should print a warning if the total join match rate falls below 50% across all rows, which would indicate a format mismatch.
4. Assign class year abbreviation (FR/SO/JR/SR/GR) from `sr_class_years_{year}.csv` for the corresponding year, using the mapping above. If not found, treat as unknown.
5. Sort seasons by class year order: FR → SO → JR → SR → GR. For seasons with unknown class year, append them after the known-class seasons ordered by calendar year ascending. If a player has two seasons with the same class year label (e.g., two Junior seasons after a transfer), keep both in chronological order — do not deduplicate.
6. Build a sequence of 10-feature vectors per season using the column mapping above:
   ```
   [ppg, rpg, apg, spg, bpg, fg_pct, fg3_pct, ft_pct, ts_pct, mp_per_g]
   ```
   Missing values (e.g., `fg3_pct` for a player with 0 three-point attempts, stored as empty string) → fill with `0.0`.
7. Discard players with fewer than 2 qualifying seasons (not enough trajectory to compare).
8. Normalize all features using `StandardScaler` fit on the full population (all player-seasons), so no single stat dominates.

### Position Normalization

SR position values (`pos` column) must be mapped consistently with the existing frontend schema. Use this exact mapping (matching `schema.ts` logic):

| SR `pos` value | Normalized position |
|---|---|
| `G` | `G` |
| `G-F`, `F-G` | `F` |
| `F` | `F` |
| `F-C`, `C-F` | `C` |
| `C` | `C` |
| Any other / unknown | `G` (default fallback, same as `schema.ts`) |

Use the normalized position from the player's **most recent season** for grouping. Only compare players within the same normalized position group.

### `school` Field

Use the `school` value verbatim from the player's **most recent season** row in `sr_data_{year}.csv` (highest calendar year). The value is the raw Sports Reference URL slug (e.g., `"abilene-christian"`), not a human-readable name. The frontend renders it as-is. If a player played for multiple schools in the same most-recent year, take the last row encountered in that year's CSV.

### Similarity Computation

- **Scope:** Only compare players with the same normalized position (G, F, or C).
- **Algorithm:** Dynamic Time Warping (DTW) via `dtaidistance.dtw_ndim.distance_fast` on the sequence of season vectors (each season is a 1D array of 10 features, so the input is an N×10 numpy array). DTW handles careers of different lengths without padding artifacts.
- **Scale parameter:** Convert DTW distance to a 0–100 score:
  ```
  score = 100 * exp(-distance / scale)
  ```
  Compute `scale` as the **median pairwise DTW distance across all pairs within the position group**. For groups where all-pairs computation would exceed 5M pairs (i.e., more than ~3,200 players), take a random sample of 2,000 players (seeded with `random_state=42`) and compute the median over all pairs within that sample. Use the same `scale` value for all players in the group regardless of whether they were in the sample.
- **Output per player:** Top 10 matches by score, excluding the player themselves.

### Output File

`dashboard/public/data/similarity_index.json`

```json
{
  "https://www.sports-reference.com/cbb/players/jane-doe-1.html": [
    {
      "player_link": "https://www.sports-reference.com/cbb/players/alice-smith-1.html",
      "player_name": "Alice Smith",
      "school": "california-los-angeles",
      "position": "G",
      "year_start": 2019,
      "year_end": 2022,
      "seasons": [
        {"class": "FR", "year": 2019, "ppg": 8.2, "rpg": 2.1, "apg": 3.4},
        {"class": "SO", "year": 2020, "ppg": 12.5, "rpg": 2.8, "apg": 4.1},
        {"class": "JR", "year": 2021, "ppg": 15.3, "rpg": 3.2, "apg": 5.0}
      ],
      "score": 91.4
    }
  ]
}
```

`year_start` = calendar year of the player's first qualifying season; `year_end` = calendar year of last qualifying season. These are used for the "years active" display label (always shown as `year_start–year_end`, never broken by gaps). Each match's `seasons` array contains only the 3 display stats (ppg, rpg, apg) plus class label and calendar year — not the full 10-feature vector.

Estimated file size: 10–25MB.

### Script

`scripts/compute_similarity.py`

- Reads all CSV files from `dashboard/public/data/`
- Prints progress per position group
- Idempotent: overwrites output each run
- Run after any data update: `python3 scripts/compute_similarity.py`

---

## Frontend

### TypeScript Types

Define in `dashboard/src/app/data/similarityTypes.ts`:

```ts
export interface SimilarSeason {
  class: string;   // "FR" | "SO" | "JR" | "SR" | "GR" or unknown
  year: number;    // calendar year
  ppg: number;
  rpg: number;
  apg: number;
}

export interface SimilarPlayer {
  player_link: string;
  player_name: string;
  school: string;
  position: string;
  year_start: number;
  year_end: number;
  seasons: SimilarSeason[];
  score: number;   // 0–100
}

// Map from player_sr_link → top matches
export type SimilarityIndex = Record<string, SimilarPlayer[]>;
```

### Data Loading — SimilarityContext

`dashboard/src/app/data/SimilarityContext.tsx`

- Fetches `/data/similarity_index.json` **once** on mount using `fetch()`.
- Parses with `JSON.parse`. If fetch fails (non-200) or parse throws, sets `index` to `null` and `error` to the caught error — does not throw or crash the app.
- Exposes `{ index: SimilarityIndex | null, isLoading: boolean, error: Error | null }` via context.
- Wrapped at the `App` level (in `App.tsx`) alongside `YearDataProvider`.

```ts
const SimilarityContext = createContext<{
  index: SimilarityIndex | null;
  isLoading: boolean;
  error: Error | null;
}>({ index: null, isLoading: true, error: null });
```

The `CareerModal` does **not** call `useSimilarity()`. Only `SimilarPlayersSection` calls `useSimilarity()`. `SimilarityContext.tsx` exports two things: the `useSimilarity` hook and a `SimilarityProvider` component. `App.tsx` imports and renders `<SimilarityProvider>` to wrap the app.

### Entry Point

The similarity section lives at the bottom of the existing **CareerModal** (`dashboard/src/app/components/CareerModal.tsx`). It appears below the career stats table, separated by a section divider.

### UI: "Similar Career Trajectories" Section

**Header:**
```
Similar Career Trajectories
Based on full career stat arc · Same position · Powered by DTW
```

**Match Cards (one per similar player):**

Each card is a horizontal row (`flex` layout) containing:
- **Left column:** Player name (bold), school, years active label (`year_start–year_end`)
- **Center column:** PPG sparkline — a Recharts `LineChart` with one data point per season (x = season index, y = ppg). Width: 120px, height: 40px. No axes, no tooltip, just the line. Use `dot={false}` and a single `Line` with `stroke="var(--color-primary)"`.
- **Right column:** Similarity score badge (pill shape, color-coded):
  - score ≥ 80: `text-emerald-400 bg-emerald-500/15 border-emerald-500/30`
  - score 60–79: `text-amber-400 bg-amber-500/15 border-amber-500/30`
  - score < 60: `text-muted-foreground bg-card-elevated border-border`
  - Display as: `"91%"` — use `Math.round(score)` to convert the float to integer, then append `%`. The `%` suffix is intentional as a user-facing label even though the underlying value is a dimensionless 0–100 exponential score, not a statistical percentage.

**Below name:** 3 stat pills showing final season (last entry in `seasons` array): PPG, RPG, APG formatted as `"PPG 15.3"`.

**Display count:** Show top 5 by default. A "Show 5 more" button (text button, no border) expands to all 10. Button disappears once expanded.

**Empty states:**
- If `isLoading`: show a subtle skeleton/spinner, same style as the year loading spinner in `App.tsx`.
- If `error !== null`: show "Similarity data unavailable." (no details to user).
- If player's `player_sr_link` is not found in `index`: show "Not enough career data to compute similarity (requires ≥ 2 seasons)."

### New Component

`dashboard/src/app/components/SimilarPlayersSection.tsx`

```ts
interface SimilarPlayersSectionProps {
  playerLink: string;  // player_sr_link of the player currently shown in CareerModal
}
```

Reads `SimilarityContext` internally via `useSimilarity()`. Renders the section header + match cards. Self-contained — `CareerModal` just renders `<SimilarPlayersSection playerLink={player.playerLink} />` with no other props.

---

## Files Changed

| File | Action |
|---|---|
| `scripts/compute_similarity.py` | Create — offline DTW computation |
| `dashboard/public/data/similarity_index.json` | Create — generated static asset (run script to produce) |
| `dashboard/src/app/data/similarityTypes.ts` | Create — TypeScript types for similarity data |
| `dashboard/src/app/data/SimilarityContext.tsx` | Create — fetch + cache similarity index |
| `dashboard/src/app/components/SimilarPlayersSection.tsx` | Create — renders match cards + sparklines |
| `dashboard/src/app/components/CareerModal.tsx` | Modify — add `<SimilarPlayersSection>` below stats table |
| `dashboard/src/app/App.tsx` | Modify — wrap `AppInner` with `<SimilarityProvider>` |

No changes to `schema.ts`, `transferData.ts`, or any existing CSV files.

---

## Constraints & Edge Cases

- **Players with no class year data for some seasons:** Append those seasons after class-year-ordered seasons, sorted by calendar year.
- **Duplicate class year labels (e.g., two Junior seasons after transfer):** Keep both, in chronological order.
- **"Years active" display:** Always `year_start–year_end` (e.g., `2019–2022`). Gap years are not shown in the label.
- **JSON parse failure:** `SimilarityContext` catches the error, sets `index = null`, surfaces `error` for the empty state — never crashes the app.
- **Position normalization:** Must exactly match `schema.ts` mapping (G-F→F, F-C→C) so the position shown in the UI matches the group used for similarity.
- **Re-running the script:** Safe to re-run anytime; output is fully overwritten. Should be re-run whenever new season CSVs are added.
- **Fetch timing:** `SimilarityProvider` is mounted at the `App` level and starts fetching `similarity_index.json` immediately when the app loads. This is intentional — the fetch runs in the background so results are likely ready by the time a user opens their first Career modal. The JSON is only parsed and stored once; subsequent Career modal opens are instant lookups.
- **useSimilarity hook usage:** Only `SimilarPlayersSection` calls `useSimilarity()`. `CareerModal` does not call the hook — it simply renders `<SimilarPlayersSection playerLink={...} />` and lets that component handle all similarity context access.
- **scripts/ directory:** Already exists at repo root (`scripts/`). Add `dtaidistance` and `scikit-learn` to `scripts/requirements.txt` (create this file). Install with `pip install -r scripts/requirements.txt`.
