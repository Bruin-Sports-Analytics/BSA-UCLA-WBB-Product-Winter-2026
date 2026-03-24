# Career Similarity Score Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Similar Career Trajectories" section to the Career Modal showing historically similar players ranked by DTW similarity on their full career stat arcs.

**Architecture:** A Python script (`scripts/compute_similarity.py`) reads all 2017–2026 CSV data, computes pairwise DTW distances within position groups, and writes a static `similarity_index.json`. A React `SimilarityProvider` fetches this JSON once at app startup; a new `SimilarPlayersSection` component renders match cards with PPG sparklines inside the existing `CareerModal`.

**Tech Stack:** Python 3 + scikit-learn + dtaidistance (offline script); React + Recharts (frontend); static JSON at `dashboard/public/data/similarity_index.json`

**Spec:** `docs/superpowers/specs/2026-03-15-career-similarity-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/requirements.txt` | Create | Python deps: dtaidistance, scikit-learn |
| `scripts/compute_similarity.py` | Create | Offline DTW computation → writes similarity_index.json |
| `dashboard/public/data/similarity_index.json` | Generate | Static asset produced by running the script |
| `dashboard/src/app/data/similarityTypes.ts` | Create | TypeScript interfaces: SimilarSeason, SimilarPlayer, SimilarityIndex |
| `dashboard/src/app/data/SimilarityContext.tsx` | Create | Fetch + cache similarity_index.json; exports SimilarityProvider + useSimilarity hook |
| `dashboard/src/app/components/SimilarPlayersSection.tsx` | Create | Renders section header + match cards + PPG sparklines |
| `dashboard/src/app/components/CareerModal.tsx` | Modify | Add `<SimilarPlayersSection playerLink={player.playerLink} />` below stats table |
| `dashboard/src/app/App.tsx` | Modify | Wrap AppInner with `<SimilarityProvider>` |

---

## Chunk 1: Python script + static JSON

### Task 1: Python requirements file

**Files:**
- Create: `scripts/requirements.txt`

- [ ] **Step 1: Create `scripts/requirements.txt`**

```
dtaidistance
scikit-learn
```

- [ ] **Step 2: Install deps and verify**

```bash
pip install -r scripts/requirements.txt
python -c "import dtaidistance; import sklearn; print('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add scripts/requirements.txt
git commit -m "chore: add requirements.txt for similarity script"
```

---

### Task 2: Python similarity script

**Files:**
- Create: `scripts/compute_similarity.py`

This is the core offline computation. Read the spec section "Algorithm & Data Pipeline" carefully before implementing.

**Key facts about the CSVs (verified):**
- `dashboard/public/data/sr_data_{year}.csv` columns: `player_sr_link, player_name, school, season, pos, games, ..., pts_per_g, trb_per_g, ast_per_g, stl_per_g, blk_per_g, fg_pct, fg3_pct, ft_pct, mp_per_g`
- `dashboard/public/data/sr_advanced_{year}.csv` columns: `player_sr_link, player_name, school, season, pos, games, ..., ts_pct, obpm, dbpm`
- `dashboard/public/data/sr_class_years_{year}.csv` columns: `player_sr_link, class` — values are full English names: `Freshman`, `Sophomore`, `Junior`, `Senior`, `Graduate`
- The `season` column format is `"YYYY-YY"` (e.g., `"2024-25"`) in both sr_data and sr_advanced — these match for joining
- Years 2017–2026: all 10 sr_data, sr_advanced, and sr_class_years files exist

**Position normalization (must match `dashboard/src/app/data/schema.ts`):**
```python
def normalize_pos(pos: str) -> str:
    if pos in ('G',): return 'G'
    if pos in ('G-F', 'F-G', 'F'): return 'F'
    if pos in ('F-C', 'C-F', 'C'): return 'C'
    return 'G'  # default fallback
```

