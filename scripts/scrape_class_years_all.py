"""
Scrape class year from Sports Reference team roster pages for every season.

For each year in YEARS:
  - Reads schools + player links from dashboard/public/data/sr_data_{year}.csv
  - Fetches each team's roster page at:
      https://www.sports-reference.com/cbb/schools/{school}/women/{year}.html
  - Outputs dashboard/public/data/sr_class_years_{year}.csv

Usage:
    python scripts/scrape_class_years_all.py              # all years (2017-2026)
    python scripts/scrape_class_years_all.py 2022         # single year
    python scripts/scrape_class_years_all.py 2020 2021 2022  # specific years
"""

import csv
import re
import sys
import time
import requests
from pathlib import Path
from bs4 import BeautifulSoup

YEARS = list(range(2017, 2027))
DATA_DIR = Path("dashboard/public/data")
DELAY = 4       # seconds between school requests (polite rate limit)
RETRY_WAIT = 60 # seconds to wait on 429


CLASS_MAP = {
    "FR": "Freshman",
    "SO": "Sophomore",
    "JR": "Junior",
    "SR": "Senior",
    "GR": "Graduate",
}


def map_class(raw: str) -> str:
    return CLASS_MAP.get(raw.strip().upper(), raw.strip())


def get_unique_schools(csv_path: Path) -> list[str]:
    schools = set()
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            school = row.get("school", "").strip()
            if school:
                schools.add(school)
    return sorted(schools)


def scrape_roster(school: str, year: int) -> dict[str, str]:
    """Fetch team roster page and return {full_player_link: class_str}."""
    url = f"https://www.sports-reference.com/cbb/schools/{school}/women/{year}.html"
    for attempt in range(2):
        try:
            resp = requests.get(url, timeout=15, headers={"User-Agent": "BSA-Basketball-Research/1.0"})
        except Exception as e:
            print(f"  Error fetching {school} ({year}): {e}")
            return {}

        if resp.status_code == 429:
            print(f"  Rate limited on {school} ({year}). Waiting {RETRY_WAIT}s...")
            time.sleep(RETRY_WAIT)
            continue
        if resp.status_code == 404:
            # School may not have had a team that year
            return {}
        if resp.status_code != 200:
            print(f"  HTTP {resp.status_code} for {school} ({year})")
            return {}
        break
    else:
        return {}

    html = resp.text

    # SR sometimes wraps tables in HTML comments
    if 'id="roster"' not in html:
        for comment in re.findall(r"<!--(.*?)-->", html, re.DOTALL):
            if 'id="roster"' in comment:
                html = comment
                break

    soup = BeautifulSoup(html, "html.parser")
    roster_table = soup.find("table", id="roster")
    if not roster_table:
        print(f"  No roster table for {school} ({year})")
        return {}

    results: dict[str, str] = {}
    for row in roster_table.select("tbody tr"):
        if "thead" in row.get("class", []):
            continue

        player_cell = row.find("th", {"data-stat": "player"}) or row.find("td", {"data-stat": "player"})
        if not player_cell:
            continue
        a_tag = player_cell.find("a")
        if not a_tag or not a_tag.get("href"):
            continue
        full_link = f"https://www.sports-reference.com{a_tag['href']}"

        class_cell = row.find("td", {"data-stat": "class"})
        if not class_cell:
            continue
        class_val = class_cell.get_text(strip=True)
        if class_val:
            results[full_link] = class_val

    return results


def scrape_year(year: int) -> None:
    input_csv = DATA_DIR / f"sr_data_{year}.csv"
    output_csv = DATA_DIR / f"sr_class_years_{year}.csv"

    if not input_csv.exists():
        print(f"[{year}] Input file not found: {input_csv}. Skipping.")
        return

    if output_csv.exists():
        print(f"[{year}] Output already exists: {output_csv}. Skipping (delete to re-scrape).")
        return

    schools = get_unique_schools(input_csv)
    print(f"\n[{year}] Scraping {len(schools)} schools...")

    all_classes: dict[str, str] = {}
    for i, school in enumerate(schools, 1):
        print(f"  [{i}/{len(schools)}] {school}", end="", flush=True)
        roster = scrape_roster(school, year)
        for link, cls in roster.items():
            all_classes[link] = map_class(cls)
        print(f" → {len(roster)} players")
        time.sleep(DELAY)

    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["player_sr_link", "class"])
        for link in sorted(all_classes.keys()):
            writer.writerow([link, all_classes[link]])

    print(f"[{year}] Done — wrote {len(all_classes)} entries to {output_csv}")


def main():
    if len(sys.argv) > 1:
        try:
            years = [int(y) for y in sys.argv[1:]]
        except ValueError:
            print("Usage: python scrape_class_years_all.py [year1 year2 ...]")
            sys.exit(1)
    else:
        years = YEARS

    print(f"Scraping class years for: {years}")
    for year in years:
        scrape_year(year)

    print("\nAll done.")


if __name__ == "__main__":
    main()
