import type { ScoringMode } from "./players";

export type LeagueConfig = {
  rounds: number;
  rosterSize: number;
  flexSlots: number;
  benchSlots: number;
};

export const LEAGUE_CONFIGS: Record<ScoringMode, LeagueConfig> = {
  half: { rounds: 16, rosterSize: 16, flexSlots: 1, benchSlots: 7 },
  ppr: { rounds: 15, rosterSize: 15, flexSlots: 2, benchSlots: 5 },
};