**Class year mapping:**
```python
CLASS_ORDER = ['FR', 'SO', 'JR', 'SR', 'GR']
CLASS_MAP = {
    'Freshman': 'FR', 'Sophomore': 'SO', 'Junior': 'JR',
    'Senior': 'SR', 'Graduate': 'GR',
}
def map_class(raw: str) -> str:
    stripped = raw.strip()
    if stripped.startswith('RedShirt '):
        stripped = stripped[len('RedShirt '):]
    return CLASS_MAP.get(stripped, '')  # '' = unknown

def class_sort_key(cls: str) -> int:
    if cls in CLASS_ORDER:
        return CLASS_ORDER.index(cls)
    return len(CLASS_ORDER)  # unknown → sort last
```

**10-feature vector per season (in this exact order):**
```
[pts_per_g, trb_per_g, ast_per_g, stl_per_g, blk_per_g,
 fg_pct, fg3_pct, ft_pct, ts_pct, mp_per_g]
```
Empty string values → fill with `0.0`.

**DTW function:** `dtaidistance.dtw_ndim.distance_fast(seq_a, seq_b)` where each sequence is an `np.ndarray` of shape `(N, 10)` (float64).

- [ ] **Step 1: Write the script**

Create `scripts/compute_similarity.py` with this complete implementation:

