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
