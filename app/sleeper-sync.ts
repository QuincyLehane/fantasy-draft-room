import type { Player } from "./players";

export const SLEEPER_LEAGUE_ID = "1401630873605951488";
export const SLEEPER_DRAFT_ID = "1401630874285379584";
export const SLEEPER_DRAFT_SLOT = 2;
export const SLEEPER_PICKS_URL = `https://api.sleeper.app/v1/draft/${SLEEPER_DRAFT_ID}/picks`;

export type SyncedDraftPick = {
  playerId: string;
  mine: boolean;
  at: number;
};

type SleeperPick = {
  player_id?: string;
  pick_no?: number;
  draft_slot?: number;
  metadata?: {
    first_name?: string;
    last_name?: string;
    player_name?: string;
    player_id?: string;
    position?: string;
    team?: string;
  };
};

export function normalizeSleeperName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function mapSleeperPicks(input: unknown, players: Player[], draftSlot = SLEEPER_DRAFT_SLOT) {
  if (!Array.isArray(input)) return { picks: [] as SyncedDraftPick[], unmatched: 0 };

  const byName = new Map(players.map((player) => [normalizeSleeperName(player.name), player.id]));
  const defenses = new Map(players.filter((player) => player.pos === "DST").map((player) => [player.team, player.id]));
  let unmatched = 0;

  const picks = (input as SleeperPick[])
    .filter((pick) => Number.isFinite(Number(pick.pick_no)) && Number(pick.pick_no) > 0)
    .sort((a, b) => Number(a.pick_no) - Number(b.pick_no))
    .map((pick) => {
      const metadata = pick.metadata ?? {};
      const displayName = metadata.player_name || [metadata.first_name, metadata.last_name].filter(Boolean).join(" ");
      const sleeperPlayerId = pick.player_id || metadata.player_id || `pick-${pick.pick_no}`;
      const isDefense = metadata.position === "DEF" || metadata.position === "DST";
      const matchedId = (displayName ? byName.get(normalizeSleeperName(displayName)) : undefined)
        ?? (isDefense && metadata.team ? defenses.get(metadata.team === "JAX" ? "JAC" : metadata.team) : undefined);

      if (!matchedId) unmatched += 1;
      return {
        playerId: matchedId ?? `sleeper:${sleeperPlayerId}:${pick.pick_no}`,
        mine: Number(pick.draft_slot) === draftSlot,
        at: Number(pick.pick_no),
      };
    });

  return { picks, unmatched };
}