```python
"""
Compute pairwise DTW career similarity for WBB players (2017-2026).

Reads:
  dashboard/public/data/sr_data_{year}.csv
  dashboard/public/data/sr_advanced_{year}.csv
  dashboard/public/data/sr_class_years_{year}.csv

Writes:
  dashboard/public/data/similarity_index.json

Run: python3 scripts/compute_similarity.py
"""

import csv
import json
import math
import random
from pathlib import Path

import numpy as np
from sklearn.preprocessing import StandardScaler
from dtaidistance import dtw_ndim

DATA_DIR = Path("dashboard/public/data")
OUTPUT = DATA_DIR / "similarity_index.json"
YEARS = list(range(2017, 2027))
FEATURES = ["pts_per_g", "trb_per_g", "ast_per_g", "stl_per_g", "blk_per_g",
            "fg_pct", "fg3_pct", "ft_pct", "ts_pct", "mp_per_g"]

CLASS_ORDER = ["FR", "SO", "JR", "SR", "GR"]
CLASS_MAP = {
    "Freshman": "FR", "Sophomore": "SO", "Junior": "JR",
    "Senior": "SR", "Graduate": "GR",
}


def map_class(raw: str) -> str:
    stripped = raw.strip()
    if stripped.startswith("RedShirt "):
        stripped = stripped[len("RedShirt "):]
    return CLASS_MAP.get(stripped, "")


def normalize_pos(pos: str) -> str:
    if pos in ("G",):
        return "G"
    if pos in ("G-F", "F-G", "F"):
        return "F"
    if pos in ("F-C", "C-F", "C"):
        return "C"
    return "G"


def float_or_zero(val: str) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def load_data():
    """Load and merge all CSV data. Returns list of season dicts."""
    # --- sr_data rows: keyed by (player_sr_link, season) ---
    data_rows: dict[tuple, dict] = {}
    player_names: dict[str, str] = {}  # link → most recent name
    player_schools: dict[str, tuple] = {}  # link → (max_year, school)
    player_pos: dict[str, tuple] = {}  # link → (max_year, pos)

    for year in YEARS:
        path = DATA_DIR / f"sr_data_{year}.csv"
        if not path.exists():
            print(f"  [warn] missing {path.name}")
            continue
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                link = row["player_sr_link"].strip()
                season = row["season"].strip()
                games = float_or_zero(row.get("games", "0"))
                key = (link, season)
                existing = data_rows.get(key)
                if existing is None or games > float_or_zero(existing["row"].get("games", "0")):
                    data_rows[key] = {"year": year, "row": row}
                elif games == float_or_zero(existing["row"].get("games", "0")):
                    data_rows[key] = {"year": year, "row": row}  # keep last (tied)

                # Track most-recent school and position
                cur_year, _ = player_schools.get(link, (0, ""))
                if year >= cur_year:
                    player_schools[link] = (year, row.get("school", "").strip())
                    player_pos[link] = (year, row.get("pos", "").strip())
                player_names[link] = row.get("player_name", link).strip()

    # --- sr_advanced rows: keyed by (player_sr_link, season) ---
    adv_rows: dict[tuple, dict] = {}
    for year in YEARS:
        path = DATA_DIR / f"sr_advanced_{year}.csv"
        if not path.exists():
            continue
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                link = row["player_sr_link"].strip()
                season = row["season"].strip()
                games = float_or_zero(row.get("games", "0"))
                key = (link, season)
                existing = adv_rows.get(key)
                if existing is None or games > float_or_zero(existing.get("games", "0")):
                    adv_rows[key] = row
                elif games == float_or_zero(existing.get("games", "0")):
                    adv_rows[key] = row

    # --- Class years: keyed by (player_sr_link, year) ---
    class_years: dict[tuple, str] = {}
    for year in YEARS:
        path = DATA_DIR / f"sr_class_years_{year}.csv"
        if not path.exists():
            continue
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                link = row["player_sr_link"].strip()
                cls = map_class(row.get("class", "").strip())
                class_years[(link, year)] = cls

    # --- Check join match rate ---
    data_keys = set(data_rows.keys())
    adv_keys = set(adv_rows.keys())
    matched = len(data_keys & adv_keys)
    match_rate = matched / len(data_keys) if data_keys else 1.0
    if match_rate < 0.5:
        print(f"[WARN] Advanced stats join match rate is {match_rate:.1%} — possible season string format mismatch")

    return data_rows, adv_rows, class_years, player_names, player_schools, player_pos


def build_player_sequences(data_rows, adv_rows, class_years, player_schools, player_pos):
    """
    Build per-player lists of season dicts.
    Applies games >= 8 filter, joins advanced, assigns class year,
    sorts by class year order, discards players with < 2 qualifying seasons.
    Returns dict: link → list of season dicts (sorted).
    """
    from collections import defaultdict
    by_player: dict[str, list] = defaultdict(list)

    for (link, season), entry in data_rows.items():
        year = entry["year"]
        row = entry["row"]
        games = float_or_zero(row.get("games", "0"))
        if games < 8:
            continue
        adv = adv_rows.get((link, season), {})
        cls = class_years.get((link, year), "")

        season_dict = {
            "year": year,
            "season": season,
            "cls": cls,
            "ppg": float_or_zero(row.get("pts_per_g", "")),
            "rpg": float_or_zero(row.get("trb_per_g", "")),
            "apg": float_or_zero(row.get("ast_per_g", "")),
            "spg": float_or_zero(row.get("stl_per_g", "")),
            "bpg": float_or_zero(row.get("blk_per_g", "")),
            "fg_pct": float_or_zero(row.get("fg_pct", "")),
            "fg3_pct": float_or_zero(row.get("fg3_pct", "")),
            "ft_pct": float_or_zero(row.get("ft_pct", "")),
            "ts_pct": float_or_zero(adv.get("ts_pct", "")),
            "mp_per_g": float_or_zero(row.get("mp_per_g", "")),
        }
        by_player[link].append(season_dict)

    result = {}
    for link, seasons in by_player.items():
        if len(seasons) < 2:
            continue
        # Sort: known class years first (by CLASS_ORDER), then unknown by calendar year
        known = [s for s in seasons if s["cls"] in CLASS_ORDER]
        unknown = [s for s in seasons if s["cls"] not in CLASS_ORDER]
        known.sort(key=lambda s: CLASS_ORDER.index(s["cls"]))
        unknown.sort(key=lambda s: s["year"])
        result[link] = known + unknown

    return result


def build_feature_matrix(player_sequences):
    """
    Returns flat list of (link, season_idx, vector) for StandardScaler fitting.
    """
    rows = []
    for link, seasons in player_sequences.items():
        for i, s in enumerate(seasons):
            vec = [s["ppg"], s["rpg"], s["apg"], s["spg"], s["bpg"],
                   s["fg_pct"], s["fg3_pct"], s["ft_pct"], s["ts_pct"], s["mp_per_g"]]
            rows.append((link, i, vec))
    return rows


def compute_similarities(player_sequences, player_names, player_schools, player_pos):
    """Main computation: groups by position, runs DTW, returns index dict."""

    # --- Fit StandardScaler on all player-seasons ---
    flat_rows = build_feature_matrix(player_sequences)
    all_vecs = np.array([r[2] for r in flat_rows], dtype=np.float64)
    scaler = StandardScaler()
    scaler.fit(all_vecs)

    # --- Apply scaler to each player's sequence ---
    scaled: dict[str, np.ndarray] = {}
    for link, seasons in player_sequences.items():
        vecs = np.array(
            [[s["ppg"], s["rpg"], s["apg"], s["spg"], s["bpg"],
              s["fg_pct"], s["fg3_pct"], s["ft_pct"], s["ts_pct"], s["mp_per_g"]]
             for s in seasons],
            dtype=np.float64
        )
        scaled[link] = scaler.transform(vecs)

    # --- Group by normalized position ---
    pos_groups: dict[str, list[str]] = {"G": [], "F": [], "C": []}
    for link in player_sequences:
        _, pos_str = player_pos.get(link, (0, ""))
        npos = normalize_pos(pos_str)
        pos_groups[npos].append(link)

    index: dict[str, list] = {}

    for pos, links in pos_groups.items():
        n = len(links)
        print(f"  Position {pos}: {n} players")
        if n < 2:
            continue

        # --- Compute scale (median pairwise DTW distance) ---
        sample_links = links
        if n > 3200:
            rng = random.Random(42)
            sample_links = rng.sample(links, 2000)

        print(f"    Computing scale from {len(sample_links)} players...")
        sample_seqs = [scaled[l] for l in sample_links]
        m = len(sample_seqs)
        distances = []
        for i in range(m):
            for j in range(i + 1, m):
                d = dtw_ndim.distance_fast(
                    sample_seqs[i].astype(np.double),
                    sample_seqs[j].astype(np.double)
                )
                distances.append(d)
        scale = float(np.median(distances)) if distances else 1.0
        if scale == 0:
            scale = 1.0
        print(f"    Scale = {scale:.4f}")

        # --- Compute top-10 matches for each player ---
        print(f"    Computing all-pairs DTW for {n} players...")
        for i, link_a in enumerate(links):
            if i % 100 == 0:
                print(f"      {i}/{n}")
            seq_a = scaled[link_a]
            scored = []
            for j, link_b in enumerate(links):
                if i == j:
                    continue
                seq_b = scaled[link_b]
                d = dtw_ndim.distance_fast(
                    seq_a.astype(np.double),
                    seq_b.astype(np.double)
                )
                score = 100.0 * math.exp(-d / scale)
                scored.append((score, link_b))

            scored.sort(key=lambda x: -x[0])
            top10 = scored[:10]

            matches = []
            for score, link_b in top10:
                seasons_b = player_sequences[link_b]
                year_start = min(s["year"] for s in seasons_b)
                year_end = max(s["year"] for s in seasons_b)
                _, school_b = player_schools.get(link_b, (0, ""))
                _, pos_b_raw = player_pos.get(link_b, (0, ""))
                pos_b = normalize_pos(pos_b_raw)
                match = {
                    "player_link": link_b,
                    "player_name": player_names.get(link_b, link_b),
                    "school": school_b,
                    "position": pos_b,
                    "year_start": year_start,
                    "year_end": year_end,
                    "seasons": [
                        {"class": s["cls"], "year": s["year"],
                         "ppg": round(s["ppg"], 1),
                         "rpg": round(s["rpg"], 1),
                         "apg": round(s["apg"], 1)}
                        for s in seasons_b
                    ],
                    "score": round(score, 1),
                }
                matches.append(match)
            index[link_a] = matches

    return index


def main():
    print("Loading data...")
    data_rows, adv_rows, class_years, player_names, player_schools, player_pos = load_data()

    print("Building player sequences...")
    player_sequences = build_player_sequences(
        data_rows, adv_rows, class_years, player_schools, player_pos
    )
    print(f"  {len(player_sequences)} players with >=2 qualifying seasons")

    print("Computing similarities...")
    index = compute_similarities(player_sequences, player_names, player_schools, player_pos)

    print(f"Writing {OUTPUT}...")
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(index, f, separators=(",", ":"))

    size_mb = OUTPUT.stat().st_size / 1_000_000
    print(f"Done. {len(index)} players indexed. File size: {size_mb:.1f}MB")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run a smoke test (dry run on 2 years only)**

Load the script via `importlib` (avoids the package-import limitation) and override `YEARS` before calling `main()`:

```bash
python3 -c "
import importlib.util
spec = importlib.util.spec_from_file_location('cs', 'scripts/compute_similarity.py')
cs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cs)
cs.YEARS = [2024, 2025]
cs.main()
"
```

Expected: script runs without error, `dashboard/public/data/similarity_index.json` is created, output shows player counts and scale values for each position group.

- [ ] **Step 3: Run the full script**

```bash
python3 scripts/compute_similarity.py
```

Expected: prints progress per position group, ends with `Done. NNNN players indexed. File size: XX.XMB`. Should be 10–25MB.

- [ ] **Step 4: Verify the output**

```bash
python3 -c "
import json
with open('dashboard/public/data/similarity_index.json') as f:
    idx = json.load(f)
