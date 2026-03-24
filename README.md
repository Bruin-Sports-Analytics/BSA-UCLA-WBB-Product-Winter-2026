# WBB Transfer Dashboard

React/Vite dashboard for WBB transfer portal. Runs with mock data by default.

## Run

```bash
cd dashboard
npm install
npm run dev
```

Open http://localhost:5173

## Data

- **Super tables** (this repo): `../data/player_tables/batch2_supers/super_pergame.csv`, `super_totals.csv`
- **Created by**: `../player-tables-scraper.ipynb`

The UI currently uses mock data; you can later wire it to load from the super CSVs or an API.
