import type { ScoringMode } from "./players";

export type LeagueConfig = {
  teamCount: number;
  draftSlot: number;
  rounds: number;
  rosterSize: number;
  flexSlots: number;
  benchSlots: number;
};

export const LEAGUE_CONFIGS: Record<ScoringMode, LeagueConfig> = {
  half: { teamCount: 10, draftSlot: 10, rounds: 16, rosterSize: 16, flexSlots: 1, benchSlots: 7 },
  ppr: { teamCount: 12, draftSlot: 2, rounds: 15, rosterSize: 15, flexSlots: 2, benchSlots: 5 },
};