print('Players:', len(idx))
# Print first entry
first_key = next(iter(idx))
print('Example key:', first_key)
print('Top match:', idx[first_key][0])
"
```

Expected: non-empty dict, first entry has `player_link`, `player_name`, `school`, `position`, `year_start`, `year_end`, `seasons`, `score` fields. `school` should be a slug like `"abilene-christian"`, not `"UCLA"`.

- [ ] **Step 5: Commit**

```bash
git add scripts/compute_similarity.py dashboard/public/data/similarity_index.json
git commit -m "feat: add career similarity offline script + generated index"
```

---

## Chunk 2: TypeScript types + SimilarityContext

### Task 3: TypeScript types

**Files:**
- Create: `dashboard/src/app/data/similarityTypes.ts`

- [ ] **Step 1: Create `similarityTypes.ts`**

```typescript
export interface SimilarSeason {
  class: string;   // "FR" | "SO" | "JR" | "SR" | "GR" | "" (empty = unknown, render as "?")
  year: number;    // calendar year
  ppg: number;
  rpg: number;
  apg: number;
}

export interface SimilarPlayer {
  player_link: string;
  player_name: string;
  school: string;       // raw SR URL slug, e.g. "california-los-angeles"
  position: string;     // "G" | "F" | "C"
  year_start: number;
  year_end: number;
  seasons: SimilarSeason[];
  score: number;        // 0–100 exponential similarity score
}

