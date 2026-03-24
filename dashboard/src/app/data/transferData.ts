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
// CRITICAL: preserve these exact column name strings — they match the CSV headers
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

function buildPlayers(
  rows: Record<string, string>[],
  advancedMap: Map<string, { tsPercentage: number; obpm: number; dbpm: number }>,
  on3Map: Map<string, On3TransferRecord>,
  classYearMap: Map<string, string>,
  year: number
): TransferPlayer[] {
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

async function fetchTextOptional(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

export async function fetchYearData(year: number): Promise<TransferPlayer[]> {
  let on3Map = new Map<string, On3TransferRecord>();

  if (year === 2025) {
    // Fetch all 4 CSVs in parallel for 2025
    const [basicRaw, advancedRaw, on3Raw, classYearRaw] = await Promise.all([
      fetchText(`/data/sr_data_${year}.csv`),
      fetchText(`/data/sr_advanced_${year}.csv`),
      fetchText('/data/on3_wbb_transfers_2025.csv'),
      fetchTextOptional(`/data/sr_class_years_${year}.csv`),
    ]);
    on3Map = parseOn3Transfers(on3Raw);
    const classYearMap = classYearRaw ? parseClassYears(classYearRaw) : new Map<string, string>();
    const advancedMap = parseAdvancedStats(advancedRaw);
    const rows = parseCSV(basicRaw);
    return buildPlayers(rows, advancedMap, on3Map, classYearMap, year);
  } else {
    // Non-2025: basic + advanced + class years (if scraped)
    const [basicRaw, advancedRaw, classYearRaw] = await Promise.all([
      fetchText(`/data/sr_data_${year}.csv`),
      fetchText(`/data/sr_advanced_${year}.csv`),
      fetchTextOptional(`/data/sr_class_years_${year}.csv`),
    ]);
    const classYearMap = classYearRaw ? parseClassYears(classYearRaw) : new Map<string, string>();
    const advancedMap = parseAdvancedStats(advancedRaw);
    const rows = parseCSV(basicRaw);
    return buildPlayers(rows, advancedMap, on3Map, classYearMap, year);
  }
}
