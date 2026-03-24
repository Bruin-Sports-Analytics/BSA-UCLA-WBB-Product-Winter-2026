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
import heapq
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed

import numpy as np
from sklearn.preprocessing import StandardScaler


def dtw_distance(s1: np.ndarray, s2: np.ndarray) -> float:
    """DTW distance for multidimensional sequences using per-step Euclidean cost.

    Equivalent to dtaidistance.dtw_ndim.distance_fast semantics:
      cost[i,j] = L2(s1[i], s2[j]) + min(neighbors)

    Note: dtaidistance is listed in requirements.txt but its C extension is not
    compiled on this system, so we implement the same algorithm in pure numpy.
    """
    n, m = len(s1), len(s2)
    # Pairwise Euclidean distances (per-step cost, not squared)
    diff = s1[:, np.newaxis, :] - s2[np.newaxis, :, :]  # (n, m, d)
    dist = np.sqrt(np.sum(diff * diff, axis=2))  # (n, m) — L2 per step
    cost = np.full((n + 1, m + 1), np.inf)
    cost[0, 0] = 0.0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost[i, j] = dist[i - 1, j - 1] + min(cost[i - 1, j], cost[i, j - 1], cost[i - 1, j - 1])
    return cost[n, m]


def _compute_batch(args):
    """Worker: compute top-10 for a batch of players."""
    batch_indices, all_seqs_list, all_links, scale = args
    results = {}
    for idx_a in batch_indices:
        seq_a = all_seqs_list[idx_a]
        scored = []
        for idx_b in range(len(all_seqs_list)):
            if idx_a == idx_b:
                continue
            d = dtw_distance(seq_a, all_seqs_list[idx_b])
            score = 100.0 * math.exp(-d / scale)
            if len(scored) < 10:
                heapq.heappush(scored, (score, idx_b))
            elif score > scored[0][0]:
                heapq.heapreplace(scored, (score, idx_b))
        top10 = sorted(scored, key=lambda x: -x[0])
        results[idx_a] = [(s, all_links[i]) for s, i in top10]
    return results

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
        rng = random.Random(42)
        sample_links = links if n <= 3200 else rng.sample(links, 2000)

        print(f"    Computing scale from {len(sample_links)} players...")
        sample_seqs = [scaled[l] for l in sample_links]
        m = len(sample_seqs)
        distances = []
        for i in range(m):
            for j in range(i + 1, m):
                d = dtw_distance(sample_seqs[i], sample_seqs[j])
                distances.append(d)
        scale = float(np.median(distances)) if distances else 1.0
        if scale == 0:
            scale = 1.0
        print(f"    Scale = {scale:.4f}")

        # --- Compute top-10 matches for each player using multiprocessing ---
        print(f"    Computing all-pairs DTW for {n} players (parallel)...")
        all_seqs_list = [scaled[l] for l in links]

        # Split into batches for multiprocessing
        num_workers = min(8, n)
        batch_size = max(1, n // num_workers)
        batches = []
        for start in range(0, n, batch_size):
            end = min(start + batch_size, n)
            batches.append(list(range(start, end)))

        all_top10: dict[int, list] = {}
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            futures = {
                executor.submit(_compute_batch, (batch, all_seqs_list, links, scale)): batch
                for batch in batches
            }
            done_count = 0
            for future in as_completed(futures):
                batch_results = future.result()
                all_top10.update(batch_results)
                done_count += len(batch_results)
                print(f"      {done_count}/{n} players done")

        for i, link_a in enumerate(links):
            top10 = all_top10.get(i, [])
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