// Map from player_sr_link → top matches
export type SimilarityIndex = Record<string, SimilarPlayer[]>;
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd dashboard && npx tsc --noEmit
```

Expected: no errors (new file has no imports yet, so it will just be checked in isolation once imported).

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/app/data/similarityTypes.ts
git commit -m "feat: add SimilarityIndex TypeScript types"
```

---

### Task 4: SimilarityContext

**Files:**
- Create: `dashboard/src/app/data/SimilarityContext.tsx`

**Pattern to follow:** Match the style of `dashboard/src/app/data/YearDataContext.tsx`. The context pattern there is:
1. `createContext` with a typed value
2. A provider component that owns fetch state
3. A hook that reads the context

- [ ] **Step 1: Create `SimilarityContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import type { SimilarityIndex } from './similarityTypes';

interface SimilarityContextValue {
  index: SimilarityIndex | null;
  isLoading: boolean;
  error: Error | null;
}

const SimilarityContext = createContext<SimilarityContextValue>({
  index: null,
  isLoading: true,
  error: null,
});

export function useSimilarity(): SimilarityContextValue {
  return useContext(SimilarityContext);
}

export function SimilarityProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState<SimilarityIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch('/data/similarity_index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        setIndex(JSON.parse(text));
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <SimilarityContext.Provider value={{ index, isLoading, error }}>
      {children}
    </SimilarityContext.Provider>
  );
}
```

- [ ] **Step 2: Wrap `AppInner` with `SimilarityProvider` in `App.tsx`**

