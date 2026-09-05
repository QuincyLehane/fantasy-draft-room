import type { ScoringMode } from "./players";

export type LeagueConfig = {
  draftSlot: number;
  rounds: number;
  rosterSize: number;
  flexSlots: number;
  benchSlots: number;
};

export const LEAGUE_CONFIGS: Record<ScoringMode, LeagueConfig> = {
  half: { draftSlot: 10, rounds: 16, rosterSize: 16, flexSlots: 1, benchSlots: 7 },
  ppr: { draftSlot: 2, rounds: 15, rosterSize: 15, flexSlots: 2, benchSlots: 5 },
};
