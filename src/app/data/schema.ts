/**
 * Types for dashboard transfer-portal view.
 * Can be mapped from super_pergame / super_totals when loaded.
 */

export interface GoldPlayerPerGame {
  player_key?: number;
  team_season_key?: number;
  player_sr_link?: string;
  player_name?: string;
  class?: string;
  pos?: string;
  games?: number;
  games_started?: number;
  mp_per_g?: number;
  fg_per_g?: number;
  fga_per_g?: number;
  fg_pct?: number;
  fg3_per_g?: number;
  fg3a_per_g?: number;
  fg3_pct?: number;
  fg2_per_g?: number;
  fg2a_per_g?: number;
  fg2_pct?: number;
  efg_pct?: number;
  ft_per_g?: number;
  fta_per_g?: number;
  ft_pct?: number;
  orb_per_g?: number;
  drb_per_g?: number;
  trb_per_g?: number;
  ast_per_g?: number;
  stl_per_g?: number;
  blk_per_g?: number;
  tov_per_g?: number;
  pf_per_g?: number;
  pts_per_g?: number;
  team_name_abbr?: string;
  year_id?: string;
}

export type Position = 'G' | 'F' | 'C';
export type Year = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate';
export type Availability = 'Available' | 'Committed' | 'Considering';
export type TransferStatus = 'Committed' | 'Entered';

export interface On3TransferInfo {
  classYear: Year;
  previousTeam: string;
  newTeam: string | null;
  status: TransferStatus;
}

export interface TransferPlayer {
  id: string;
  name: string;
  position: Position;
  previousSchool: string;
  conference: string;
  year: Year | null;
  height: string;
  stats: {
    ppg: number;
    rpg: number;
    apg: number;
    spg: number;
    bpg: number;
    fgPercentage: number;
    threePointPercentage: number;
    ftPercentage: number;
    minutesPerGame: number;
    gamesPlayed: number;
    tsPercentage: number;
    obpm: number;
    dbpm: number;
  };
  availability: Availability;
  playerLink?: string;
  transferInfo?: On3TransferInfo;
}

export function goldToTransferPlayer(
  row: GoldPlayerPerGame,
  index: number,
  overrides?: Partial<Pick<TransferPlayer, 'name' | 'previousSchool' | 'year' | 'height' | 'availability'>>
): TransferPlayer {
  const rawPos = (row.pos ?? '').toUpperCase();
  const position: Position =
    rawPos === 'C' || rawPos === 'F-C' || rawPos === 'C-F' ? 'C' :
    rawPos === 'F' || rawPos === 'G-F' || rawPos === 'F-G' ? 'F' : 'G';
  return {
    id: `gold-${row.player_key ?? index}-${index}`,
    name: overrides?.name ?? `Player ${row.player_key ?? index}`,
    position,
    previousSchool: overrides?.previousSchool ?? row.team_name_abbr ?? 'Unknown',
    conference: '',
    year: overrides && 'year' in overrides ? overrides.year ?? null : null,
    height: overrides?.height ?? '—',
    stats: {
      ppg: row.pts_per_g ?? 0,
      rpg: row.trb_per_g ?? 0,
      apg: row.ast_per_g ?? 0,
      spg: row.stl_per_g ?? 0,
      bpg: row.blk_per_g ?? 0,
      fgPercentage: (row.fg_pct ?? 0) * 100,
      threePointPercentage: (row.fg3_pct ?? 0) * 100,
      ftPercentage: (row.ft_pct ?? 0) * 100,
      minutesPerGame: row.mp_per_g ?? 0,
      gamesPlayed: row.games ?? 0,
      tsPercentage: 0,
      obpm: 0,
      dbpm: 0,
    },
    availability: overrides?.availability ?? 'Available',
    playerLink: row.player_sr_link,
  };
}

export function mapClassRank(raw: string): Year {
  const normalized = raw.replace(/^RedShirt\s+/i, '').trim();
  switch (normalized.toLowerCase()) {
    case 'freshman': return 'Freshman';
    case 'sophomore': return 'Sophomore';
    case 'junior': return 'Junior';
    case 'senior': return 'Senior';
    case 'graduate': return 'Graduate';
    default: return 'Junior';
  }
}