In `dashboard/src/app/App.tsx`, add the import and wrap:

```typescript
// Add import at top (with other data imports):
import { SimilarityProvider } from './data/SimilarityContext';

// Change the App() return from:
export default function App() {
  return (
    <YearDataProvider>
      <AppInner />
    </YearDataProvider>
  );
}

// To:
export default function App() {
  return (
    <YearDataProvider>
      <SimilarityProvider>
        <AppInner />
      </SimilarityProvider>
    </YearDataProvider>
  );
}
```

- [ ] **Step 3: Verify type-check**

```bash
cd dashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/app/data/SimilarityContext.tsx dashboard/src/app/App.tsx
git commit -m "feat: add SimilarityProvider context + wrap App"
```

---

## Chunk 3: SimilarPlayersSection component + CareerModal integration

### Task 5: SimilarPlayersSection component

**Files:**
- Create: `dashboard/src/app/components/SimilarPlayersSection.tsx`

**UI spec summary:**
- Section header: "Similar Career Trajectories" + subtitle
- Top 5 cards by default; "Show 5 more" button expands to all 10; button disappears after expanding
- Each card: flex row — left (name/school/years), center (PPG sparkline 120×40px), right (score badge)
- Below name: 3 stat pills from final season: `"PPG 15.3"`, `"RPG 3.2"`, `"APG 5.0"`
- PPG sparkline: Recharts `LineChart`, `dot={false}`, `stroke="var(--color-primary)"`, no axes/tooltip
- Score badge colors: ≥80 emerald, 60–79 amber, <60 muted
- Empty states: loading skeleton, error message, "not found" message
- Class label `""` → display as `"?"`

**Loading spinner style:** Match the spinner in `CareerModal.tsx`:
```tsx
<div className="flex items-center justify-center py-16 text-muted-foreground">
  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
  Loading similarity data...
</div>
```

- [ ] **Step 1: Create `SimilarPlayersSection.tsx`**

```typescript
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
        <p className="font-semibold text-foreground text-sm truncate">{match.player_name}</p>
        <p className="text-xs text-muted-foreground truncate">{match.school} · {match.year_start}–{match.year_end}</p>
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
```

- [ ] **Step 2: Verify type-check**

```bash
cd dashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/app/components/SimilarPlayersSection.tsx
git commit -m "feat: add SimilarPlayersSection component"
```

---

### Task 6: Wire SimilarPlayersSection into CareerModal

**Files:**
- Modify: `dashboard/src/app/components/CareerModal.tsx`

The section goes at the very bottom of the modal body, inside the `<div className="p-6">` block, after the closing `</>` of the `{careerSeasons.length > 0 && (...)}` block. It should appear whether or not career seasons loaded — the `SimilarPlayersSection` has its own loading/empty states.

- [ ] **Step 1: Add import and render `SimilarPlayersSection` in `CareerModal.tsx`**

Add import at top of `CareerModal.tsx`:
```typescript
import { SimilarPlayersSection } from './SimilarPlayersSection';
```

Add the section at the end of the `<div className="p-6">` block, after the `{careerSeasons.length > 0 && (...)}` block:

```tsx
          {/* Similar career trajectories */}
          {player.playerLink && (
            <SimilarPlayersSection playerLink={player.playerLink} />
          )}
```

The full `<div className="p-6">` block should end with:
```tsx
        <div className="p-6">
          {/* ... existing content ... */}

          {/* Similar career trajectories */}
          {player.playerLink && (
            <SimilarPlayersSection playerLink={player.playerLink} />
          )}
        </div>
```

- [ ] **Step 2: Type-check and build**

```bash
cd dashboard && npx tsc --noEmit && npm run build
```

Expected: no type errors, build succeeds.

- [ ] **Step 3: Manual smoke test**

```bash
cd dashboard && npm run dev
```

Open the app in a browser. Click "Career" on any player who has career data. Scroll to the bottom of the career modal. You should see "Similar Career Trajectories" with match cards or an appropriate empty state.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/app/components/CareerModal.tsx
git commit -m "feat: integrate SimilarPlayersSection into CareerModal"
```

---
