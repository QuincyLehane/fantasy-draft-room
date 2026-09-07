import assert from "node:assert/strict";
import test from "node:test";

import { mapSleeperPicks, normalizeSleeperName, SLEEPER_DRAFT_ID } from "../app/sleeper-sync.ts";

const players = [
  { id: "p-1", name: "James Cook III", team: "BUF", pos: "RB", bye: 7, rank: 9, tier: 1 },
  { id: "p-2", name: "Ja'Marr Chase", team: "CIN", pos: "WR", bye: 6, rank: 1, tier: 1 },
  { id: "dst-1", name: "Houston Texans", team: "HOU", pos: "DST", bye: 8, rank: 154, tier: 9 },
];

test("targets the active Sleeper draft", () => {
  assert.equal(SLEEPER_DRAFT_ID, "1401630874285379584");
});

test("normalizes punctuation and suffixes for Sleeper names", () => {
  assert.equal(normalizeSleeperName("James Cook III"), normalizeSleeperName("James Cook"));
  assert.equal(normalizeSleeperName("Ja'Marr Chase"), normalizeSleeperName("Ja Marr Chase"));
});

test("maps Sleeper picks in order and identifies slot two", () => {
  const result = mapSleeperPicks([
    { pick_no: 2, draft_slot: 2, player_id: "2", metadata: { first_name: "James", last_name: "Cook", position: "RB", team: "BUF" } },
    { pick_no: 1, draft_slot: 1, player_id: "1", metadata: { first_name: "Ja'Marr", last_name: "Chase", position: "WR", team: "CIN" } },
    { pick_no: 3, draft_slot: 3, player_id: "HOU", metadata: { position: "DEF", team: "HOU" } },
  ], players);

  assert.deepEqual(result.picks, [
    { playerId: "p-2", mine: false, at: 1 },
    { playerId: "p-1", mine: true, at: 2 },
    { playerId: "dst-1", mine: false, at: 3 },
  ]);
  assert.equal(result.unmatched, 0);
});

test("preserves unmatched picks so the live clock stays accurate", () => {
  const result = mapSleeperPicks([{ pick_no: 1, draft_slot: 1, player_id: "unknown", metadata: { first_name: "Unknown", last_name: "Player" } }], players);
  assert.equal(result.picks.length, 1);
  assert.match(result.picks[0].playerId, /^sleeper:unknown:1$/);
  assert.equal(result.unmatched, 1);
});
