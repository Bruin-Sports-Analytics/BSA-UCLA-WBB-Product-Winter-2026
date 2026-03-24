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
